import type { MatchFormItem, UpcomingMatch } from "@/data/matchData";

export type FootballLastGamesResponse = {
  success: boolean;
  games?: MatchFormItem[];
  error?: string;
};

export type FootballUpcomingResponse = {
  success: boolean;
  date?: string;
  games?: Array<UpcomingMatch & { homeLogo?: string; awayLogo?: string; status?: string; homeGoals?: number | null; awayGoals?: number | null }>;
  error?: string;
};

export async function fetchLastGames(teamId: number, limit = 5) {
  const response = await fetch(`/api/football/team/${teamId}/last?limit=${limit}`);
  const data = (await response.json()) as FootballLastGamesResponse;
  if (!response.ok || !data.success) throw new Error(data.error || "Erro ao carregar últimos jogos.");
  return data.games || [];
}

export async function fetchUpcomingGames(limit = 18) {
  const response = await fetch(`/api/football/upcoming?limit=${limit}`);
  const data = (await response.json()) as FootballUpcomingResponse;
  if (!response.ok || !data.success) throw new Error(data.error || "Erro ao carregar próximos jogos.");
  return data.games || [];
}


export async function fetchTodayGames(limit = 30) {
  const response = await fetch(`/api/jogos-hoje?limit=${limit}`, { cache: "no-store" });
  const data = (await response.json()) as FootballUpcomingResponse;
  if (!response.ok || !data.success) throw new Error(data.error || "Erro ao carregar jogos de hoje.");
  return data.games || [];
}
