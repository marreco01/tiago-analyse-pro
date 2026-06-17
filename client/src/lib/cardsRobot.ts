export type CardLine = {
  name: string;
  probability: number;
  level: "Forte" | "Médio" | "Evitar";
  risk: "Baixo" | "Médio" | "Alto";
};

export type CardOpportunity = {
  id: string;
  matchId: string;
  competition: string;
  date: string;
  time: string;
  home: string;
  away: string;
  status: string;
  source: string;
  expectedCards: number;
  aggressionIndex: number;
  rivalryIndex: number;
  pressureIndex: number;
  bestLine: string;
  confidence: number;
  risk: "Baixo" | "Médio" | "Alto";
  lines: {
    over25: CardLine;
    over35: CardLine;
    over45: CardLine;
    over55: CardLine;
  };
  liveAlert?: {
    active: boolean;
    message: string;
    nextCardProbability: number;
  };
  summary: string;
  updatedAt: string;
};

export async function fetchCardsRobot(market = "best") {
  const response = await fetch(`/api/cards/robot?market=${encodeURIComponent(market)}`, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || "Erro ao carregar Robô Cartões.");
  return data as {
    success: true;
    updatedAt: string;
    source: string;
    opportunities: CardOpportunity[];
  };
}

export async function fetchCardsCompare(home: string, away: string) {
  const params = new URLSearchParams({ home, away });
  const response = await fetch(`/api/cards/compare?${params.toString()}`, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || "Erro ao comparar cartões.");
  return data as {
    success: true;
    home: string;
    away: string;
    opportunity: CardOpportunity | null;
    source: string;
  };
}
