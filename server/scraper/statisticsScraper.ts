import {
  getCachedGames,
  getCachedWorldCup,
  updateGameRobot,
  updateWorldCupRobot,
  type PublicGameItem,
  type WorldCupMatch,
} from "./index";

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

export type StatisticalRobotStatus = {
  id: "estatisticas";
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
  cornerOpportunities: number;
  cardsOpportunities: number;
  goalsOpportunities: number;
  bestOpportunities: number;
  lastError?: string;
};

export type StatisticalRobotLogEntry = {
  id: string;
  robot: "estatisticas";
  level: "info" | "success" | "error";
  message: string;
  createdAt: string;
  totalItems?: number;
};

const STATS_CACHE_TIME_MS = 1000 * 60 * 1;
const SOURCES = ["Robô Jogos", "Robô Copa", "Modelo estatístico Analyse Pro"];
const logs: StatisticalRobotLogEntry[] = [];
let running = false;
let timer: NodeJS.Timeout | null = null;
let status: StatisticalRobotStatus["status"] = "online";
let lastRunAt = "";
let nextRunAt = "";
let lastError = "";

let cache = {
  updatedAt: new Date().toISOString(),
  opportunities: [] as StatisticalOpportunity[],
};

function scheduleNextRun() {
  nextRunAt = new Date(Date.now() + STATS_CACHE_TIME_MS).toISOString();
}

function addLog(level: StatisticalRobotLogEntry["level"], message: string, totalItems?: number) {
  logs.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    robot: "estatisticas",
    level,
    message,
    createdAt: new Date().toISOString(),
    totalItems,
  });
  if (logs.length > 100) logs.length = 100;
}

function hashText(value: string) {
  return value.split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 7), 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function level(probability: number): StatMarketLine["level"] {
  if (probability >= 75) return "Forte";
  if (probability >= 58) return "Médio";
  return "Evitar";
}

function risk(probability: number): StatMarketLine["risk"] {
  if (probability >= 75) return "Baixo";
  if (probability >= 58) return "Médio";
  return "Alto";
}

function line(name: string, probability: number): StatMarketLine {
  const p = clamp(probability, 1, 97);
  return {
    name,
    probability: p,
    level: level(p),
    risk: risk(p),
  };
}

function normalizeGame(game: PublicGameItem | WorldCupMatch) {
  const anyGame = game as any;
  return {
    id: anyGame.id || anyGame.fixtureId,
    competition: anyGame.competition || anyGame.league || "Futebol",
    date: anyGame.date || new Date().toISOString().slice(0, 10),
    time: anyGame.time || "--:--",
    home: anyGame.home,
    away: anyGame.away,
    status: anyGame.status || "scheduled",
    source: anyGame.source || "Robô",
  };
}

function calculateOpportunity(gameInput: PublicGameItem | WorldCupMatch): StatisticalOpportunity {
  const game = normalizeGame(gameInput);
  const seed = hashText(`${game.home}-${game.away}-${game.competition}`);
  const homePower = 55 + (hashText(game.home) % 36);
  const awayPower = 55 + (hashText(game.away) % 36);
  const totalPower = homePower + awayPower;
  const balance = Math.abs(homePower - awayPower);

  const over15 = clamp(64 + (totalPower - 120) / 3 + (seed % 12), 48, 91);
  const over25 = clamp(over15 - 16 + (seed % 9), 36, 82);
  const btts = clamp(52 + (Math.min(homePower, awayPower) - 55) / 2 + (seed % 11), 32, 79);

  const expectedCorners = Math.max(7.2, Math.min(12.8, 8.1 + (totalPower - 120) / 18 + (seed % 16) / 10));
  const corners85 = clamp(62 + (expectedCorners - 8.5) * 12 + (seed % 8), 38, 91);
  const corners95 = clamp(corners85 - 10 + (seed % 5), 28, 84);
  const corners105 = clamp(corners95 - 11 + (seed % 4), 18, 74);

  const expectedCards = Math.max(2.8, Math.min(6.8, 3.5 + balance / 18 + (seed % 10) / 10));
  const cards35 = clamp(60 + (expectedCards - 3.5) * 14 + (seed % 7), 36, 90);
  const cards45 = clamp(cards35 - 13 + (seed % 6), 24, 82);

  const favorite = balance <= 6 ? "Equilíbrio" : homePower > awayPower ? game.home : game.away;
  const confidence = clamp(58 + balance / 2 + (over15 - 60) / 5, 52, 91);

  const candidates = [
    line("Over 1.5 gols", over15),
    line("Over 2.5 gols", over25),
    line("BTTS", btts),
    line("Over 8.5 escanteios", corners85),
    line("Over 9.5 escanteios", corners95),
    line("Over 10.5 escanteios", corners105),
    line("Over 3.5 cartões", cards35),
    line("Over 4.5 cartões", cards45),
  ].sort((a, b) => b.probability - a.probability);

  const best = candidates[0];

  return {
    id: `stats-${game.id}`,
    matchId: game.id,
    competition: game.competition,
    date: game.date,
    time: game.time,
    home: game.home,
    away: game.away,
    status: game.status,
    source: game.source,
    favorite,
    confidence,
    bestMarket: best.name,
    risk: best.risk,
    goals: {
      over15: line("Over 1.5 gols", over15),
      over25: line("Over 2.5 gols", over25),
      btts: line("BTTS", btts),
    },
    corners: {
      over85: line("Over 8.5 escanteios", corners85),
      over95: line("Over 9.5 escanteios", corners95),
      over105: line("Over 10.5 escanteios", corners105),
      expected: Number(expectedCorners.toFixed(1)),
    },
    cards: {
      over35: line("Over 3.5 cartões", cards35),
      over45: line("Over 4.5 cartões", cards45),
      expected: Number(expectedCards.toFixed(1)),
    },
    summary: `Melhor mercado: ${best.name} com ${best.probability}% de confiança. Favorito: ${favorite}.`,
    updatedAt: new Date().toISOString(),
  };
}

