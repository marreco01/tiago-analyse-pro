export type GoalLine = {
  name: string;
  probability: number;
  level: "Forte" | "Médio" | "Evitar";
  risk: "Baixo" | "Médio" | "Alto";
};

export type GoalOpportunity = {
  id: string;
  matchId: string;
  competition: string;
  date: string;
  time: string;
  home: string;
  away: string;
  status: string;
  source: string;
  expectedGoals: number;
  homeGoalPower: number;
  awayGoalPower: number;
  tempoIndex: number;
  bestLine: string;
  confidence: number;
  risk: "Baixo" | "Médio" | "Alto";
  lines: {
    over05HT: GoalLine;
    over15: GoalLine;
    over25: GoalLine;
    over35: GoalLine;
    btts: GoalLine;
    nextGoal: GoalLine;
  };
  liveAlert?: {
    active: boolean;
    message: string;
    nextGoalProbability: number;
  };
  summary: string;
  updatedAt: string;
};

export async function fetchGoalsRobot(market = "best") {
  const response = await fetch(`/api/goals/robot?market=${encodeURIComponent(market)}`, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || "Erro ao carregar Robô Gols.");
  return data as {
    success: true;
    updatedAt: string;
    source: string;
    opportunities: GoalOpportunity[];
  };
}

export async function fetchGoalsCompare(home: string, away: string) {
  const params = new URLSearchParams({ home, away });
  const response = await fetch(`/api/goals/compare?${params.toString()}`, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || "Erro ao comparar gols.");
  return data as {
    success: true;
    home: string;
    away: string;
    opportunity: GoalOpportunity | null;
    source: string;
  };
}
