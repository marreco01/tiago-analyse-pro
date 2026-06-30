import type { LocalUser } from "@/lib/localAuth";

export type DailyTip = {
  id: string;
  league: string;
  time: string;
  home: string;
  away: string;
  homeLogo?: string;
  awayLogo?: string;
  indicator: string;
  value: string;
  confidence: number;
  access: "FREE" | "PRO" | "VIP";
};

export const dailyTips: DailyTip[] = [
  { id: "report-01", league: "Champions League", time: "16:00", home: "Real Madrid", away: "Bayern München", indicator: "Média de gols recentes", value: "2,8", confidence: 92, access: "FREE" },
  { id: "report-02", league: "Europa League", time: "13:45", home: "Liverpool", away: "Atalanta", indicator: "Jogos com gol das duas equipas", value: "6/10", confidence: 89, access: "FREE" },
  { id: "report-03", league: "Premier League", time: "17:30", home: "Arsenal", away: "Aston Villa", indicator: "Aproveitamento em casa", value: "71%", confidence: 86, access: "FREE" },
  { id: "report-04", league: "La Liga", time: "15:00", home: "Barcelona", away: "Real Sociedad", indicator: "Média de gols do confronto", value: "2,3", confidence: 90, access: "FREE" },
  { id: "report-05", league: "Série A", time: "21:30", home: "Flamengo", away: "Palmeiras", indicator: "Média de escanteios", value: "9,1", confidence: 84, access: "FREE" },
  { id: "report-06", league: "Libertadores", time: "19:00", home: "River Plate", away: "Nacional", indicator: "Forma recente do mandante", value: "4V • 1E", confidence: 83, access: "PRO" },
  { id: "report-07", league: "Série B", time: "18:00", home: "Santos", away: "Vitória", indicator: "Média de gols sofridos", value: "0,9", confidence: 88, access: "PRO" },
  { id: "report-08", league: "Bundesliga", time: "14:30", home: "Dortmund", away: "Leipzig", indicator: "Jogos com gol das duas equipas", value: "7/10", confidence: 82, access: "PRO" },
  { id: "report-09", league: "Serie A Itália", time: "16:45", home: "Inter", away: "Roma", indicator: "Forma recente combinada", value: "7V • 2E • 1D", confidence: 87, access: "VIP" },
  { id: "report-10", league: "Ligue 1", time: "17:00", home: "PSG", away: "Lyon", indicator: "Média de finalizações", value: "24,6", confidence: 85, access: "VIP" },
];

export function normalizedPlan(user?: LocalUser | null) {
  return user?.role === "admin" ? "VIP" : user?.plan || "FREE";
}

export function tipLimitForPlan(user?: LocalUser | null) {
  const plan = normalizedPlan(user);
  return plan === "FREE" ? 5 : dailyTips.length;
}

export function visibleTipsForUser(user?: LocalUser | null) {
  return dailyTips.slice(0, tipLimitForPlan(user));
}


export function visibleTipsFromList(tips: DailyTip[], user?: LocalUser | null) {
  return tips.slice(0, tipLimitForPlan(user));
}