async function collectStatisticalOpportunities() {
  await Promise.all([
    updateGameRobot(false).catch(() => undefined),
    updateWorldCupRobot(false).catch(() => undefined),
  ]);

  const gameCache = getCachedGames();
  const worldCupCache = getCachedWorldCup();

  const games = [
    ...(gameCache.games || []),
    ...(worldCupCache.matches || []),
  ];

  const unique = new Map<string, PublicGameItem | WorldCupMatch>();
  for (const game of games) {
    const normalized = normalizeGame(game);
    if (!normalized.home || !normalized.away) continue;
    unique.set(normalized.id, game);
  }

  return Array.from(unique.values()).map(calculateOpportunity);
}

export async function updateStatisticalRobot(force = false) {
  if (!force && cache.opportunities.length) return cache;

  status = "running";
  lastError = "";

  try {
    const opportunities = await collectStatisticalOpportunities();
    cache = {
      updatedAt: new Date().toISOString(),
      opportunities,
    };
    lastRunAt = cache.updatedAt;
    status = "online";
    scheduleNextRun();

    addLog(
      "success",
      `Robô Estatístico atualizado: ${opportunities.length} jogos analisados e ${opportunities.length * 8} linhas geradas.`,
      opportunities.length
    );
  } catch (error) {
    lastError = error instanceof Error ? error.message : "Erro desconhecido";
    status = "error";
    scheduleNextRun();
    addLog("error", `Falha no Robô Estatístico: ${lastError}`, cache.opportunities.length);
  }

  return cache;
}

export function getStatisticalRobotStatus(): StatisticalRobotStatus {
  const opportunities = cache.opportunities;
  return {
    id: "estatisticas",
    name: "Robô Estatístico",
    status,
    visibleToPublic: false,
    intervalMinutes: Math.round(STATS_CACHE_TIME_MS / 60000),
    sources: SOURCES,
    lastRunAt,
    nextRunAt,
    totalItems: opportunities.length,
    gamesAnalyzed: opportunities.length,
    linesGenerated: opportunities.length * 8,
    cornerOpportunities: opportunities.filter((item) => item.corners.over85.probability >= 70).length,
    cardsOpportunities: opportunities.filter((item) => item.cards.over35.probability >= 70).length,
    goalsOpportunities: opportunities.filter((item) => item.goals.over15.probability >= 70).length,
    bestOpportunities: opportunities.filter((item) => item.confidence >= 75 || item.risk === "Baixo").length,
    lastError,
  };
}

export function getStatisticalRobotLogs() {
  return logs;
}

export function getCachedStatistics() {
  return cache;
}

export function getStatisticalOpportunity(home: string, away: string) {
  const n = (value: string) => value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const h = n(home);
  const a = n(away);
  return cache.opportunities.find((item) => {
    const ih = n(item.home);
    const ia = n(item.away);
    return (ih === h && ia === a) || (ih === a && ia === h);
  }) || null;
}

export function startStatisticalRobot() {
  if (running) return;
  running = true;
  addLog("info", "Robô Estatístico iniciado: Over, BTTS, Escanteios e Cartões a cada 1 minuto.");
  scheduleNextRun();
  updateStatisticalRobot(true).catch(() => undefined);
  timer = setInterval(() => updateStatisticalRobot(true).catch(() => undefined), STATS_CACHE_TIME_MS);
  timer.unref?.();
}
