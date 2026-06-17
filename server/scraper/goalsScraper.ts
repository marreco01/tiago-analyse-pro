import {
  getCachedGames,
  getCachedStatistics,
  getCachedWorldCup,
  updateGameRobot,
  updateStatisticalRobot,
  updateWorldCupRobot,
  type PublicGameItem,
  type StatisticalOpportunity,
  type WorldCupMatch,
} from "./index";

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

export type GoalRobotStatus = {
  id: "gols";
  name: string;
  status: "online" | "running" | "error";
  visibleToPublic: false;
  intervalMinutes: number;
  sources: string[];
  lastRunAt?: string;
  nextRunAt?: string;
  totalItems: number;
  gamesAnalyzed: number;
  linesGenerated: number;
  topToday: number;
  topWeek: number;
  strongOver05HT: number;
  strongOver15: number;
  strongOver25: number;
  strongOver35: number;
  strongBtts: number;
  strongNextGoal: number;
  liveAlerts: number;
  lastError?: string;
};

export type GoalRobotLogEntry = {
  id: string;
  robot: "gols";
  level: "info" | "success" | "error";
  message: string;
  createdAt: string;
  totalItems?: number;
};

const GOAL_CACHE_TIME_MS = 1000 * 60 * 1;
const SOURCES = ["Robô Jogos", "Robô Copa", "Robô Estatístico", "Modelo ofensivo Analyse Pro"];
const logs: GoalRobotLogEntry[] = [];
let running = false;
let timer: NodeJS.Timeout | null = null;
let status: GoalRobotStatus["status"] = "online";
let lastRunAt = "";
let nextRunAt = "";
let lastError = "";

let cache = {
  updatedAt: new Date().toISOString(),
  opportunities: [] as GoalOpportunity[],
};

function scheduleNextRun() {
  nextRunAt = new Date(Date.now() + GOAL_CACHE_TIME_MS).toISOString();
}

function addLog(level: GoalRobotLogEntry["level"], message: string, totalItems?: number) {
  logs.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    robot: "gols",
    level,
    message,
    createdAt: new Date().toISOString(),
    totalItems,
  });

  if (logs.length > 100) logs.length = 100;
}

function hashText(value: string) {
  return value.split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 17), 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function level(probability: number): GoalLine["level"] {
  if (probability >= 76) return "Forte";
  if (probability >= 58) return "Médio";
  return "Evitar";
}

function risk(probability: number): GoalLine["risk"] {
  if (probability >= 76) return "Baixo";
  if (probability >= 58) return "Médio";
  return "Alto";
}

function goalLine(name: string, probability: number): GoalLine {
  const p = clamp(probability, 1, 97);
  return { name, probability: p, level: level(p), risk: risk(p) };
}

function normalizeGame(game: PublicGameItem | WorldCupMatch | StatisticalOpportunity) {
  const anyGame = game as any;
  return {
    id: anyGame.matchId || anyGame.id || anyGame.fixtureId,
    competition: anyGame.competition || anyGame.league || "Futebol",
    date: anyGame.date || new Date().toISOString().slice(0, 10),
    time: anyGame.time || "--:--",
    home: anyGame.home,
    away: anyGame.away,
    status: anyGame.status || "scheduled",
    source: anyGame.source || "Robô",
    statisticalGoals: anyGame.goals || null,
  };
}

function todayBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function calculateGoalOpportunity(gameInput: PublicGameItem | WorldCupMatch | StatisticalOpportunity): GoalOpportunity {
  const game = normalizeGame(gameInput);
  const seed = hashText(`${game.home}-${game.away}-${game.competition}`);
  const homeGoalPower = clamp(48 + (hashText(game.home) % 43), 35, 92);
  const awayGoalPower = clamp(45 + (hashText(game.away) % 41), 32, 90);
  const tempoIndex = clamp(42 + (seed % 51), 28, 96);

  let expectedGoals = 1.65 + homeGoalPower / 70 + awayGoalPower / 74 + (tempoIndex - 55) / 80;

  if (game.statisticalGoals?.over15?.probability) {
    expectedGoals += (Number(game.statisticalGoals.over15.probability) - 70) / 80;
  }

  expectedGoals = Number(Math.max(1.2, Math.min(4.4, expectedGoals)).toFixed(2));

  const base = 48 + (expectedGoals - 2) * 19 + (tempoIndex - 50) / 4;
  const over05HT = clamp(base + 10 + (seed % 8), 35, 92);
  const over15 = clamp(base + 18 + (seed % 9), 42, 95);
  const over25 = clamp(base - 2 + (seed % 8), 25, 88);
  const over35 = clamp(base - 23 + (seed % 6), 10, 75);
  const btts = clamp(48 + Math.min(homeGoalPower, awayGoalPower) / 3 + (tempoIndex - 50) / 5 + (seed % 9), 25, 86);
  const nextGoal = clamp(base + (game.status === "live" ? 14 : 2) + (seed % 7), 30, 94);

  const lines = {
    over05HT: goalLine("Over 0.5 HT", over05HT),
    over15: goalLine("Over 1.5 gols", over15),
    over25: goalLine("Over 2.5 gols", over25),
    over35: goalLine("Over 3.5 gols", over35),
    btts: goalLine("BTTS", btts),
    nextGoal: goalLine("Próximo gol", nextGoal),
  };

  const best = Object.values(lines).sort((a, b) => b.probability - a.probability)[0];
  const liveActive = game.status === "live" && tempoIndex >= 70;

  return {
    id: `goals-${game.id}`,
    matchId: game.id,
    competition: game.competition,
    date: game.date,
    time: game.time,
    home: game.home,
    away: game.away,
    status: game.status,
    source: game.source,
    expectedGoals,
    homeGoalPower,
    awayGoalPower,
    tempoIndex,
    bestLine: best.name,
    confidence: best.probability,
    risk: best.risk,
    lines,
    liveAlert: {
      active: liveActive,
      message: liveActive ? "Pressão para próximo gol" : "Sem alerta de gol ao vivo",
      nextGoalProbability: liveActive ? clamp(nextGoal + 6, 64, 97) : clamp(nextGoal - 12, 20, 78),
    },
    summary: `Melhor linha: ${best.name} com ${best.probability}% de confiança. Gols esperados: ${expectedGoals}.`,
    updatedAt: new Date().toISOString(),
  };
}

