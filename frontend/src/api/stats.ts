const API_BASE = "/api";

export interface Stats {
  totalXp: number;
  level: number;
  title: string;
  nextLevelXp: number | null;
  streak: {
    current: number;
    longest: number;
    repairItems: number;
  };
  todayTarget: number | null;
  todayEarned: number;
  todayCompleted: boolean;
  goalType: "xp" | "time" | null;
  todayTimeEarned: number;
}

export async function getStats(): Promise<Stats> {
  const resp = await fetch(`${API_BASE}/stats`);
  return resp.json();
}

export async function setDailyGoal(params: {
  difficulty: "easy" | "normal" | "challenge" | "custom";
  goal_type: "xp" | "time";
  custom_minutes?: number;
}): Promise<Stats> {
  const resp = await fetch(`${API_BASE}/stats/daily-goal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return resp.json();
}

export async function useRepair(date: string): Promise<Stats> {
  const resp = await fetch(`${API_BASE}/stats/repair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date }),
  });
  if (!resp.ok) throw new Error("No repair items available");
  return resp.json();
}
