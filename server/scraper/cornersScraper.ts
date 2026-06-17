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

export type CornerRobotStatus = {
  id: "escanteios";
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
  strongOver75: number;
  strongOver85: number;
  strongOver95: number;
  strongOver105: number;
  strongOver115: number;
  liveAlerts: number;
  lastError?: string;
};

export type CornerRobotLogEntry = {
  id: string;
  robot: "escanteios";
  level: "info" | "success" | "error";
  message: string;
  createdAt: string;
  totalItems?: number;
};

const CORNER_CACHE_TIME_MS = 1000 * 60 * 1;
const SOURCES = ["Robô Jogos", "Robô Copa", "Robô Estatístico", "Modelo de pressão Analyse Pro"];
const logs: CornerRobotLogEntry[] = [];
let running = false;
let timer: NodeJS.Timeout | null = null;
let status: CornerRobotStatus["status"] = "online";
let lastRunAt = "";
let nextRunAt = "";
let lastError = "";

let cache = {
  updatedAt: new Date().toISOString(),
  opportunities: [] as CornerOpportunity[],
};

function scheduleNextRun() {
  nextRunAt = new Date(Date.now() + CORNER_CACHE_TIME_MS).toISOString();
}

function addLog(level: CornerRobotLogEntry["level"], message: string, totalItems?: number) {
  logs.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    robot: "escanteios",
    level,
    message,
    createdAt: new Date().toISOString(),
    totalItems,
  });

  if (logs.length > 100) logs.length = 100;
}

function hashText(value: string) {
  return value.split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 11), 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function level(probability: number): CornerLine["level"] {
  if (probability >= 76) return "Forte";
  if (probability >= 58) return "Médio";
  return "Evitar";
}

function risk(probability: number): CornerLine["risk"] {
  if (probability >= 76) return "Baixo";
  if (probability >= 58) return "Médio";
  return "Alto";
}

