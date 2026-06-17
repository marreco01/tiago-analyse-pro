export type StatMarketLine = {
  name: string;
  probability: number;
  level: "Forte" | "Médio" | "Evitar";
  risk: "Baixo" | "Médio" | "Alto";
};

export type StatisticalOpportunity = {
  id: string;
  matchId: string;
  competition: string;
  date: string;
  time: string;
  home: string;
  away: string;
  status: string;
  source: string;
  favorite: string;
  confidence: number;
  bestMarket: string;
  risk: "Baixo" | "Médio" | "Alto";
  goals: {
    over15: StatMarketLine;
    over25: StatMarketLine;
    btts: StatMarketLine;
  };
  corners: {
    over85: StatMarketLine;
    over95: StatMarketLine;
    over105: StatMarketLine;
    expected: number;
  };
  cards: {
    over35: StatMarketLine;
    over45: StatMarketLine;
    expected: number;
  };
  summary: string;
  updatedAt: string;
};

export async function fetchStatisticsRobot(market = "all") {
  const response = await fetch(`/api/statistics/robot?market=${encodeURIComponent(market)}`, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || "Erro ao carregar Robô Estatístico.");
  return data as {
    success: true;
    updatedAt: string;
    source: string;
    opportunities: StatisticalOpportunity[];
  };
}

export async function fetchStatisticsCompare(home: string, away: string) {
  const params = new URLSearchParams({ home, away });
  const response = await fetch(`/api/statistics/compare?${params.toString()}`, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || "Erro ao comparar estatísticas.");
  return data as {
    success: true;
    home: string;
    away: string;
    opportunity: StatisticalOpportunity | null;
    source: string;
  };
}
