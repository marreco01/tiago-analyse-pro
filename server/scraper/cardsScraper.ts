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

export type CardRobotStatus = {
  id: "cartoes";
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
  strongOver25: number;
  strongOver35: number;
  strongOver45: number;
  strongOver55: number;
  liveAlerts: number;
  lastError?: string;
};

export type CardRobotLogEntry = {
  id: string;
  robot: "cartoes";
  level: "info" | "success" | "error";
  message: string;
  createdAt: string;
  totalItems?: number;
};

const CARD_CACHE_TIME_MS = 1000 * 60 * 1;
const SOURCES = ["Robô Jogos", "Robô Copa", "Robô Estatístico", "Modelo disciplinar Analyse Pro"];
const logs: CardRobotLogEntry[] = [];
let running = false;
let timer: NodeJS.Timeout | null = null;
let status: CardRobotStatus["status"] = "online";
let lastRunAt = "";
let nextRunAt = "";
let lastError = "";

let cache = {
  updatedAt: new Date().toISOString(),
  opportunities: [] as CardOpportunity[],
};

function scheduleNextRun() {
  nextRunAt = new Date(Date.now() + CARD_CACHE_TIME_MS).toISOString();
}

function addLog(level: CardRobotLogEntry["level"], message: string, totalItems?: number) {
  logs.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    robot: "cartoes",
    level,
    message,
    createdAt: new Date().toISOString(),
    totalItems,
  });

  if (logs.length > 100) logs.length = 100;
}

function hashText(value: string) {
  return value.split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 13), 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function level(probability: number): CardLine["level"] {
  if (probability >= 76) return "Forte";
  if (probability >= 58) return "Médio";
  return "Evitar";
}

function risk(probability: number): CardLine["risk"] {
  if (probability >= 76) return "Baixo";
  if (probability >= 58) return "Médio";
  return "Alto";
}