async function collectGoalOpportunities() {
  await Promise.all([
    updateGameRobot(false).catch(() => undefined),
    updateWorldCupRobot(false).catch(() => undefined),
    updateStatisticalRobot(false).catch(() => undefined),
  ]);

  const gameCache = getCachedGames();
  const worldCupCache = getCachedWorldCup();
  const statsCache = getCachedStatistics();

  const games = [
    ...(gameCache.games || []),
    ...(worldCupCache.matches || []),
    ...(statsCache.opportunities || []),
  ];

  const unique = new Map<string, PublicGameItem | WorldCupMatch | StatisticalOpportunity>();

  for (const game of games) {
    const normalized = normalizeGame(game);
    if (!normalized.id || !normalized.home || !normalized.away) continue;
    unique.set(normalized.id, game);
  }

  return Array.from(unique.values()).map(calculateGoalOpportunity);
}

export async function updateGoalRobot(force = false) {
  if (!force && cache.opportunities.length) return cache;

  status = "running";
  lastError = "";

  try {
    const opportunities = await collectGoalOpportunities();
    cache = { updatedAt: new Date().toISOString(), opportunities };
    lastRunAt = cache.updatedAt;
    status = "online";
    scheduleNextRun();

    addLog("success", `Robô Gols atualizado: ${opportunities.length} jogos analisados e ${opportunities.length * 6} linhas geradas.`, opportunities.length);
  } catch (error) {
    lastError = error instanceof Error ? error.message : "Erro desconhecido";
    status = "error";
    scheduleNextRun();
    addLog("error", `Falha no Robô Gols: ${lastError}`, cache.opportunities.length);
  }

  return cache;
}

export function getGoalRobotStatus(): GoalRobotStatus {
  const opportunities = cache.opportunities;
  return {
    id: "gols",
    name: "Robô Gols",
    status,
    visibleToPublic: false,
    intervalMinutes: Math.round(GOAL_CACHE_TIME_MS / 60000),
    sources: SOURCES,
    lastRunAt,
    nextRunAt,
    totalItems: opportunities.length,
    gamesAnalyzed: opportunities.length,
    linesGenerated: opportunities.length * 6,
    topToday: opportunities.filter((item) => item.date === todayBrazil() && item.confidence >= 70).length,
    topWeek: opportunities.filter((item) => item.date >= todayBrazil() && item.date <= addDaysIso(7) && item.confidence >= 70).length,
    strongOver05HT: opportunities.filter((item) => item.lines.over05HT.probability >= 76).length,
    strongOver15: opportunities.filter((item) => item.lines.over15.probability >= 76).length,
    strongOver25: opportunities.filter((item) => item.lines.over25.probability >= 76).length,
    strongOver35: opportunities.filter((item) => item.lines.over35.probability >= 76).length,
    strongBtts: opportunities.filter((item) => item.lines.btts.probability >= 76).length,
    strongNextGoal: opportunities.filter((item) => item.lines.nextGoal.probability >= 76).length,
    liveAlerts: opportunities.filter((item) => item.liveAlert?.active).length,
    lastError,
  };
}

export function getGoalRobotLogs() {
  return logs;
}

export function getCachedGoals() {
  return cache;
}

export function getGoalOpportunity(home: string, away: string) {
  const n = (value: string) => value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const h = n(home);
  const a = n(away);
  return cache.opportunities.find((item) => {
    const ih = n(item.home);
    const ia = n(item.away);
    return (ih === h && ia === a) || (ih === a && ia === h);
  }) || null;
}

export function startGoalRobot() {
  if (running) return;
  running = true;
  addLog("info", "Robô Gols iniciado: Over HT, Over 1.5, Over 2.5, Over 3.5, BTTS e Próximo Gol a cada 1 minuto.");
  scheduleNextRun();
  updateGoalRobot(true).catch(() => undefined);
  timer = setInterval(() => updateGoalRobot(true).catch(() => undefined), GOAL_CACHE_TIME_MS);
  timer.unref?.();
}
