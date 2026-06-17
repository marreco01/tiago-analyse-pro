export type CornerLine = {
  name: string;
  probability: number;
  level: "Forte" | "Médio" | "Evitar";
  risk: "Baixo" | "Médio" | "Alto";
};

export type CornerOpportunity = {
  id: string;
  matchId: string;
  competition: string;
  date: string;
  time: string;
  home: string;
  away: string;
  status: string;
  source: string;
  expectedCorners: number;
  homeAverage: number;
  awayAverage: number;
  totalAverage: number;
  pressureIndex: number;
  bestLine: string;
  confidence: number;
  risk: "Baixo" | "Médio" | "Alto";
  lines: {
    over75: CornerLine;
    over85: CornerLine;
    over95: CornerLine;
    over105: CornerLine;
    over115: CornerLine;
  };
  liveAlert?: {
    active: boolean;
    message: string;
    nextCornerProbability: number;
  };
  summary: string;
  updatedAt: string;
};

export async function fetchCornersRobot(market = "best") {
  const response = await fetch(`/api/corners/robot?market=${encodeURIComponent(market)}`, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || "Erro ao carregar Robô Escanteios.");
  return data as {
    success: true;
    updatedAt: string;
    source: string;
    opportunities: CornerOpportunity[];
  };
}

export async function fetchCornersCompare(home: string, away: string) {
  const params = new URLSearchParams({ home, away });
  const response = await fetch(`/api/corners/compare?${params.toString()}`, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || "Erro ao comparar escanteios.");
  return data as {
    success: true;
    home: string;
    away: string;
    opportunity: CornerOpportunity | null;
    source: string;
  };
}