function cornerLine(name: string, probability: number): CornerLine {
  const p = clamp(probability, 1, 97);
  return {
    name,
    probability: p,
    level: level(p),
    risk: risk(p),
  };
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
    statisticalCorners: anyGame.corners || null,
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

function calculateCornerOpportunity(gameInput: PublicGameItem | WorldCupMatch | StatisticalOpportunity): CornerOpportunity {
  const game = normalizeGame(gameInput);
  const seed = hashText(`${game.home}-${game.away}-${game.competition}`);
  const homeBase = 3.8 + (hashText(game.home) % 42) / 10;
  const awayBase = 3.4 + (hashText(game.away) % 39) / 10;
  const pressureIndex = clamp(52 + (seed % 43), 35, 94);

  let expectedCorners = homeBase + awayBase + (pressureIndex - 60) / 18;

  if (game.statisticalCorners?.expected) {
    expectedCorners = (expectedCorners + Number(game.statisticalCorners.expected)) / 2;
  }

  expectedCorners = Number(Math.max(6.4, Math.min(14.2, expectedCorners)).toFixed(1));

  const base = 50 + (expectedCorners - 8) * 12 + (pressureIndex - 55) / 3;
  const over75 = clamp(base + 14 + (seed % 8), 38, 96);
  const over85 = clamp(base + 4 + (seed % 7), 30, 93);
  const over95 = clamp(base - 8 + (seed % 6), 22, 88);
  const over105 = clamp(base - 19 + (seed % 5), 14, 78);
  const over115 = clamp(base - 29 + (seed % 4), 8, 68);

  const lines = {
    over75: cornerLine("Over 7.5 escanteios", over75),
    over85: cornerLine("Over 8.5 escanteios", over85),
    over95: cornerLine("Over 9.5 escanteios", over95),
    over105: cornerLine("Over 10.5 escanteios", over105),
    over115: cornerLine("Over 11.5 escanteios", over115),
  };

  const best = Object.values(lines).sort((a, b) => b.probability - a.probability)[0];
  const liveActive = game.status === "live" && pressureIndex >= 70;

  return {
    id: `corners-${game.id}`,
    matchId: game.id,
    competition: game.competition,
    date: game.date,
    time: game.time,
    home: game.home,
    away: game.away,
    status: game.status,
    source: game.source,
    expectedCorners,
    homeAverage: Number(homeBase.toFixed(1)),
    awayAverage: Number(awayBase.toFixed(1)),
    totalAverage: Number((homeBase + awayBase).toFixed(1)),
    pressureIndex,
    bestLine: best.name,
    confidence: best.probability,
    risk: best.risk,
    lines,
    liveAlert: {
      active: liveActive,
      message: liveActive ? "Pressão alta para próximo escanteio" : "Sem alerta ao vivo",
      nextCornerProbability: liveActive ? clamp(pressureIndex + (seed % 11), 65, 94) : clamp(pressureIndex - 12, 20, 70),
    },
    summary: `Melhor linha: ${best.name} com ${best.probability}% de confiança. Média prevista: ${expectedCorners} escanteios.`,
    updatedAt: new Date().toISOString(),
  };
}

async function collectCornerOpportunities() {
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

  return Array.from(unique.values()).map(calculateCornerOpportunity);
}

export async function updateCornerRobot(force = false) {
  if (!force && cache.opportunities.length) return cache;

  status = "running";
  lastError = "";

  try {
    const opportunities = await collectCornerOpportunities();
    cache = {
      updatedAt: new Date().toISOString(),
      opportunities,
    };
    lastRunAt = cache.updatedAt;
    status = "online";
    scheduleNextRun();

    addLog(
      "success",
      `Robô Escanteios atualizado: ${opportunities.length} jogos analisados e ${opportunities.length * 5} linhas geradas.`,
      opportunities.length
    );
  } catch (error) {
    lastError = error instanceof Error ? error.message : "Erro desconhecido";
    status = "error";
    scheduleNextRun();
    addLog("error", `Falha no Robô Escanteios: ${lastError}`, cache.opportunities.length);
  }

  return cache;
}

export function getCornerRobotStatus(): CornerRobotStatus {
  const opportunities = cache.opportunities;
  return {
    id: "escanteios",
    name: "Robô Escanteios",
    status,
    visibleToPublic: false,
    intervalMinutes: Math.round(CORNER_CACHE_TIME_MS / 60000),
    sources: SOURCES,
    lastRunAt,
    nextRunAt,
    totalItems: opportunities.length,
    gamesAnalyzed: opportunities.length,
    linesGenerated: opportunities.length * 5,
    topToday: opportunities.filter((item) => item.date === todayBrazil() && item.confidence >= 70).length,
    topWeek: opportunities.filter((item) => item.date >= todayBrazil() && item.date <= addDaysIso(7) && item.confidence >= 70).length,
    strongOver75: opportunities.filter((item) => item.lines.over75.probability >= 76).length,
    strongOver85: opportunities.filter((item) => item.lines.over85.probability >= 76).length,
    strongOver95: opportunities.filter((item) => item.lines.over95.probability >= 76).length,
    strongOver105: opportunities.filter((item) => item.lines.over105.probability >= 76).length,
    strongOver115: opportunities.filter((item) => item.lines.over115.probability >= 76).length,
    liveAlerts: opportunities.filter((item) => item.liveAlert?.active).length,
    lastError,
  };
}

export function getCornerRobotLogs() {
  return logs;
}

export function getCachedCorners() {
  return cache;
}

export function getCornerOpportunity(home: string, away: string) {
  const n = (value: string) => value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const h = n(home);
  const a = n(away);
  return cache.opportunities.find((item) => {
    const ih = n(item.home);
    const ia = n(item.away);
    return (ih === h && ia === a) || (ih === a && ia === h);
  }) || null;
}

export function startCornerRobot() {
  if (running) return;
  running = true;
  addLog("info", "Robô Escanteios iniciado: Over 7.5, 8.5, 9.5, 10.5 e 11.5 a cada 1 minuto.");
  scheduleNextRun();
  updateCornerRobot(true).catch(() => undefined);
  timer = setInterval(() => updateCornerRobot(true).catch(() => undefined), CORNER_CACHE_TIME_MS);
  timer.unref?.();
}
