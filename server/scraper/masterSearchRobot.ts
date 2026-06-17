import { updatePublicNews, getCachedPublicNews, getNewsRobotLogs } from "./newsScraper";
import { updateGameRobot, getCachedGames, getGameRobotLogs } from "./gameScraper";
import { updateWorldCupRobot, getCachedWorldCup, getWorldCupRobotLogs } from "./worldCupScraper";
import { updateCalendarRobot, getCachedCalendarRobot, getCalendarRobotStatus, getCalendarRobotLogs } from "./eventCalendarRobotScraper";
import { updateLiveRobot, getCachedLiveRobot, getLiveRobotStatus, getLiveRobotLogs } from "./liveRobotScraper";
import { updateUpcomingRobot, getCachedUpcomingRobot, getUpcomingRobotStatus, getUpcomingRobotLogs } from "./upcomingRobotScraper";
import { updateBrasileiraoTableRobot, getCachedBrasileiraoTable, getBrasileiraoTableRobotStatus, getBrasileiraoTableRobotLogs } from "./brasileiraoTableScraper";
import { updateBrasileiraoLogoRobot, getCachedBrasileiraoLogos, getBrasileiraoLogoRobotStatus, getBrasileiraoLogoRobotLogs } from "./brasileiraoLogoBot";
import { updateRankingRobot, getCachedRankingRobot, getRankingRobotStatus, getRankingRobotLogs } from "./rankingRobotScraper";
import { updateStatisticalRobot, getCachedStatistics, getStatisticalRobotLogs } from "./statisticsScraper";
import { updateCornerRobot, getCachedCorners, getCornerRobotLogs } from "./cornersScraper";
import { updateCardRobot, getCachedCards, getCardRobotLogs } from "./cardsScraper";
import { updateGoalRobot, getCachedGoals, getGoalRobotLogs } from "./goalsScraper";

export type MasterSearchRobotStatus = {
  id: "master-search";
  name: string;
  status: "online" | "running" | "error";
  visibleToPublic: false;
  intervalMinutes: number;
  sources: string[];
  lastRunAt?: string;
  nextRunAt?: string;
  totalItems: number;
  calendarEvents: number;
  liveGames: number;
  upcomingGames: number;
  tableRows: number;
  logos: number;
  rankings: number;
  statistics: number;
  corners: number;
  cards: number;
  goals: number;
  news: number;
  games: number;
  worldCupMatches: number;
  robotsSynced: number;
  lastError?: string;
};

export type MasterSearchRobotLogEntry = {
  id: string;
  robot: "master-search";
  level: "info" | "success" | "error";
  message: string;
  createdAt: string;
  totalItems?: number;
};

const MASTER_CACHE_TIME_MS = 1000 * 60 * 2;
const logs: MasterSearchRobotLogEntry[] = [];
let running = false;
let timer: NodeJS.Timeout | null = null;
let status: MasterSearchRobotStatus["status"] = "online";
let lastRunAt = "";
let nextRunAt = "";
let lastError = "";

let cache = {
  updatedAt: new Date().toISOString(),
  news: getCachedPublicNews(),
  games: getCachedGames(),
  worldCup: getCachedWorldCup(),
  calendar: getCachedCalendarRobot(),
  live: getCachedLiveRobot(),
  upcoming: getCachedUpcomingRobot(),
  brasileiraoTable: getCachedBrasileiraoTable(),
  logos: getCachedBrasileiraoLogos(),
  rankings: getCachedRankingRobot(),
  statistics: getCachedStatistics(),
  corners: getCachedCorners(),
  cards: getCachedCards(),
  goals: getCachedGoals(),
  source: "master-search-v31-global",
};

