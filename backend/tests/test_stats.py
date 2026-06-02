"""Stats Store tests."""
import pytest

from app.stats import StatsStore


@pytest.fixture()
def store(tmp_path):
    """Fresh StatsStore for each test."""
    return StatsStore(tmp_path / "stats.json")


class TestXPAndLevel:
    def test_initial_stats_has_zero_xp_and_level_1(self, store):
        stats = store.get_stats()
        assert stats["totalXp"] == 0
        assert stats["level"] == 1
        assert stats["title"] == "打字新手"

    def test_add_xp_accumulates_total(self, store):
        store.add_xp(100, date="2026-06-01")
        assert store.get_stats()["totalXp"] == 100
        store.add_xp(50, date="2026-06-01")
        assert store.get_stats()["totalXp"] == 150

    def test_level_up_at_threshold(self, store):
        store.add_xp(499, date="2026-06-01")
        assert store.get_stats()["level"] == 1
        store.add_xp(1, date="2026-06-01")
        assert store.get_stats()["level"] == 2
        assert store.get_stats()["title"] == "打字学徒"

    def test_next_level_xp_shows_threshold(self, store):
        stats = store.get_stats()
        assert stats["nextLevelXp"] == 500
        store.add_xp(500, date="2026-06-01")
        assert store.get_stats()["nextLevelXp"] == 1500

    def test_max_level_cap(self, store):
        store.add_xp(99999, date="2026-06-01")
        assert store.get_stats()["level"] == 10
        assert store.get_stats()["title"] == "传说"
        assert store.get_stats()["nextLevelXp"] is None


class TestDailyGoal:
    def test_set_daily_goal_stores_target(self, store):
        store.set_daily_goal("normal", date="2026-06-01")
        stats = store.get_stats(date="2026-06-01")
        assert stats["todayTarget"] == 150
        assert stats["todayEarned"] == 0

    def test_easy_goal_is_80_xp(self, store):
        store.set_daily_goal("easy", date="2026-06-01")
        assert store.get_stats(date="2026-06-01")["todayTarget"] == 80

    def test_challenge_goal_is_300_xp(self, store):
        store.set_daily_goal("challenge", date="2026-06-01")
        assert store.get_stats(date="2026-06-01")["todayTarget"] == 300

    def test_earning_xp_updates_today_earned(self, store):
        store.set_daily_goal("normal", date="2026-06-01")
        store.add_xp(100, date="2026-06-01")
        assert store.get_stats(date="2026-06-01")["todayEarned"] == 100

    def test_daily_goal_completed_when_earned_meets_target(self, store):
        store.set_daily_goal("easy", date="2026-06-01")
        store.add_xp(80, date="2026-06-01")
        assert store.get_stats(date="2026-06-01")["todayCompleted"] is True

    def test_daily_goal_not_completed_when_short(self, store):
        store.set_daily_goal("normal", date="2026-06-01")
        store.add_xp(100, date="2026-06-01")
        assert store.get_stats(date="2026-06-01")["todayCompleted"] is False

    def test_no_goal_set_means_not_completed(self, store):
        store.add_xp(500, date="2026-06-01")
        assert store.get_stats(date="2026-06-01")["todayCompleted"] is False


class TestStreak:
    def test_initial_streak_is_zero(self, store):
        assert store.get_stats()["streak"]["current"] == 0

    def test_one_completed_day_gives_streak_1(self, store):
        store.set_daily_goal("easy", date="2026-06-01")
        store.add_xp(80, date="2026-06-01")
        assert store.get_stats(date="2026-06-01")["streak"]["current"] == 1

    def test_consecutive_days_increase_streak(self, store):
        store.set_daily_goal("easy", date="2026-06-01")
        store.add_xp(80, date="2026-06-01")
        store.set_daily_goal("easy", date="2026-06-02")
        store.add_xp(80, date="2026-06-02")
        assert store.get_stats(date="2026-06-02")["streak"]["current"] == 2

    def test_gap_resets_streak(self, store):
        store.set_daily_goal("easy", date="2026-06-01")
        store.add_xp(80, date="2026-06-01")
        # 2026-06-02 skipped
        store.set_daily_goal("easy", date="2026-06-03")
        store.add_xp(80, date="2026-06-03")
        assert store.get_stats(date="2026-06-03")["streak"]["current"] == 1

    def test_longest_streak_is_tracked(self, store):
        for d in range(1, 4):
            d_str = f"2026-06-0{d}"
            store.set_daily_goal("easy", date=d_str)
            store.add_xp(80, date=d_str)
        assert store.get_stats(date="2026-06-03")["streak"]["longest"] == 3

    def test_7_consecutive_days_awards_repair_item(self, store):
        for d in range(1, 8):
            d_str = f"2026-06-0{d}" if d < 10 else f"2026-06-{d}"
            store.set_daily_goal("easy", date=d_str)
            store.add_xp(80, date=d_str)
        assert store.get_stats(date="2026-06-07")["streak"]["repairItems"] == 1


class TestRepairItem:
    def test_repair_preserves_streak_after_gap(self, store):
        for d in range(1, 4):
            d_str = f"2026-06-0{d}"
            store.set_daily_goal("easy", date=d_str)
            store.add_xp(80, date=d_str)
        # Earn a repair item first (need 7 days)
        for d in range(4, 11):
            d_str = f"2026-06-{d:02d}"
            store.set_daily_goal("easy", date=d_str)
            store.add_xp(80, date=d_str)
        # Now we should have at least 1 repair item
        # 2026-06-11 skipped, use repair
        store.use_repair("2026-06-11")
        store.set_daily_goal("easy", date="2026-06-12")
        store.add_xp(80, date="2026-06-12")
        assert store.get_stats(date="2026-06-12")["streak"]["current"] == 12

    def test_repair_consumes_item(self, store):
        for d in range(1, 8):
            d_str = f"2026-06-0{d}" if d < 10 else f"2026-06-{d}"
            store.set_daily_goal("easy", date=d_str)
            store.add_xp(80, date=d_str)
        assert store.get_stats(date="2026-06-07")["streak"]["repairItems"] == 1
        store.use_repair("2026-06-08")
        assert store.get_stats(date="2026-06-08")["streak"]["repairItems"] == 0

    def test_repair_fails_with_no_items(self, store):
        result = store.use_repair("2026-06-01")
        assert result is False

    def test_repair_items_cap_at_3(self, store):
        for d in range(1, 22):
            d_str = f"2026-06-{d:02d}"
            store.set_daily_goal("easy", date=d_str)
            store.add_xp(80, date=d_str)
        assert store.get_stats(date="2026-06-21")["streak"]["repairItems"] == 3


class TestPersistence:
    def test_data_survives_reload(self, tmp_path):
        path = tmp_path / "stats.json"
        store = StatsStore(path)
        store.add_xp(200, date="2026-06-01")
        store.set_daily_goal("normal", date="2026-06-01")
        store2 = StatsStore(path)
        assert store2.get_stats()["totalXp"] == 200
