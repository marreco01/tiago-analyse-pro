export type UpcomingRobotGame = {
  id: string;
  fixtureId: string;
  date: string;
  time: string;
  competition: string;
  group?: string;
  home: string;
  away: string;
  status: "scheduled";
  source: "upcoming-robot";
  importance: number;
  importanceLabel: "Alta" | "Média" | "Normal";
  reason: string;
};

export async function fetchUpcomingRobotGames(limit = 10) {
  const response = await fetch(`/api/upcoming-robot/games?limit=${limit}`, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || "Erro ao carregar Robô Próximos Jogos.");
  return data as {
    success: true;
    updatedAt: string;
    source: string;
    games: UpcomingRobotGame[];
    notice?: string;
  };
}
