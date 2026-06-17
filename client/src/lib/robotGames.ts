import type { UpcomingMatch } from "@/data/matchData";

export type RobotGame = UpcomingMatch & {
  fixtureId?: string;
  competition?: string;
  group?: string;
  status?: string;
  source?: string;
};

export async function fetchRobotGames(limit = 30): Promise<RobotGame[]> {
  const response = await fetch(`/api/robot-games?limit=${limit}`, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || "Erro ao carregar jogos do robô.");
  return data.games || [];
}

export async function fetchRobotTodayGames(limit = 30): Promise<RobotGame[]> {
  const response = await fetch(`/api/robot-games/today?limit=${limit}`, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || "Erro ao carregar jogos de hoje do robô.");
  return data.games || [];
}

export async function fetchRobotTeams(): Promise<string[]> {
  const response = await fetch("/api/robot-games/teams", { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) return [];
  return data.teams || [];
}