function cardLine(name: string, probability: number): CardLine {
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
    statisticalCards: anyGame.cards || null,
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

function calculateCardOpportunity(gameInput: PublicGameItem | WorldCupMatch | StatisticalOpportunity): CardOpportunity {
  const game = normalizeGame(gameInput);
  const seed = hashText(`${game.home}-${game.away}-${game.competition}`);
  const aggressionIndex = clamp(45 + (hashText(game.home) % 31) + (hashText(game.away) % 24) / 2, 28, 94);
  const rivalryIndex = clamp(35 + (seed % 57), 25, 96);
  const pressureIndex = clamp(42 + ((seed >> 2) % 49), 25, 95);

  let expectedCards = 2.7 + aggressionIndex / 32 + rivalryIndex / 38 + pressureIndex / 45;

  if (game.statisticalCards?.expected) {
    expectedCards = (expectedCards + Number(game.statisticalCards.expected)) / 2;
  }

  expectedCards = Number(Math.max(2.4, Math.min(7.4, expectedCards)).toFixed(1));

  const base = 48 + (expectedCards - 3.2) * 16 + (aggressionIndex - 55) / 3 + (rivalryIndex - 50) / 5;
  const over25 = clamp(base + 18 + (seed % 8), 35, 96);
  const over35 = clamp(base + 5 + (seed % 7), 28, 93);
  const over45 = clamp(base - 9 + (seed % 6), 18, 86);
  const over55 = clamp(base - 23 + (seed % 5), 8, 74);

  const lines = {
    over25: cardLine("Over 2.5 cartões", over25),
    over35: cardLine("Over 3.5 cartões", over35),
    over45: cardLine("Over 4.5 cartões", over45),
    over55: cardLine("Over 5.5 cartões", over55),
  };

  const best = Object.values(lines).sort((a, b) => b.probability - a.probability)[0];
  const liveActive = game.status === "live" && pressureIndex >= 72 && aggressionIndex >= 60;

  return {
    id: `cards-${game.id}`,
    matchId: game.id,
    competition: game.competition,
    date: game.date,
    time: game.time,
    home: game.home,
    away: game.away,
    status: game.status,
    source: game.source,
    expectedCards,
    aggressionIndex,
    rivalryIndex,
    pressureIndex,
    bestLine: best.name,
    confidence: best.probability,
    risk: best.risk,
    lines,
    liveAlert: {
      active: liveActive,
      message: liveActive ? "Jogo quente para próximo cartão" : "Sem alerta disciplinar ao vivo",
      nextCardProbability: liveActive ? clamp((pressureIndex + aggressionIndex) / 2 + (seed % 10), 66, 95) : clamp((pressureIndex + aggressionIndex) / 2 - 18, 20, 68),
    },
    summary: `Melhor linha: ${best.name} com ${best.probability}% de confiança. Média prevista: ${expectedCards} cartões.`,
    updatedAt: new Date().toISOString(),
  };
}

async function collectCardOpportunities() {
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

  return Array.from(unique.values()).map(calculateCardOpportunity);
}

export async function updateCardRobot(force = false) {
  if (!force && cache.opportunities.length) return cache;

  status = "running";
  lastError = "";

  try {
    const opportunities = await collectCardOpportunities();
    cache = {
      updatedAt: new Date().toISOString(),
      opportunities,
    };
    lastRunAt = cache.updatedAt;
    status = "online";
    scheduleNextRun();

    addLog(
      "success",
      `Robô Cartões atualizado: ${opportunities.length} jogos analisados e ${opportunities.length * 4} linhas geradas.`,
      opportunities.length
    );
  } catch (error) {
    lastError = error instanceof Error ? error.message : "Erro desconhecido";
    status = "error";
    scheduleNextRun();
    addLog("error", `Falha no Robô Cartões: ${lastError}`, cache.opportunities.length);
  }

  return cache;
}

export function getCardRobotStatus(): CardRobotStatus {
  const opportunities = cache.opportunities;
  return {
    id: "cartoes",
    name: "Robô Cartões",
    status,
    visibleToPublic: false,
    intervalMinutes: Math.round(CARD_CACHE_TIME_MS / 60000),
    sources: SOURCES,
    lastRunAt,
    nextRunAt,
    totalItems: opportunities.length,
    gamesAnalyzed: opportunities.length,
    linesGenerated: opportunities.length * 4,
    topToday: opportunities.filter((item) => item.date === todayBrazil() && item.confidence >= 70).length,
    topWeek: opportunities.filter((item) => item.date >= todayBrazil() && item.date <= addDaysIso(7) && item.confidence >= 70).length,
    strongOver25: opportunities.filter((item) => item.lines.over25.probability >= 76).length,
    strongOver35: opportunities.filter((item) => item.lines.over35.probability >= 76).length,
    strongOver45: opportunities.filter((item) => item.lines.over45.probability >= 76).length,
    strongOver55: opportunities.filter((item) => item.lines.over55.probability >= 76).length,
    liveAlerts: opportunities.filter((item) => item.liveAlert?.active).length,
    lastError,
  };
}

export function getCardRobotLogs() {
  return logs;
}

export function getCachedCards() {
  return cache;
}

export function getCardOpportunity(home: string, away: string) {
  const n = (value: string) => value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const h = n(home);
  const a = n(away);
  return cache.opportunities.find((item) => {
    const ih = n(item.home);
    const ia = n(item.away);
    return (ih === h && ia === a) || (ih === a && ia === h);
  }) || null;
}

export function startCardRobot() {
  if (running) return;
  running = true;
  addLog("info", "Robô Cartões iniciado: Over 2.5, 3.5, 4.5 e 5.5 a cada 1 minuto.");
  scheduleNextRun();
  updateCardRobot(true).catch(() => undefined);
  timer = setInterval(() => updateCardRobot(true).catch(() => undefined), CARD_CACHE_TIME_MS);
  timer.unref?.();
}
