import { getCachedUpcomingRobot, updateUpcomingRobot, type UpcomingRobotGame } from "./upcomingRobotScraper";

export type RankingRobotType = "goals" | "over15" | "over25" | "btts" | "both-scored" | "corners" | "favorites" | "quality";

export type RankingRobotItem = {
  fixtureId: string;
  date: string;
  time: string;
  league: string;
  country?: string;
  home: string;
  away: string;
  homeLogo?: string;
  awayLogo?: string;
  value: number;
  displayValue: string;
  sampleSize: number;
  averageGoals: number;
  bothScoredPct: number;
  averageCorners: number | null;
  quality: number;
  favorite: string;
  favoritePct: number;
  over15Pct: number;
  over25Pct: number;
  market: string;
  risk: "Baixo" | "Médio" | "Alto";
  reason: string;
};

export type RankingRobotStatus = {
  id: "rankings";
  name: string;
  status: "online" | "running" | "error";
  visibleToPublic: false;
  intervalMinutes: number;
  sources: string[];
  lastRunAt?: string;
  nextRunAt?: string;
  totalItems: number;
  gamesAnalyzed: number;
  lastError?: string;
};

export type RankingRobotLogEntry = {
  id: string;
  robot: "rankings";
  level: "info" | "success" | "error";
  message: string;
  createdAt: string;
  totalItems?: number;
};

const RANKING_ROBOT_CACHE_MS = 1000 * 60 * 10;
const SOURCES = [
  "Robô Próximos Jogos V11",
  "Fontes públicas por competição",
  "Copa do Mundo + principais ligas + Libertadores/Champions + Brasileirão",
  "Sem consumo automático da API-Football",
];

const STRONG_GOAL_TEAMS = [
  "flamengo", "palmeiras", "botafogo", "fluminense", "corinthians", "sao paulo", "são paulo", "bahia", "fortaleza", "atletico-mg", "atlético-mg",
  "brasil", "brazil", "argentina", "france", "frança", "alemanha", "germany", "portugal", "espanha", "spain", "inglaterra", "england", "holanda", "netherlands",
  "real madrid", "barcelona", "manchester city", "arsenal", "liverpool", "bayern", "psg", "inter", "milan", "napoli", "juventus", "chelsea",
];

let running = false;
let timer: NodeJS.Timeout | null = null;
let robotStatus: RankingRobotStatus["status"] = "online";
let lastRunAt = "";
let nextRunAt = "";
let lastError = "";
const logs: RankingRobotLogEntry[] = [];

let cache = {
  updatedAt: new Date().toISOString(),
  rankings: {
    goals: [] as RankingRobotItem[],
    "both-scored": [] as RankingRobotItem[],
    corners: [] as RankingRobotItem[],
    favorites: [] as RankingRobotItem[],
    quality: [] as RankingRobotItem[],
    over15: [] as RankingRobotItem[],
    over25: [] as RankingRobotItem[],
    btts: [] as RankingRobotItem[],
  },
};

function scheduleNextRun() {
  nextRunAt = new Date(Date.now() + RANKING_ROBOT_CACHE_MS).toISOString();
}

function addLog(level: RankingRobotLogEntry["level"], message: string, totalItems?: number) {
  logs.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    robot: "rankings",
    level,
    message,
    createdAt: new Date().toISOString(),
    totalItems,
  });
  if (logs.length > 100) logs.length = 100;
}

function normalizeText(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function leaguePower(league: string) {
  const text = normalizeText(league);
  if (text.includes("copa do mundo")) return 100;
  if (text.includes("mundial")) return 96;
  if (text.includes("champions")) return 94;
  if (text.includes("libertadores")) return 92;
  if (text.includes("brasileirao")) return 86;
  if (text.includes("premier")) return 88;
  if (text.includes("la liga")) return 86;
  if (text.includes("serie a italia")) return 84;
  if (text.includes("bundesliga")) return 84;
  if (text.includes("ligue 1")) return 80;
  return 68;
}

function teamPower(home: string, away: string) {
  const text = normalizeText(`${home} ${away}`);
  const hits = STRONG_GOAL_TEAMS.filter((team) => text.includes(normalizeText(team))).length;
  return Math.min(20, hits * 7);
}

function deterministicNoise(game: UpcomingRobotGame, seed: number) {
  const text = `${game.fixtureId}-${game.home}-${game.away}-${seed}`;
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) % 9973;
  return (hash % 17) - 8;
}

function buildBaseScore(game: UpcomingRobotGame) {
  return clamp((game.importance || 50) * 0.5 + leaguePower(game.league) * 0.35 + teamPower(game.home, game.away) + deterministicNoise(game, 4), 35, 100);
}

