"""Stats store for gamification — XP, levels, daily goals, streaks."""
from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path


LEVEL_TABLE = [
    (1, 0, "打字新手"),
    (2, 500, "打字学徒"),
    (3, 1500, "打字熟手"),
    (4, 3000, "打字达人"),
    (5, 5000, "打字高手"),
    (6, 8000, "打字大师"),
    (7, 12000, "键盘侠"),
    (8, 18000, "指尖飞舞"),
    (9, 25000, "打字宗师"),
    (10, 35000, "传说"),
]

DAILY_GOAL_PRESETS = {
    "easy": 80,
    "normal": 150,
    "challenge": 300,
}

MAX_REPAIR_ITEMS = 3


class StatsStore:
    """Persists gamification stats to a single JSON file."""

    def __init__(self, path: Path) -> None:
        self._path = Path(path)
        self._data: dict = {
            "totalXp": 0,
            "streak": {
                "current": 0,
                "lastCompletedDate": None,
                "longest": 0,
                "repairItems": 0,
            },
            "dailyGoals": {},
            "xpHistory": {},
        }
        if self._path.exists():
            self._data = json.loads(self._path.read_text(encoding="utf-8"))

    def _flush(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(
            json.dumps(self._data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def _compute_level(self, xp: int) -> tuple[int, str, int | None]:
        level, title, next_xp = 1, "打字新手", 500
        for i, (lv, threshold, t) in enumerate(LEVEL_TABLE):
            if xp >= threshold:
                level, title = lv, t
                if i + 1 < len(LEVEL_TABLE):
                    next_xp = LEVEL_TABLE[i + 1][1]
                else:
                    next_xp = None
        return level, title, next_xp

    def _check_daily_completed(self, date_str: str) -> bool:
        goal = self._data["dailyGoals"].get(date_str)
        if not goal:
            return False
        return goal["earned"] >= goal["target"]

    def _recalc_streak(self, today: str) -> None:
        """Recalculate streak from daily goal history."""
        # Collect all completed dates
        completed = sorted(
            d for d, g in self._data["dailyGoals"].items()
            if g["earned"] >= g["target"]
        )
        if not completed:
            self._data["streak"]["current"] = 0
            return

        # Count consecutive days ending at today (or yesterday)
        streak = 0
        check_from = today
        # Walk backwards from today
        current_date = datetime.strptime(check_from, "%Y-%m-%d").date()
        while True:
            ds = current_date.strftime("%Y-%m-%d")
            if ds in completed:
                streak += 1
                current_date -= timedelta(days=1)
            else:
                break

        self._data["streak"]["current"] = streak
        if streak > self._data["streak"]["longest"]:
            self._data["streak"]["longest"] = streak

        # Award repair items: every 7 consecutive days → +1 repair item
        # Calculate how many milestones the longest streak has reached
        # and award items that haven't been awarded yet.
        earned_milestones = self._data["streak"].get("earnedMilestones", 0)
        new_milestones = self._data["streak"]["longest"] // 7
        if new_milestones > earned_milestones:
            newly_earned = new_milestones - earned_milestones
            self._data["streak"]["repairItems"] = min(
                self._data["streak"]["repairItems"] + newly_earned,
                MAX_REPAIR_ITEMS,
            )
            self._data["streak"]["earnedMilestones"] = new_milestones

    def get_stats(self, date: str | None = None) -> dict:
        today = date or datetime.now().strftime("%Y-%m-%d")
        level, title, next_xp = self._compute_level(self._data["totalXp"])
        goal = self._data["dailyGoals"].get(today)
        today_earned = self._data["xpHistory"].get(today, 0)

        return {
            "totalXp": self._data["totalXp"],
            "level": level,
            "title": title,
            "nextLevelXp": next_xp,
            "streak": self._data["streak"],
            "todayTarget": goal["target"] if goal else None,
            "todayEarned": today_earned if goal else 0,
            "todayCompleted": self._check_daily_completed(today),
        }

    def add_xp(self, amount: int, date: str | None = None) -> None:
        today = date or datetime.now().strftime("%Y-%m-%d")

        self._data["totalXp"] += amount
        self._data["xpHistory"][today] = self._data["xpHistory"].get(today, 0) + amount

        # Update daily goal earned
        if today in self._data["dailyGoals"]:
            self._data["dailyGoals"][today]["earned"] += amount

        self._recalc_streak(today)
        self._flush()

    def set_daily_goal(self, difficulty: str, date: str | None = None) -> None:
        today = date or datetime.now().strftime("%Y-%m-%d")
        target = DAILY_GOAL_PRESETS[difficulty]
        # Preserve earned if already has some XP today
        earned = self._data["xpHistory"].get(today, 0)
        self._data["dailyGoals"][today] = {
            "target": target,
            "earned": earned,
            "difficulty": difficulty,
        }
        self._recalc_streak(today)
        self._flush()

    def use_repair(self, date_str: str) -> bool:
        if self._data["streak"]["repairItems"] <= 0:
            return False

        self._data["streak"]["repairItems"] -= 1

        # Mark the date as completed by setting a goal if none exists
        if date_str not in self._data["dailyGoals"]:
            self._data["dailyGoals"][date_str] = {
                "target": 0,
                "earned": 0,
                "difficulty": "repair",
            }
        # Ensure earned >= target
        self._data["dailyGoals"][date_str]["earned"] = self._data["dailyGoals"][date_str]["target"]

        self._flush()
        return True