function addLog(level: MasterSearchRobotLogEntry["level"], message: string, totalItems?: number) {
  logs.unshift({
    id: `master-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    robot: "master-search",
    level,
    message,
    createdAt: new Date().toISOString(),
    totalItems,
  });
  if (logs.length > 150) logs.length = 150;
}

function scheduleNextRun() {
  nextRunAt = new Date(Date.now() + MASTER_CACHE_TIME_MS).toISOString();
}

function countRankingItems(data: any): number {
  const rankings = data?.rankings || {};
  return Object.values(rankings).reduce<number>((sum, value: any) => sum + (Array.isArray(value) ? value.length : 0), 0);
}

function countArray(value: any) {
  return Array.isArray(value) ? value.length : 0;
}

function countMasterItems(data: any) {
  return (data.calendar?.events?.length || 0)
    + (data.live?.games?.length || 0)
    + (data.upcoming?.games?.length || 0)
    + (data.brasileiraoTable?.teams?.length || data.brasileiraoTable?.standings?.length || 0)
    + countRankingItems(data.rankings)
    + (data.statistics?.opportunities?.length || 0)
    + (data.corners?.opportunities?.length || 0)
    + (data.cards?.opportunities?.length || 0)
    + (data.goals?.opportunities?.length || 0)
    + (data.news?.items?.length || 0)
    + countArray(data.games)
    + (data.worldCup?.matches?.length || 0);
}

function buildSnapshot() {
  const news = getCachedPublicNews();
  const games = getCachedGames();
  const worldCup = getCachedWorldCup();
  const calendar = getCachedCalendarRobot();
  const live = getCachedLiveRobot();
  const upcoming = getCachedUpcomingRobot();
  const brasileiraoTable = getCachedBrasileiraoTable();
  const logos = getCachedBrasileiraoLogos();
  const rankings = getCachedRankingRobot();
  const statistics = getCachedStatistics();
  const corners = getCachedCorners();
  const cards = getCachedCards();
  const goals = getCachedGoals();

  return {
    updatedAt: new Date().toISOString(),
    news,
    games,
    worldCup,
    calendar,
    live,
    upcoming,
    brasileiraoTable,
    logos,
    rankings,
    statistics,
    corners,
    cards,
    goals,
    source: "master-search-v31-global",
  };
}

export async function updateMasterSearchRobot(force = false) {
  if (running && !force) return cache;

  const age = Date.now() - new Date(cache.updatedAt).getTime();
  if (!force && age < MASTER_CACHE_TIME_MS) return cache;

  running = true;
  status = "running";
  lastError = "";
  addLog("info", "Busca Master Global iniciada: sincronizando calendário, ao vivo, próximos jogos, rankings, classificação, forma e escudos.");

  try {
    // Sequência master real: calendário e jogos base primeiro; depois ao vivo/próximos; depois Copa consome esses caches.
    await Promise.allSettled([
      updatePublicNews(force),
      updateGameRobot(force),
      updateCalendarRobot(force),
    ]);

    await Promise.allSettled([
      updateLiveRobot(force),
      updateUpcomingRobot(force),
    ]);

    const results = await Promise.allSettled([
      updateWorldCupRobot(force),
      updateBrasileiraoTableRobot(force),
      updateBrasileiraoLogoRobot(force),
      updateStatisticalRobot(force),
      updateCornerRobot(force),
      updateCardRobot(force),
      updateGoalRobot(force),
      updateRankingRobot(force),
    ]);

    const failed = results.filter((item) => item.status === "rejected");
    if (failed.length) {
      addLog("error", `Busca Master: ${failed.length} robô(s) falharam, usando cache local nos módulos afetados.`);
    }

    cache = buildSnapshot();
    lastRunAt = cache.updatedAt;
    scheduleNextRun();
    status = failed.length >= results.length ? "error" : "online";
    const total = countMasterItems(cache);

    addLog("success", `Busca Master Global atualizada com ${total} itens sincronizados.`, total);
    return cache;
  } catch (error) {
    status = "error";
    lastError = error instanceof Error ? error.message : "Erro desconhecido no Robô Master Global.";
    addLog("error", lastError);
    return cache;
  } finally {
    running = false;
  }
}

export function startMasterSearchRobot() {
  if (timer) return;
  scheduleNextRun();
  void updateMasterSearchRobot(false);
  timer = setInterval(() => void updateMasterSearchRobot(false), MASTER_CACHE_TIME_MS);
}

export function getCachedMasterSearchRobot() {
  return cache;
}

export function getMasterSearchRobotLogs() {
  return logs;
}

export function getMasterSearchRobotStatus(): MasterSearchRobotStatus {
  const totalItems = countMasterItems(cache);

  return {
    id: "master-search",
    name: "Robô Master Global de Busca",
    status,
    visibleToPublic: false,
    intervalMinutes: 2,
    sources: [
      "Notícias",
      "Jogos base",
      "Copa do Mundo Master Global",
      "Calendário Master",
      "Ao Vivo Multifontes",
      "Próximos Jogos",
      "Rankings Scanner",
      "Classificação Brasileirão",
      "Escudos + forma recente",
      "Estatísticas",
      "Gols",
      "Escanteios",
      "Cartões",
      "Cache central com fallback local",
    ],
    lastRunAt,
    nextRunAt,
    totalItems,
    calendarEvents: cache.calendar?.events?.length || 0,
    liveGames: cache.live?.games?.length || 0,
    upcomingGames: cache.upcoming?.games?.length || 0,
    tableRows: (cache.brasileiraoTable as any)?.teams?.length || cache.brasileiraoTable?.standings?.length || 0,
    logos: Array.isArray(cache.logos) ? cache.logos.length : Object.keys((cache.logos as any)?.logos || cache.logos || {}).length,
    rankings: countRankingItems(cache.rankings),
    statistics: cache.statistics?.opportunities?.length || 0,
    corners: cache.corners?.opportunities?.length || 0,
    cards: cache.cards?.opportunities?.length || 0,
    goals: cache.goals?.opportunities?.length || 0,
    news: cache.news?.items?.length || 0,
    games: countArray(cache.games),
    worldCupMatches: cache.worldCup?.matches?.length || 0,
    robotsSynced: 14,
    lastError,
  };
}

export function collectMasterSearchLogs() {
  return [
    ...logs,
    ...getNewsRobotLogs(),
    ...getGameRobotLogs(),
    ...getWorldCupRobotLogs(),
    ...getCalendarRobotLogs(),
    ...getLiveRobotLogs(),
    ...getUpcomingRobotLogs(),
    ...getBrasileiraoTableRobotLogs(),
    ...getBrasileiraoLogoRobotLogs(),
    ...getRankingRobotLogs(),
    ...getStatisticalRobotLogs(),
    ...getCornerRobotLogs(),
    ...getCardRobotLogs(),
    ...getGoalRobotLogs(),
  ].sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt));
}