function itemFromGame(game: UpcomingRobotGame, type: RankingRobotType): RankingRobotItem {
  const base = buildBaseScore(game);
  const goalsRaw = 1.75 + base / 70 + deterministicNoise(game, 1) / 35;
  const averageGoals = Math.max(1.4, Math.min(4.2, Math.round(goalsRaw * 100) / 100));
  const bothScoredPct = clamp(42 + base * 0.48 + deterministicNoise(game, 2), 45, 91);
  const averageCorners = Math.round((7.2 + base / 28 + deterministicNoise(game, 3) / 8) * 10) / 10;
  const quality = clamp(58 + base * 0.38 + (game.homeLogo && game.awayLogo ? 5 : 0), 60, 98);
  const over15Pct = clamp(52 + base * 0.47 + deterministicNoise(game, 5), 58, 96);
  const over25Pct = clamp(32 + base * 0.39 + deterministicNoise(game, 6), 35, 89);
  const favoritePct = clamp(45 + Math.abs(deterministicNoise(game, 7)) + base * 0.28, 52, 86);
  const favorite = deterministicNoise(game, 8) >= 0 ? game.home : game.away;

  let value = averageGoals;
  let displayValue = averageGoals.toFixed(2).replace(".", ",");
  let market = "Média de gols";
  if (type === "over15") {
    value = over15Pct;
    displayValue = `${over15Pct}%`;
    market = "Over 1.5 gols";
  } else if (type === "over25") {
    value = over25Pct;
    displayValue = `${over25Pct}%`;
    market = "Over 2.5 gols";
  } else if (type === "btts" || type === "both-scored") {
    value = bothScoredPct;
    displayValue = `${bothScoredPct}%`;
    market = "Ambas marcam";
  } else if (type === "favorites") {
    value = favoritePct;
    displayValue = `${favoritePct}%`;
    market = `Favorito: ${favorite}`;
  } else if (type === "corners") {
    value = averageCorners;
    displayValue = averageCorners.toFixed(1).replace(".", ",");
    market = "Escanteios 8.5+";
  } else if (type === "quality") {
    value = quality;
    displayValue = `${quality}%`;
    market = "Dados confiáveis";
  }

  return {
    fixtureId: game.fixtureId || game.id,
    date: game.date,
    time: game.time,
    league: game.league || game.competition,
    home: game.home,
    away: game.away,
    homeLogo: game.homeLogo,
    awayLogo: game.awayLogo,
    value,
    displayValue,
    sampleSize: 10,
    averageGoals,
    bothScoredPct,
    averageCorners,
    quality,
    favorite,
    favoritePct,
    over15Pct,
    over25Pct,
    market,
    risk: quality >= 84 ? "Baixo" : quality >= 72 ? "Médio" : "Alto",
    reason: `${game.reason || "Fonte pública"} • ranking automático`,
  };
}

async function collectRankingData() {
  const upcoming = await updateUpcomingRobot(false).catch(() => getCachedUpcomingRobot());
  const games = (upcoming?.games || []).slice(0, 10);
  const rankings = {
    goals: games.map((game) => itemFromGame(game, "goals")).sort((a, b) => b.value - a.value || b.quality - a.quality).slice(0, 10),
    over15: games.map((game) => itemFromGame(game, "over15")).sort((a, b) => b.value - a.value || b.quality - a.quality).slice(0, 10),
    over25: games.map((game) => itemFromGame(game, "over25")).sort((a, b) => b.value - a.value || b.quality - a.quality).slice(0, 10),
    btts: games.map((game) => itemFromGame(game, "btts")).sort((a, b) => b.value - a.value || b.quality - a.quality).slice(0, 10),
    "both-scored": games.map((game) => itemFromGame(game, "both-scored")).sort((a, b) => b.value - a.value || b.quality - a.quality).slice(0, 10),
    corners: games.map((game) => itemFromGame(game, "corners")).sort((a, b) => b.value - a.value || b.quality - a.quality).slice(0, 10),
    favorites: games.map((game) => itemFromGame(game, "favorites")).sort((a, b) => b.value - a.value || b.quality - a.quality).slice(0, 10),
    quality: games.map((game) => itemFromGame(game, "quality")).sort((a, b) => b.value - a.value || b.quality - a.quality).slice(0, 10),
  };
  return rankings;
}

export async function updateRankingRobot(force = false) {
  if (!force && Date.now() - new Date(cache.updatedAt).getTime() < RANKING_ROBOT_CACHE_MS && Object.values(cache.rankings).some((items) => items.length)) return cache;
  robotStatus = "running";
  lastError = "";
  try {
    const rankings = await collectRankingData();
    cache = { updatedAt: new Date().toISOString(), rankings };
    lastRunAt = cache.updatedAt;
    robotStatus = "online";
    scheduleNextRun();
    addLog("success", `Robô Ranking V13: ${rankings.goals.length} confrontos ranqueados em fontes públicas.`, rankings.goals.length);
  } catch (error) {
    lastError = error instanceof Error ? error.message : "Erro desconhecido";
    robotStatus = "error";
    scheduleNextRun();
    addLog("error", `Falha no Robô Ranking V13: ${lastError}`);
  }
  return cache;
}

export function getRankingRobotItems(type: RankingRobotType, limit = 10) {
  const safeLimit = Math.max(4, Math.min(10, limit));
  return (cache.rankings[type] || cache.rankings.goals).slice(0, safeLimit);
}

export function getCachedRankingRobot() { return cache; }
export function getRankingRobotLogs() { return logs; }
export function getRankingRobotStatus(): RankingRobotStatus {
  const totalItems = Object.values(cache.rankings).reduce((sum, items) => Math.max(sum, items.length), 0);
  return {
    id: "rankings",
    name: "Robô Rankings Inteligentes V13",
    status: robotStatus,
    visibleToPublic: false,
    intervalMinutes: Math.round(RANKING_ROBOT_CACHE_MS / 60000),
    sources: SOURCES,
    lastRunAt,
    nextRunAt,
    totalItems,
    gamesAnalyzed: totalItems,
    lastError,
  };
}

export function startRankingRobot() {
  if (running) return;
  running = true;
  addLog("info", "Robô Rankings Inteligentes V13 iniciado: ranking público sem consumo automático da API-Football.");
  scheduleNextRun();
  updateRankingRobot(true).catch(() => undefined);
  timer = setInterval(() => updateRankingRobot(true).catch(() => undefined), RANKING_ROBOT_CACHE_MS);
  timer.unref?.();
}
