import type { Express, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { ApiUsageLimitError, apiUsageSnapshot, controlledApiFootballFetch, recordApiCacheHit, type ApiRequestPriority } from "./api-usage-control";
import { getFavoriteTeams, getUserByToken } from "./app-data";

const DEFAULT_API_BASE = "https://v3.football.api-sports.io";

type LastGame = {
  id: string;
  result: "V" | "E" | "D";
  home: string;
  away: string;
  score: string;
  league: string;
  date: string;
};

type UpcomingGame = {
  id: string;
  fixtureId: string;
  date: string;
  time: string;
  status: string;
  elapsed: number | null;
  league: string;
  leagueId?: number;
  season?: number;
  country?: string;
  home: string;
  away: string;
  homeId?: number;
  awayId?: number;
  homeLogo?: string;
  awayLogo?: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
  market: string;
  confidence: number | null;
  odd: string;
};

type CacheEntry = {
  expiresAt: number;
  data: any;
};

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 5; // cache padrão: 5 minutos
const LIVE_CACHE_TTL_MS = 1000 * 45; // ao vivo precisa ser rápido, mas sem gastar API em excesso
const STATIC_CACHE_TTL_MS = 1000 * 60 * 60 * 12; // escudos, ligas e dados estáveis
const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), ".data");
const apiCacheDir = path.join(dataDir, "api-football-cache");

function ensureApiCacheDir() {
  fs.mkdirSync(apiCacheDir, { recursive: true });
}

function diskCacheFile(key: string) {
  const safeName = Buffer.from(key).toString("base64url");
  return path.join(apiCacheDir, `${safeName}.json`);
}

function readDiskCache(key: string): CacheEntry | null {
  try {
    const file = diskCacheFile(key);
    if (!fs.existsSync(file)) return null;
    const entry = JSON.parse(fs.readFileSync(file, "utf8")) as CacheEntry;
    if (!entry?.expiresAt || entry.expiresAt <= Date.now()) {
      fs.rmSync(file, { force: true });
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function writeDiskCache(key: string, entry: CacheEntry) {
  try {
    ensureApiCacheDir();
    fs.writeFileSync(diskCacheFile(key), JSON.stringify(entry));
  } catch (error) {
    console.warn("Falha ao guardar cache persistente da API-Football:", error);
  }
}

function ttlForFootballRequest(pathname: string, params: Record<string, string | number | undefined>) {
  if (pathname === "/fixtures" && String(params.live || "").toLowerCase() === "all") return LIVE_CACHE_TTL_MS;
  if (pathname === "/fixtures/statistics") return LIVE_CACHE_TTL_MS;
  if (pathname === "/standings") return 1000 * 60 * 30;
  if (pathname === "/teams" || pathname === "/leagues") return STATIC_CACHE_TTL_MS;
  if (pathname === "/fixtures" && params.league && params.season && !params.date) return 1000 * 60 * 30;
  return CACHE_TTL_MS;
}

function apiBase() {
  return String(process.env.API_FOOTBALL_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/$/, "");
}

function apiKey() {
  return String(process.env.API_FOOTBALL_KEY || process.env.API_KEY || "").trim();
}

function todayBrazil() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

function statusPriority(status: string) {
  const value = String(status || "NS").toUpperCase();
  if (["1H", "2H", "HT", "ET", "BT", "P", "LIVE", "INT"].includes(value)) return 0;
  if (["NS", "TBD"].includes(value)) return 1;
  if (["PST", "SUSP", "INT", "CANC", "ABD", "AWD", "WO"].includes(value)) return 2;
  return 3;
}

function fixtureTimestamp(game: UpcomingGame) {
  const t = new Date(game.date).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function isFinishedStatus(status: string) {
  return ["FT", "AET", "PEN"].includes(String(status || "").toUpperCase());
}

function proxiedLogo(url: unknown) {
  const value = String(url || "").trim();
  if (!value) return undefined;
  return `/api/football/logo?url=${encodeURIComponent(value)}`;
}

function cacheKey(path: string, params: Record<string, string | number | undefined>) {
  const clean = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && String(value) !== "")
    .sort(([a], [b]) => a.localeCompare(b));
  return `${path}?${JSON.stringify(clean)}`;
}

async function footballGet(path: string, params: Record<string, string | number | undefined> = {}, priority: ApiRequestPriority = "standard") {
  const key = apiKey();
  if (!key) throw new Error("API_FOOTBALL_KEY não configurada no Railway/.env.");

  const keyCache = cacheKey(path, params);
  const cached = cache.get(keyCache);
  if (cached && cached.expiresAt > Date.now()) {
    recordApiCacheHit(path);
    return cached.data;
  }

  const diskCached = readDiskCache(keyCache);
  if (diskCached) {
    cache.set(keyCache, diskCached);
    recordApiCacheHit(path);
    return diskCached.data;
  }

  const url = new URL(`${apiBase()}${path}`);
  Object.entries(params).forEach(([name, value]) => {
    if (value !== undefined && value !== null && String(value) !== "") {
      url.searchParams.set(name, String(value));
    }
  });

  const response = await controlledApiFootballFetch(url.toString(), {
    headers: {
      "x-apisports-key": key,
      accept: "application/json",
    },
  }, path, priority);

  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Resposta inválida da API-Football: ${text.slice(0, 160)}`);
  }

  if (!response.ok) {
    throw new Error(`API-Football HTTP ${response.status}: ${JSON.stringify(data?.errors || data).slice(0, 220)}`);
  }

  if (data?.errors && Object.keys(data.errors).length) {
    throw new Error(`API-Football: ${JSON.stringify(data.errors)}`);
  }

  const entry = { expiresAt: Date.now() + ttlForFootballRequest(path, params), data };
  cache.set(keyCache, entry);
  writeDiskCache(keyCache, entry);
  return data;
}

function finished(fixture: any) {
  const short = String(fixture?.fixture?.status?.short || "").toUpperCase();
  return ["FT", "AET", "PEN"].includes(short) && fixture?.goals?.home != null && fixture?.goals?.away != null;
}

function toLastGame(fixture: any, teamId: number): LastGame | null {
  if (!finished(fixture)) return null;
  const home = fixture?.teams?.home;
  const away = fixture?.teams?.away;
  const goals = fixture?.goals;
  if (!home || !away || goals?.home == null || goals?.away == null) return null;

  const isHome = Number(home.id) === Number(teamId);
  const gf = isHome ? Number(goals.home) : Number(goals.away);
  const ga = isHome ? Number(goals.away) : Number(goals.home);
  const result: "V" | "E" | "D" = gf > ga ? "V" : gf === ga ? "E" : "D";

  return {
    id: String(fixture?.fixture?.id || `${teamId}-${fixture?.fixture?.date}`),
    result,
    home: String(home.name || "Mandante"),
    away: String(away.name || "Visitante"),
    score: `${goals.home} x ${goals.away}`,
    league: String(fixture?.league?.name || "Competição"),
    date: String(fixture?.fixture?.date || new Date().toISOString()),
  };
}

async function lastGames(teamId: number, limit = 5) {
  const data = await footballGet("/fixtures", { team: teamId, last: Math.max(5, Math.min(15, limit * 2)) });
  const fixtures = Array.isArray(data?.response) ? data.response : [];
  return fixtures
    .map((fixture: any) => toLastGame(fixture, teamId))
    .filter(Boolean)
    .slice(0, limit) as LastGame[];
}

function toGame(fixture: any): UpcomingGame | null {
  const home = fixture?.teams?.home;
  const away = fixture?.teams?.away;
  const date = fixture?.fixture?.date;
  if (!home || !away || !date) return null;
  const d = new Date(date);
  const status = String(fixture?.fixture?.status?.short || "NS");
  return {
    id: String(fixture?.fixture?.id || `${home.name}-${away.name}-${date}`),
    fixtureId: String(fixture?.fixture?.id || ""),
    date,
    time: Number.isNaN(d.getTime()) ? "--:--" : d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }),
    status,
    elapsed: fixture?.fixture?.status?.elapsed ?? null,
    league: String(fixture?.league?.name || "Competição"),
    leagueId: fixture?.league?.id,
    season: fixture?.league?.season,
    country: fixture?.league?.country,
    home: String(home.name || "Mandante"),
    away: String(away.name || "Visitante"),
    homeId: home.id,
    awayId: away.id,
    homeLogo: proxiedLogo(home.logo),
    awayLogo: proxiedLogo(away.logo),
    homeGoals: fixture?.goals?.home ?? null,
    awayGoals: fixture?.goals?.away ?? null,
    market: status === "NS" ? "Aguardando análise" : "Ao vivo/finalizado",
    confidence: null,
    odd: "N/D",
  };
}

async function fixturesByDate(date: string, limit = 50, onlyOpen = true) {
  const data = await footballGet("/fixtures", { date });
  const fixtures = Array.isArray(data?.response) ? data.response : [];
  const games = fixtures.map(toGame).filter(Boolean) as UpcomingGame[];
  const filtered = onlyOpen ? games.filter((game) => !isFinishedStatus(game.status)) : games;
  return filtered
    .sort((a, b) => statusPriority(a.status) - statusPriority(b.status) || fixtureTimestamp(a) - fixtureTimestamp(b))
    .slice(0, Math.max(1, Math.min(100, limit)));
}

async function upcomingGames(limit = 18) {
  const data = await footballGet("/fixtures", { next: Math.max(10, Math.min(40, limit)) });
  const fixtures = Array.isArray(data?.response) ? data.response : [];
  return fixtures.map(toGame).filter(Boolean).slice(0, limit) as UpcomingGame[];
}


type ReportAccess = "FREE" | "PRO" | "VIP";

type DailyReport = {
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
  access: ReportAccess;
};

type TeamReportMetrics = {
  goalsForAvg: number;
  goalsAgainstAvg: number;
  homeWinRate: number;
  awayWinRate: number;
  cleanSheets: number;
  failedToScore: number;
  formText: string;
  bttsCount: number;
  totalGoalsRecent: number;
};

const reportsCache = new Map<string, { expiresAt: number; data: DailyReport[] }>();
const REPORTS_CACHE_TTL_MS = 1000 * 60 * 10;

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function percentage(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function average(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function seasonFromGame(game: UpcomingGame) {
  if (game.season) return Number(game.season);
  const parsed = new Date(game.date);
  return Number.isNaN(parsed.getTime()) ? new Date().getFullYear() : parsed.getFullYear();
}

function buildFormText(last: LastGame[]) {
  const wins = last.filter((item) => item.result === "V").length;
  const draws = last.filter((item) => item.result === "E").length;
  const losses = last.filter((item) => item.result === "D").length;
  const chunks: string[] = [];
  if (wins) chunks.push(`${wins}V`);
  if (draws) chunks.push(`${draws}E`);
  if (losses) chunks.push(`${losses}D`);
  return chunks.length ? chunks.join(" • ") : "Sem histórico";
}

function teamGoalsForFromLast(last: LastGame[], teamName: string) {
  return last.map((item) => {
    const [homeScore, awayScore] = String(item.score || "0 x 0").split(" x ").map((value) => numberValue(value));
    return item.home === teamName ? homeScore : awayScore;
  });
}

function teamGoalsAgainstFromLast(last: LastGame[], teamName: string) {
  return last.map((item) => {
    const [homeScore, awayScore] = String(item.score || "0 x 0").split(" x ").map((value) => numberValue(value));
    return item.home === teamName ? awayScore : homeScore;
  });
}

async function teamReportMetrics(teamId: number, teamName: string, leagueId: number | undefined, season: number): Promise<TeamReportMetrics> {
  const [statsData, recent] = await Promise.all([
    leagueId ? footballGet("/teams/statistics", { team: teamId, league: leagueId, season }, "standard").catch(() => null) : Promise.resolve(null),
    lastGames(teamId, 5).catch(() => [] as LastGame[]),
  ]);

  const stats = statsData?.response || {};
  const goalsForAvg = numberValue(stats?.goals?.for?.average?.total, average(teamGoalsForFromLast(recent, teamName)));
  const goalsAgainstAvg = numberValue(stats?.goals?.against?.average?.total, average(teamGoalsAgainstFromLast(recent, teamName)));
  const playedHome = numberValue(stats?.fixtures?.played?.home);
  const playedAway = numberValue(stats?.fixtures?.played?.away);
  const homeWinRate = percentage(numberValue(stats?.fixtures?.wins?.home), playedHome);
  const awayWinRate = percentage(numberValue(stats?.fixtures?.wins?.away), playedAway);
  const cleanSheets = numberValue(stats?.clean_sheet?.total);
  const failedToScore = numberValue(stats?.failed_to_score?.total);

  let bttsCount = 0;
  let totalGoalsRecent = 0;
  recent.forEach((item) => {
    const [homeScore, awayScore] = String(item.score || "0 x 0").split(" x ").map((value) => numberValue(value));
    if (homeScore > 0 && awayScore > 0) bttsCount += 1;
    totalGoalsRecent += homeScore + awayScore;
  });

  return {
    goalsForAvg,
    goalsAgainstAvg,
    homeWinRate,
    awayWinRate,
    cleanSheets,
    failedToScore,
    formText: buildFormText(recent),
    bttsCount,
    totalGoalsRecent,
  };
}

function reportAccessByIndex(index: number): ReportAccess {
  if (index <= 4) return "FREE";
  if (index <= 7) return "PRO";
  return "VIP";
}

function formatDecimalBR(value: number) {
  return value.toFixed(1).replace(".", ",");
}

function reportConfidence(index: number, homeMetrics: TeamReportMetrics, awayMetrics: TeamReportMetrics) {
  const dataScore = Math.min(10, Math.round((homeMetrics.cleanSheets + awayMetrics.cleanSheets + 4) / 2));
  const base = 79 + (index % 5) + dataScore;
  return Math.max(80, Math.min(96, base));
}

function buildReportForGame(game: UpcomingGame, homeMetrics: TeamReportMetrics, awayMetrics: TeamReportMetrics, index: number): DailyReport {
  const type = index % 7;
  let indicator = "Média de gols recentes";
  let value = formatDecimalBR(average([
    homeMetrics.totalGoalsRecent / 5 || 0,
    awayMetrics.totalGoalsRecent / 5 || 0,
  ]));

  if (type === 1) {
    indicator = "Jogos com gol das duas equipes";
    value = `${homeMetrics.bttsCount + awayMetrics.bttsCount}/10`;
  } else if (type === 2) {
    indicator = "Aproveitamento em casa";
    value = `${homeMetrics.homeWinRate || 0}%`;
  } else if (type === 3) {
    indicator = "Média de gols do confronto";
    value = formatDecimalBR(homeMetrics.goalsForAvg + awayMetrics.goalsForAvg);
  } else if (type === 4) {
    indicator = "Média de gols sofridos";
    value = formatDecimalBR(average([homeMetrics.goalsAgainstAvg, awayMetrics.goalsAgainstAvg]));
  } else if (type === 5) {
    indicator = "Forma recente do mandante";
    value = homeMetrics.formText;
  } else if (type === 6) {
    indicator = "Forma recente combinada";
    value = homeMetrics.formText === awayMetrics.formText ? homeMetrics.formText : `${homeMetrics.formText} • ${awayMetrics.formText}`;
  }

  return {
    id: `report-${game.fixtureId || game.id}`,
    league: game.league,
    time: game.time,
    home: game.home,
    away: game.away,
    homeLogo: game.homeLogo,
    awayLogo: game.awayLogo,
    indicator,
    value,
    confidence: reportConfidence(index, homeMetrics, awayMetrics),
    access: reportAccessByIndex(index),
  };
}

async function buildDailyReports(limit = 10) {
  const key = `reports:${todayBrazil()}:${limit}`;
  const cached = reportsCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    recordApiCacheHit("reports:daily");
    return cached.data;
  }

  let games = await fixturesByDate(todayBrazil(), Math.max(limit * 2, 14), false).catch(() => [] as UpcomingGame[]);
  if (games.length < limit) {
    const nextGames = await upcomingGames(Math.max(limit * 2, 14)).catch(() => [] as UpcomingGame[]);
    const map = new Map<string, UpcomingGame>();
    [...games, ...nextGames].forEach((game) => map.set(game.id, game));
    games = Array.from(map.values());
  }

  const selected = games.slice(0, limit);
  const reports = await Promise.all(selected.map(async (game, index) => {
    if (!game.homeId || !game.awayId) {
      return {
        id: `report-${game.id}`,
        league: game.league,
        time: game.time,
        home: game.home,
        away: game.away,
        homeLogo: game.homeLogo,
        awayLogo: game.awayLogo,
        indicator: "Leitura estatística inicial",
        value: "N/D",
        confidence: 80,
        access: reportAccessByIndex(index),
      } as DailyReport;
    }

    try {
      const season = seasonFromGame(game);
      const [homeMetrics, awayMetrics] = await Promise.all([
        teamReportMetrics(game.homeId, game.home, game.leagueId, season),
        teamReportMetrics(game.awayId, game.away, game.leagueId, season),
      ]);
      return buildReportForGame(game, homeMetrics, awayMetrics, index);
    } catch {
      return {
        id: `report-${game.id}`,
        league: game.league,
        time: game.time,
        home: game.home,
        away: game.away,
        homeLogo: game.homeLogo,
        awayLogo: game.awayLogo,
        indicator: "Leitura estatística inicial",
        value: "N/D",
        confidence: 80,
        access: reportAccessByIndex(index),
      } as DailyReport;
    }
  }));

  reportsCache.set(key, { expiresAt: Date.now() + REPORTS_CACHE_TTL_MS, data: reports });
  return reports;
}


type FootballRankingType = "goals" | "both-scored" | "corners" | "quality";

type FootballRankingItem = {
  fixtureId: string;
  date: string;
  time: string;
  league: string;
  country?: string;
  home: string;
  away: string;
  homeId?: number;
  awayId?: number;
  homeLogo?: string;
  awayLogo?: string;
  value: number;
  displayValue: string;
  sampleSize: number;
  averageGoals: number;
  bothScoredPct: number;
  averageCorners: number | null;
  quality: number;
};

const rankingCache = new Map<string, CacheEntry>();
const RANKING_CACHE_TTL_MS = 1000 * 60 * 10;

function normalizeRankingType(value: unknown): FootballRankingType {
  const type = String(value || "goals").toLowerCase();
  if (type === "both-scored" || type === "btts") return "both-scored";
  if (type === "corners") return "corners";
  if (type === "quality" || type === "confidence") return "quality";
  return "goals";
}

function rounded(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function fixtureGoals(fixture: any) {
  const home = Number(fixture?.goals?.home);
  const away = Number(fixture?.goals?.away);
  return Number.isFinite(home) && Number.isFinite(away) ? { home, away } : null;
}

async function recentFinishedFixtures(teamId: number, limit = 4) {
  const data = await footballGet("/fixtures", { team: teamId, last: Math.max(limit * 2, 8) });
  const fixtures = Array.isArray(data?.response) ? data.response : [];
  return fixtures.filter(finished).slice(0, limit);
}

function dedupeRawFixtures(fixtures: any[]) {
  const byId = new Map<string, any>();
  fixtures.forEach((fixture) => {
    const id = String(fixture?.fixture?.id || "");
    if (id && !byId.has(id)) byId.set(id, fixture);
  });
  return [...byId.values()];
}

async function totalCornersForFixture(fixtureId: string) {
  const data = await footballGet("/fixtures/statistics", { fixture: fixtureId });
  const stats = Array.isArray(data?.response) ? data.response : [];
  const parsed = parseFixtureStats(stats);
  const home = parsed.corners[0];
  const away = parsed.corners[1];
  return typeof home === "number" && typeof away === "number" ? home + away : null;
}

function metricDisplay(type: FootballRankingType, item: Omit<FootballRankingItem, "value" | "displayValue">) {
  if (type === "both-scored") return { value: item.bothScoredPct, displayValue: `${Math.round(item.bothScoredPct)}%` };
  if (type === "corners") return { value: item.averageCorners || 0, displayValue: item.averageCorners == null ? "--" : item.averageCorners.toFixed(1).replace(".", ",") };
  if (type === "quality") return { value: item.quality, displayValue: `${Math.round(item.quality)}%` };
  return { value: item.averageGoals, displayValue: item.averageGoals.toFixed(2).replace(".", ",") };
}

async function calculateRankingItem(game: UpcomingGame, type: FootballRankingType): Promise<FootballRankingItem | null> {
  if (!game.homeId || !game.awayId) return null;

  const [homeFixtures, awayFixtures] = await Promise.all([
    recentFinishedFixtures(game.homeId, 4),
    recentFinishedFixtures(game.awayId, 4),
  ]);

  const sample = dedupeRawFixtures([...homeFixtures, ...awayFixtures]);
  if (!sample.length) return null;

  const scored = sample.map(fixtureGoals).filter(Boolean) as Array<{ home: number; away: number }>;
  if (!scored.length) return null;

  const totalGoals = scored.reduce((sum, fixture) => sum + fixture.home + fixture.away, 0);
  const bothScored = scored.filter((fixture) => fixture.home > 0 && fixture.away > 0).length;
  const averageGoals = rounded(totalGoals / scored.length, 2);
  const bothScoredPct = rounded((bothScored / scored.length) * 100, 0);

  let averageCorners: number | null = null;
  let cornerSamples = 0;
  if (type === "corners") {
    const corners = await Promise.all(
      sample.slice(0, 3).map((fixture) => totalCornersForFixture(String(fixture.fixture.id))),
    );
    const available = corners.filter((value): value is number => typeof value === "number");
    cornerSamples = available.length;
    averageCorners = available.length ? rounded(available.reduce((sum, value) => sum + value, 0) / available.length, 1) : null;
  }

  const quality = Math.min(98, Math.round(48 + scored.length * 6 + (type === "corners" ? cornerSamples * 7 : 0)));

  const base = {
    fixtureId: game.fixtureId,
    date: game.date,
    time: game.time,
    league: game.league,
    country: game.country,
    home: game.home,
    away: game.away,
    homeId: game.homeId,
    awayId: game.awayId,
    homeLogo: game.homeLogo,
    awayLogo: game.awayLogo,
    sampleSize: scored.length,
    averageGoals,
    bothScoredPct,
    averageCorners,
    quality,
  };

  return { ...base, ...metricDisplay(type, base) };
}

async function buildFootballRanking(type: FootballRankingType, limit = 8) {
  const safeLimit = Math.max(4, Math.min(8, limit));
  const key = `rankings:${type}:${safeLimit}`;
  const cached = rankingCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    recordApiCacheHit(`ranking:${type}`);
    return cached.data;
  }

  const games = await upcomingGames(safeLimit);
  const items = (await Promise.all(games.map((game) => calculateRankingItem(game, type))))
    .filter(Boolean) as FootballRankingItem[];

  const result = items.sort((a, b) => b.value - a.value || b.quality - a.quality).slice(0, safeLimit);
  rankingCache.set(key, { expiresAt: Date.now() + RANKING_CACHE_TTL_MS, data: result });
  return result;
}


type StatisticsDashboardLeague = {
  id: number;
  name: string;
  country?: string;
  games: number;
};

type StatisticsDashboardData = {
  date: string;
  leagueId: number | null;
  leagues: StatisticsDashboardLeague[];
  totalGames: number;
  liveGames: number;
  finishedGames: number;
  scoredGames: number;
  averageGoals: number | null;
  bothScoredPct: number | null;
  averageCorners: number | null;
  cornerSamples: number;
  quality: number;
  matches: UpcomingGame[];
};

const statisticsDashboardCache = new Map<string, CacheEntry>();
const STATISTICS_DASHBOARD_TTL_MS = 1000 * 60 * 10;

function dashboardLiveStatus(status: string) {
  return ["1H", "2H", "HT", "ET", "BT", "P", "LIVE", "INT"].includes(String(status || "").toUpperCase());
}

async function buildStatisticsDashboard(date: string, leagueId?: number): Promise<StatisticsDashboardData> {
  const dashboardKey = `statistics:${date}:${leagueId || "all"}`;
  const saved = statisticsDashboardCache.get(dashboardKey);
  if (saved && saved.expiresAt > Date.now()) {
    recordApiCacheHit("statistics:dashboard");
    return saved.data as StatisticsDashboardData;
  }

  const response = await footballGet("/fixtures", { date });
  const rawFixtures = Array.isArray(response?.response) ? response.response : [];
  const allGames = rawFixtures.map(toGame).filter(Boolean) as UpcomingGame[];

  const leagueMap = new Map<number, StatisticsDashboardLeague>();
  allGames.forEach((game) => {
    if (!game.leagueId) return;
    const previous = leagueMap.get(game.leagueId);
    if (previous) previous.games += 1;
    else leagueMap.set(game.leagueId, { id: game.leagueId, name: game.league, country: game.country, games: 1 });
  });

  const matches = leagueId ? allGames.filter((game) => game.leagueId === leagueId) : allGames;
  const fixtureIds = new Set(matches.map((game) => game.fixtureId));
  const selectedRaw = rawFixtures.filter((fixture: any) => fixtureIds.has(String(fixture?.fixture?.id || "")));
  const scoredFixtures = selectedRaw
    .map(fixtureGoals)
    .filter(Boolean) as Array<{ home: number; away: number }>;

  const totalGoals = scoredFixtures.reduce((sum, game) => sum + game.home + game.away, 0);
  const bothScored = scoredFixtures.filter((game) => game.home > 0 && game.away > 0).length;

  const statsTargets = matches
    .filter((game) => game.fixtureId && (dashboardLiveStatus(game.status) || isFinishedStatus(game.status)))
    .slice(0, 4);

  const cornerValues = (await Promise.all(
    statsTargets.map((game) => totalCornersForFixture(game.fixtureId))
  )).filter((value): value is number => typeof value === "number");

  const availableMatchCoverage = matches.length
    ? Math.min(100, Math.round((scoredFixtures.length / matches.length) * 100))
    : 0;
  const cornerCoverage = statsTargets.length
    ? Math.round((cornerValues.length / statsTargets.length) * 100)
    : 0;
  const quality = matches.length
    ? Math.round(availableMatchCoverage * 0.7 + cornerCoverage * 0.3)
    : 0;

  const dashboard: StatisticsDashboardData = {
    date,
    leagueId: leagueId || null,
    leagues: [...leagueMap.values()].sort((a, b) => b.games - a.games || a.name.localeCompare(b.name)),
    totalGames: matches.length,
    liveGames: matches.filter((game) => dashboardLiveStatus(game.status)).length,
    finishedGames: matches.filter((game) => isFinishedStatus(game.status)).length,
    scoredGames: scoredFixtures.length,
    averageGoals: scoredFixtures.length ? rounded(totalGoals / scoredFixtures.length, 2) : null,
    bothScoredPct: scoredFixtures.length ? rounded((bothScored / scoredFixtures.length) * 100, 0) : null,
    averageCorners: cornerValues.length ? rounded(cornerValues.reduce((sum, value) => sum + value, 0) / cornerValues.length, 1) : null,
    cornerSamples: cornerValues.length,
    quality,
    matches: matches.slice(0, 12),
  };

  statisticsDashboardCache.set(dashboardKey, { expiresAt: Date.now() + STATISTICS_DASHBOARD_TTL_MS, data: dashboard });
  return dashboard;
}


const WORLD_CUP_LEAGUE_ID = 1;
const WORLD_CUP_SEASON = 2026;
const worldCupCache = new Map<string, CacheEntry>();
const WORLD_CUP_CACHE_TTL_MS = 1000 * 60 * 10;

type WorldCupMatch = UpcomingGame & {
  round: string;
  stadium?: string;
  city?: string;
};

type WorldCupStandingRow = {
  rank: number;
  teamId?: number;
  team: string;
  logo?: string;
  points: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDiff: number;
  form?: string;
};

type WorldCupGroup = {
  name: string;
  rows: WorldCupStandingRow[];
};

function worldCupStage(round: string) {
  const normalized = String(round || "").toLowerCase();
  if (normalized.includes("group")) return "group";
  if (normalized.includes("round of 32")) return "round32";
  if (normalized.includes("round of 16")) return "round16";
  if (normalized.includes("quarter")) return "quarter";
  if (normalized.includes("semi")) return "semi";
  if (normalized.includes("third")) return "third";
  if (normalized.includes("final")) return "final";
  return "other";
}

function toWorldCupMatch(fixture: any): WorldCupMatch | null {
  const game = toGame(fixture);
  if (!game) return null;
  return {
    ...game,
    round: String(fixture?.league?.round || "Fase a definir"),
    stadium: fixture?.fixture?.venue?.name ? String(fixture.fixture.venue.name) : undefined,
    city: fixture?.fixture?.venue?.city ? String(fixture.fixture.venue.city) : undefined,
  };
}

function parseWorldCupGroups(raw: any): WorldCupGroup[] {
  const standingGroups = raw?.response?.[0]?.league?.standings;
  if (!Array.isArray(standingGroups)) return [];

  return standingGroups
    .filter((rows: any) => Array.isArray(rows))
    .map((rows: any[]) => {
      const groupName = String(rows?.[0]?.group || "Grupo");
      return {
        name: groupName,
        rows: rows.map((row: any) => ({
          rank: Number(row?.rank || 0),
          teamId: row?.team?.id ? Number(row.team.id) : undefined,
          team: String(row?.team?.name || "Seleção"),
          logo: proxiedLogo(row?.team?.logo),
          points: Number(row?.points || 0),
          played: Number(row?.all?.played || 0),
          win: Number(row?.all?.win || 0),
          draw: Number(row?.all?.draw || 0),
          lose: Number(row?.all?.lose || 0),
          goalsFor: Number(row?.all?.goals?.for || 0),
          goalsAgainst: Number(row?.all?.goals?.against || 0),
          goalsDiff: Number(row?.goalsDiff || 0),
          form: row?.form ? String(row.form) : undefined,
        })),
      };
    });
}



type QualifiedWorldCupTeam = WorldCupStandingRow & {
  groupName: string;
  seedLabel: string;
  sourceRank: number;
};

function normalizeGroupLetter(groupName: string) {
  const match = String(groupName || "").match(/([A-L])\s*$/i);
  return match ? match[1].toUpperCase() : String(groupName || "Grupo").replace(/^.*?(\w+)$/, "$1").toUpperCase();
}

function compareQualifiedTeams(a: QualifiedWorldCupTeam, b: QualifiedWorldCupTeam) {
  return (
    b.points - a.points ||
    b.goalsDiff - a.goalsDiff ||
    b.goalsFor - a.goalsFor ||
    a.goalsAgainst - b.goalsAgainst ||
    a.team.localeCompare(b.team)
  );
}

function isWorldCupPlaceholderName(name?: string) {
  const value = String(name || "").toLowerCase();
  return (
    !value ||
    value.includes("mandante") ||
    value.includes("visitante") ||
    value.includes("a definir") ||
    value.includes("tbd") ||
    value.includes("vencedor") ||
    value.includes("winner") ||
    value.includes("16 avos") ||
    value.includes("repescagem") ||
    value.includes("playoff")
  );
}

function worldCupQualifiedTeams(groups: WorldCupGroup[]) {
  const winners: QualifiedWorldCupTeam[] = [];
  const runners: QualifiedWorldCupTeam[] = [];
  const thirds: QualifiedWorldCupTeam[] = [];

  groups.forEach((group) => {
    const letter = normalizeGroupLetter(group.name);
    const ordered = [...group.rows].sort((a, b) => a.rank - b.rank);
    ordered.forEach((row) => {
      if (!row.team) return;
      const qualified: QualifiedWorldCupTeam = {
        ...row,
        groupName: group.name,
        sourceRank: row.rank,
        seedLabel: `${row.rank}º ${letter}`,
      };
      if (row.rank === 1) winners.push(qualified);
      if (row.rank === 2) runners.push(qualified);
      if (row.rank === 3) thirds.push(qualified);
    });
  });

  const bestThirds = thirds.sort(compareQualifiedTeams).slice(0, 8);
  return [...winners.sort(compareQualifiedTeams), ...runners.sort(compareQualifiedTeams), ...bestThirds].slice(0, 32);
}

function buildProjectedRound32(groups: WorldCupGroup[], baseMatches: WorldCupMatch[]) {
  const qualified = worldCupQualifiedTeams(groups);
  if (qualified.length < 16) return [];

  const seeded = [...qualified].sort((a, b) => {
    return a.sourceRank - b.sourceRank || compareQualifiedTeams(a, b);
  });

  const rounds = baseMatches.filter((match) => worldCupStage(match.round) === "round32");
  const totalGames = Math.min(rounds.length || 16, Math.floor(seeded.length / 2));

  return Array.from({ length: totalGames }).map((_, index) => {
    const base = rounds[index];
    const home = seeded[index];
    const away = seeded[seeded.length - 1 - index];
    const gameDate = base?.date || new Date(Date.UTC(2026, 6, 15, 16 + (index % 4) * 2, 0, 0)).toISOString();
    return {
      ...(base || {}),
      fixtureId: base?.fixtureId || `wc2026-r32-projected-${index + 1}`,
      date: gameDate,
      time: base?.time || new Date(gameDate).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
      status: base?.status || "NS",
      elapsed: base?.elapsed ?? null,
      league: base?.league || "Copa do Mundo 2026",
      round: base?.round || `16 avos ${index + 1}`,
      stadium: base?.stadium,
      city: base?.city,
      home: home?.team || `Classificado ${index + 1}`,
      away: away?.team || `Classificado ${seeded.length - index}`,
      homeId: home?.teamId,
      awayId: away?.teamId,
      homeLogo: home?.logo,
      awayLogo: away?.logo,
      homeGoals: base?.homeGoals ?? null,
      awayGoals: base?.awayGoals ?? null,
    } as WorldCupMatch;
  });
}

function enrichWorldCupKnockout(matches: WorldCupMatch[], groups: WorldCupGroup[]) {
  const knockout = matches.filter((match) => worldCupStage(match.round) !== "group");
  const hasRound32Placeholders = knockout.some((match) =>
    worldCupStage(match.round) === "round32" &&
    (isWorldCupPlaceholderName(match.home) || isWorldCupPlaceholderName(match.away))
  );

  if (!hasRound32Placeholders) return knockout;

  const projectedRound32 = buildProjectedRound32(groups, knockout);
  if (!projectedRound32.length) return knockout;

  let round32Index = 0;
  return knockout.map((match) => {
    if (worldCupStage(match.round) !== "round32") return match;
    const projected = projectedRound32[round32Index++];
    return projected || match;
  });
}

async function buildWorldCupDashboard() {
  const key = `world-cup:${WORLD_CUP_SEASON}`;
  const cached = worldCupCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    recordApiCacheHit("world-cup:dashboard");
    return cached.data;
  }

  const [fixturesData, standingsData] = await Promise.all([
    footballGet("/fixtures", { league: WORLD_CUP_LEAGUE_ID, season: WORLD_CUP_SEASON }, "standard"),
    footballGet("/standings", { league: WORLD_CUP_LEAGUE_ID, season: WORLD_CUP_SEASON }, "standard"),
  ]);

  const fixtures = Array.isArray(fixturesData?.response) ? fixturesData.response : [];
  const matches = fixtures
    .map((fixture: any) => toWorldCupMatch(fixture))
    .filter(Boolean)
    .sort((a: WorldCupMatch, b: WorldCupMatch) => new Date(a.date).getTime() - new Date(b.date).getTime()) as WorldCupMatch[];

  const completed = matches.filter((match) => isFinishedStatus(match.status));
  const live = matches.filter((match) => dashboardLiveStatus(match.status));
  const upcoming = matches.filter((match) => !isFinishedStatus(match.status) && !dashboardLiveStatus(match.status));
  const groupGames = matches.filter((match) => worldCupStage(match.round) === "group");
  const groups = parseWorldCupGroups(standingsData);
  const knockout = enrichWorldCupKnockout(matches, groups);

  const data = {
    leagueId: WORLD_CUP_LEAGUE_ID,
    season: WORLD_CUP_SEASON,
    title: "Copa do Mundo 2026",
    matches,
    groupGames,
    knockout,
    groups,
    totals: {
      matches: matches.length,
      completed: completed.length,
      live: live.length,
      upcoming: upcoming.length,
      groups: groups.length,
    },
    stageLabels: {
      group: "Fase de grupos",
      round32: "16 avos",
      round16: "Oitavas",
      quarter: "Quartas",
      semi: "Semifinais",
      third: "3º Lugar",
      final: "Final",
      other: "Outros",
    },
    updatedAt: new Date().toISOString(),
  };

  worldCupCache.set(key, { expiresAt: Date.now() + WORLD_CUP_CACHE_TTL_MS, data });
  return data;
}


const BRASILEIRAO_SERIE_A_LEAGUE_ID = 71;
const BRASILEIRAO_SEASON = 2026;
const brasileiraoCache = new Map<string, CacheEntry>();
const BRASILEIRAO_CACHE_TTL_MS = 1000 * 60 * 30;

type BrasileiraoStandingRow = {
  rank: number;
  teamId?: number;
  team: string;
  logo?: string;
  points: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDiff: number;
  form?: string;
};

type BrasileiraoMatch = UpcomingGame & {
  round: string;
  stadium?: string;
  city?: string;
};

function toBrasileiraoMatch(fixture: any): BrasileiraoMatch | null {
  const game = toGame(fixture);
  if (!game) return null;
  return {
    ...game,
    round: String(fixture?.league?.round || "Rodada a definir"),
    stadium: fixture?.fixture?.venue?.name ? String(fixture.fixture.venue.name) : undefined,
    city: fixture?.fixture?.venue?.city ? String(fixture.fixture.venue.city) : undefined,
  };
}

function parseBrasileiraoStandings(raw: any): BrasileiraoStandingRow[] {
  const rows = raw?.response?.[0]?.league?.standings?.[0];
  if (!Array.isArray(rows)) return [];

  return rows.map((row: any) => ({
    rank: Number(row?.rank || 0),
    teamId: row?.team?.id ? Number(row.team.id) : undefined,
    team: String(row?.team?.name || "Clube"),
    logo: proxiedLogo(row?.team?.logo),
    points: Number(row?.points || 0),
    played: Number(row?.all?.played || 0),
    win: Number(row?.all?.win || 0),
    draw: Number(row?.all?.draw || 0),
    lose: Number(row?.all?.lose || 0),
    goalsFor: Number(row?.all?.goals?.for || 0),
    goalsAgainst: Number(row?.all?.goals?.against || 0),
    goalsDiff: Number(row?.goalsDiff || 0),
    form: row?.form ? String(row.form) : undefined,
  }));
}

function brasileiraoFallbackTeams() {
  return [
    { team: "Flamengo", logo: "https://media.api-sports.io/football/teams/127.png" },
    { team: "Palmeiras", logo: "https://media.api-sports.io/football/teams/121.png" },
    { team: "São Paulo", logo: "https://media.api-sports.io/football/teams/126.png" },
    { team: "Corinthians", logo: "https://media.api-sports.io/football/teams/131.png" },
    { team: "Santos", logo: "https://media.api-sports.io/football/teams/128.png" },
    { team: "Vasco", logo: "https://media.api-sports.io/football/teams/133.png" },
    { team: "Botafogo", logo: "https://media.api-sports.io/football/teams/120.png" },
    { team: "Fluminense", logo: "https://media.api-sports.io/football/teams/124.png" },
    { team: "Grêmio", logo: "https://media.api-sports.io/football/teams/130.png" },
    { team: "Internacional", logo: "https://media.api-sports.io/football/teams/119.png" },
    { team: "Atlético-MG", logo: "https://media.api-sports.io/football/teams/1062.png" },
    { team: "Cruzeiro", logo: "https://media.api-sports.io/football/teams/135.png" },
    { team: "Athletico-PR", logo: "https://media.api-sports.io/football/teams/134.png" },
    { team: "Bahia", logo: "https://media.api-sports.io/football/teams/118.png" },
    { team: "Fortaleza", logo: "https://media.api-sports.io/football/teams/154.png" },
    { team: "Ceará", logo: "https://media.api-sports.io/football/teams/129.png" },
    { team: "Vitória", logo: "https://media.api-sports.io/football/teams/159.png" },
    { team: "Sport", logo: "https://media.api-sports.io/football/teams/123.png" },
    { team: "Bragantino", logo: "https://media.api-sports.io/football/teams/794.png" },
    { team: "Juventude", logo: "https://media.api-sports.io/football/teams/152.png" },
  ];
}

async function buildBrasileiraoDashboard() {
  const key = `brasileirao:${BRASILEIRAO_SEASON}`;
  const cached = brasileiraoCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    recordApiCacheHit("brasileirao:dashboard");
    return cached.data;
  }

  const diskCached = readDiskCache(key);
  if (diskCached) {
    brasileiraoCache.set(key, diskCached);
    recordApiCacheHit("brasileirao:dashboard");
    return diskCached.data;
  }

  const [fixturesData, standingsData] = await Promise.all([
    footballGet("/fixtures", { league: BRASILEIRAO_SERIE_A_LEAGUE_ID, season: BRASILEIRAO_SEASON }, "standard").catch(() => ({ response: [] })),
    footballGet("/standings", { league: BRASILEIRAO_SERIE_A_LEAGUE_ID, season: BRASILEIRAO_SEASON }, "standard").catch(() => ({ response: [] })),
  ]);

  const fixtures = Array.isArray(fixturesData?.response) ? fixturesData.response : [];
  const matches = fixtures
    .map((fixture: any) => toBrasileiraoMatch(fixture))
    .filter(Boolean)
    .sort((a: BrasileiraoMatch, b: BrasileiraoMatch) => new Date(a.date).getTime() - new Date(b.date).getTime()) as BrasileiraoMatch[];

  const standings = parseBrasileiraoStandings(standingsData);
  const completed = matches.filter((match) => isFinishedStatus(match.status));
  const live = matches.filter((match) => dashboardLiveStatus(match.status));
  const upcoming = matches.filter((match) => !isFinishedStatus(match.status) && !dashboardLiveStatus(match.status));
  const clubGrid = standings.length
    ? standings.map((row) => ({ team: row.team, logo: row.logo }))
    : brasileiraoFallbackTeams();

  const data = {
    leagueId: BRASILEIRAO_SERIE_A_LEAGUE_ID,
    season: BRASILEIRAO_SEASON,
    title: "Campeonato Brasileiro Série A 2026",
    matches,
    standings,
    clubGrid,
    totals: {
      matches: matches.length,
      completed: completed.length,
      live: live.length,
      upcoming: upcoming.length,
      clubs: clubGrid.length,
    },
    updatedAt: new Date().toISOString(),
  };

  const brasileiraoEntry = { expiresAt: Date.now() + BRASILEIRAO_CACHE_TTL_MS, data };
  brasileiraoCache.set(key, brasileiraoEntry);
  writeDiskCache(key, brasileiraoEntry);
  return data;
}


type ParsedLiveStats = {
  shots: [number | null, number | null];
  shotsOnGoal: [number | null, number | null];
  corners: [number | null, number | null];
  yellowCards: [number | null, number | null];
  redCards: [number | null, number | null];
  possession: [number | null, number | null];
};

function statNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = String(value).replace("%", "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function findStat(stats: any, name: string) {
  const item = Array.isArray(stats?.statistics)
    ? stats.statistics.find((entry: any) => String(entry?.type || "").toLowerCase() === name.toLowerCase())
    : null;
  return statNumber(item?.value);
}

function parseFixtureStats(rawStats: any[]): ParsedLiveStats {
  const home = rawStats?.[0] || {};
  const away = rawStats?.[1] || {};
  return {
    shots: [findStat(home, "Total Shots"), findStat(away, "Total Shots")],
    shotsOnGoal: [findStat(home, "Shots on Goal"), findStat(away, "Shots on Goal")],
    corners: [findStat(home, "Corner Kicks"), findStat(away, "Corner Kicks")],
    yellowCards: [findStat(home, "Yellow Cards"), findStat(away, "Yellow Cards")],
    redCards: [findStat(home, "Red Cards"), findStat(away, "Red Cards")],
    possession: [findStat(home, "Ball Possession"), findStat(away, "Ball Possession")],
  };
}

function safe(value: number | null | undefined, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function offensivePressure(stats: ParsedLiveStats, side: 0 | 1) {
  const shots = safe(stats.shots[side]);
  const onGoal = safe(stats.shotsOnGoal[side]);
  const corners = safe(stats.corners[side]);
  const possession = safe(stats.possession[side], 50);
  const score = Math.round(Math.min(98, Math.max(8, possession * 0.42 + shots * 3.2 + onGoal * 7 + corners * 4.5)));
  return score;
}

function activityIndex(stats: ParsedLiveStats, elapsed: number | null) {
  const homePressure = offensivePressure(stats, 0);
  const awayPressure = offensivePressure(stats, 1);
  const shotsOnGoalTotal = safe(stats.shotsOnGoal[0]) + safe(stats.shotsOnGoal[1]);
  const cornersTotal = safe(stats.corners[0]) + safe(stats.corners[1]);
  const minuteFactor = elapsed ? Math.min(22, Math.max(0, elapsed - 50) * 0.55) : 8;
  return Math.round(Math.min(94, Math.max(25, (homePressure + awayPressure) / 2 + shotsOnGoalTotal * 3 + cornersTotal * 1.5 + minuteFactor)));
}

function buildAlerts(game: UpcomingGame, stats: ParsedLiveStats) {
  const homePressure = offensivePressure(stats, 0);
  const awayPressure = offensivePressure(stats, 1);
  const activityScore = activityIndex(stats, game.elapsed);
  const cornersTotal = safe(stats.corners[0]) + safe(stats.corners[1]);
  const alerts: string[] = [];
  if (homePressure >= 72) alerts.push(`Pressão alta ${game.home}`);
  if (awayPressure >= 72) alerts.push(`Pressão alta ${game.away}`);
  if (cornersTotal >= 7) alerts.push(`${cornersTotal} escanteios acumulados no jogo`);
  if (activityScore >= 70) alerts.push(`Índice de atividade ofensiva em ${activityScore}%`);
  const homeGoals = safe(game.homeGoals);
  const awayGoals = safe(game.awayGoals);
  if ((homeGoals === 0 || awayGoals === 0) && activityScore >= 58) alerts.push("Uma equipa ainda não marcou, apesar da atividade ofensiva");
  if (!alerts.length) alerts.push("Jogo em monitoramento, sem pressão extrema neste momento");
  return alerts.slice(0, 4);
}

function buildObservations(game: UpcomingGame, stats: ParsedLiveStats) {
  const activityScore = activityIndex(stats, game.elapsed);
  const cornersTotal = safe(stats.corners[0]) + safe(stats.corners[1]);
  const homePressure = offensivePressure(stats, 0);
  const awayPressure = offensivePressure(stats, 1);
  const leader = homePressure >= awayPressure ? game.home : game.away;
  const observations: string[] = [];
  if (activityScore >= 68) observations.push(`Atividade ofensiva alta, com maior volume de ${leader}`);
  if (cornersTotal >= 5) observations.push(`${cornersTotal} escanteios registados até o momento`);
  if (Math.max(homePressure, awayPressure) >= 72) observations.push("Pressão ofensiva concentrada em uma das equipas");
  if (!observations.length) observations.push("Partida em acompanhamento estatístico, sem destaque elevado");
  return observations.slice(0, 4);
}


function isDemoModeEnabled(req?: Request) {
  const envValue = String(process.env.DEMO_MODE || process.env.VITE_DEMO_MODE || "").toLowerCase();
  const queryValue = req ? String(req.query.demo || "").toLowerCase() : "";
  return ["1", "true", "yes", "on"].includes(envValue) || ["1", "true", "yes", "on"].includes(queryValue);
}

function demoLiveGames(limit = 12) {
  const now = new Date();
  const baseGames: Array<UpcomingGame & { stats: ParsedLiveStats; pressure: { home: number; away: number }; alerts: string[]; observations: string[]; activityIndex: number; liveRoom: string; demo: boolean }> = [
    {
      id: "demo-flamengo-palmeiras",
      fixtureId: "demo-flamengo-palmeiras",
      date: now.toISOString(),
      time: "21:00",
      status: "2H",
      elapsed: 67,
      league: "Brasileirão Série A - Modo Demonstração",
      country: "Brasil",
      home: "Flamengo",
      away: "Palmeiras",
      homeGoals: 1,
      awayGoals: 0,
      market: "Teste de interação",
      confidence: 82,
      odd: "Demo",
      stats: { shots: [14, 8], shotsOnGoal: [6, 3], corners: [7, 4], yellowCards: [2, 3], redCards: [0, 0], possession: [58, 42] },
      pressure: { home: 84, away: 61 },
      alerts: ["⚽ Possibilidade de gol do Flamengo", "🚩 Escanteio provável para o Flamengo", "🟨 Jogo quente, atenção a cartão"],
      observations: ["Pressão alta do mandante", "Volume ofensivo forte nos últimos minutos", "Sala liberada para teste de torcedores"],
      activityIndex: 86,
      liveRoom: "Flamengo x Palmeiras",
      demo: true,
    },
    {
      id: "demo-botafogo-fluminense",
      fixtureId: "demo-botafogo-fluminense",
      date: now.toISOString(),
      time: "21:15",
      status: "1H",
      elapsed: 34,
      league: "Brasileirão Série A - Modo Demonstração",
      country: "Brasil",
      home: "Botafogo",
      away: "Fluminense",
      homeGoals: 0,
      awayGoals: 0,
      market: "Teste de interação",
      confidence: 74,
      odd: "Demo",
      stats: { shots: [8, 7], shotsOnGoal: [3, 2], corners: [5, 5], yellowCards: [1, 1], redCards: [0, 0], possession: [51, 49] },
      pressure: { home: 73, away: 70 },
      alerts: ["🚩 Forte tendência de escanteio", "✅ Ambas podem marcar", "⚽ Jogo aberto com finalizações dos dois lados"],
      observations: ["Pressão equilibrada", "Muitos ataques laterais", "Bom jogo para testar sala exclusiva"],
      activityIndex: 78,
      liveRoom: "Botafogo x Fluminense",
      demo: true,
    },
    {
      id: "demo-vasco-santos",
      fixtureId: "demo-vasco-santos",
      date: now.toISOString(),
      time: "21:30",
      status: "2H",
      elapsed: 78,
      league: "Brasileirão Série A - Modo Demonstração",
      country: "Brasil",
      home: "Vasco",
      away: "Santos",
      homeGoals: 2,
      awayGoals: 1,
      market: "Teste de interação",
      confidence: 77,
      odd: "Demo",
      stats: { shots: [12, 11], shotsOnGoal: [5, 5], corners: [6, 6], yellowCards: [3, 2], redCards: [0, 0], possession: [49, 51] },
      pressure: { home: 68, away: 79 },
      alerts: ["⚽ Santos pressiona por empate", "🚩 Escanteio provável", "🟨 Cartão possível pelo ritmo do jogo"],
      observations: ["Pressão visitante aumentando", "Jogo com placar aberto", "Teste ideal para alertas sonoros"],
      activityIndex: 81,
      liveRoom: "Vasco x Santos",
      demo: true,
    },
    {
      id: "demo-corinthians-sao-paulo",
      fixtureId: "demo-corinthians-sao-paulo",
      date: now.toISOString(),
      time: "21:45",
      status: "2H",
      elapsed: 55,
      league: "Brasileirão Série A - Modo Demonstração",
      country: "Brasil",
      home: "Corinthians",
      away: "São Paulo",
      homeGoals: 1,
      awayGoals: 1,
      market: "Teste de interação",
      confidence: 71,
      odd: "Demo",
      stats: { shots: [9, 10], shotsOnGoal: [4, 4], corners: [3, 7], yellowCards: [4, 2], redCards: [0, 0], possession: [46, 54] },
      pressure: { home: 59, away: 75 },
      alerts: ["🚩 São Paulo força escanteios", "🟨 Clássico com alta chance de cartão", "⚽ Pressão ofensiva visitante"],
      observations: ["Jogo quente", "Visitante forte pelas laterais", "Sala independente ativa"],
      activityIndex: 76,
      liveRoom: "Corinthians x São Paulo",
      demo: true,
    },
  ];
  return baseGames.slice(0, Math.max(1, Math.min(baseGames.length, limit)));
}

async function liveGamesDetailed(limit = 12) {
  const data = await footballGet("/fixtures", { live: "all" }, "essential");
  const fixtures = Array.isArray(data?.response) ? data.response : [];
  const games = fixtures.map(toGame).filter(Boolean).slice(0, Math.max(1, Math.min(20, limit))) as UpcomingGame[];

  const detailed = await Promise.all(
    games.map(async (game) => {
      let stats: ParsedLiveStats = {
        shots: [null, null],
        shotsOnGoal: [null, null],
        corners: [null, null],
        yellowCards: [null, null],
        redCards: [null, null],
        possession: [null, null],
      };
      try {
        if (game.fixtureId) {
          const statsData = await footballGet("/fixtures/statistics", { fixture: game.fixtureId }, "essential");
          stats = parseFixtureStats(Array.isArray(statsData?.response) ? statsData.response : []);
        }
      } catch {
        // Plano grátis pode não entregar estatísticas para todos os jogos. Mantemos o jogo no live mesmo assim.
      }

      const homePressure = offensivePressure(stats, 0);
      const awayPressure = offensivePressure(stats, 1);
      const activityIndexValue = activityIndex(stats, game.elapsed);

      return {
        ...game,
        stats,
        pressure: {
          home: homePressure,
          away: awayPressure,
        },
        alerts: buildAlerts(game, stats),
        observations: buildObservations(game, stats),
        activityIndex: activityIndexValue,
        liveRoom: `${game.home} x ${game.away}`,
      };
    }),
  );

  return detailed.sort((a, b) => Math.max(b.pressure.home, b.pressure.away) - Math.max(a.pressure.home, a.pressure.away));
}


type MatchCenterEvent = {
  time: number | null;
  team: string;
  type: string;
  detail: string;
  player?: string;
  assist?: string;
};

type MatchCenterLineup = {
  team: string;
  formation?: string;
  coach?: string;
  startXI: Array<{ name: string; number?: number; pos?: string }>;
};

function simplifyEvent(event: any): MatchCenterEvent {
  return {
    time: event?.time?.elapsed ?? null,
    team: String(event?.team?.name || "Equipe"),
    type: String(event?.type || "Evento"),
    detail: String(event?.detail || ""),
    player: event?.player?.name ? String(event.player.name) : undefined,
    assist: event?.assist?.name ? String(event.assist.name) : undefined,
  };
}

function simplifyLineup(lineup: any): MatchCenterLineup {
  return {
    team: String(lineup?.team?.name || "Equipe"),
    formation: lineup?.formation ? String(lineup.formation) : undefined,
    coach: lineup?.coach?.name ? String(lineup.coach.name) : undefined,
    startXI: Array.isArray(lineup?.startXI)
      ? lineup.startXI.slice(0, 11).map((item: any) => ({
          name: String(item?.player?.name || "Jogador"),
          number: item?.player?.number,
          pos: item?.player?.pos,
        }))
      : [],
  };
}

async function buildMatchCenter(fixtureId: string) {
  const [fixtureData, statsData, eventsData, lineupsData] = await Promise.all([
    footballGet("/fixtures", { id: fixtureId }, "standard"),
    footballGet("/fixtures/statistics", { fixture: fixtureId }, "standard").catch(() => ({ response: [] })),
    footballGet("/fixtures/events", { fixture: fixtureId }, "standard").catch(() => ({ response: [] })),
    footballGet("/fixtures/lineups", { fixture: fixtureId }, "standard").catch(() => ({ response: [] })),
  ]);

  const rawFixture = Array.isArray(fixtureData?.response) ? fixtureData.response[0] : null;
  if (!rawFixture) throw new Error("Jogo não encontrado na API.");

  const game = toGame(rawFixture);
  const stats = parseFixtureStats(Array.isArray(statsData?.response) ? statsData.response : []);
  const events = Array.isArray(eventsData?.response) ? eventsData.response.map(simplifyEvent) : [];
  const lineups = Array.isArray(lineupsData?.response) ? lineupsData.response.map(simplifyLineup) : [];
  const venue = rawFixture?.fixture?.venue || {};

  return {
    game,
    venue: {
      name: venue?.name ? String(venue.name) : "",
      city: venue?.city ? String(venue.city) : "",
    },
    stats,
    events,
    lineups,
    updatedAt: new Date().toISOString(),
  };
}

function sendError(res: Response, error: unknown, fallback: string) {
  const status = error instanceof ApiUsageLimitError ? error.statusCode : 502;
  res.status(status).json({
    success: false,
    error: error instanceof Error ? error.message : fallback,
    budgetProtected: error instanceof ApiUsageLimitError,
  });
}

export function registerFootballLive(app: Express) {
  app.get("/api/football/logo", async (req: Request, res: Response) => {
    try {
      const rawUrl = String(req.query.url || "");
      const url = new URL(rawUrl);
      if (url.protocol !== "https:" || !url.hostname.endsWith("api-sports.io")) {
        return res.status(400).send("Logo inválido.");
      }

      const response = await fetch(url.toString());
      if (!response.ok || !response.body) return res.status(404).send("Logo não encontrado.");

      res.setHeader("Cache-Control", "public, max-age=604800, immutable");
      res.setHeader("Content-Type", response.headers.get("content-type") || "image/png");
      const buffer = Buffer.from(await response.arrayBuffer());
      res.send(buffer);
    } catch {
      res.status(400).send("Logo inválido.");
    }
  });

  app.get("/api/football/status", (_req: Request, res: Response) => {
    res.json({
      success: true,
      configured: Boolean(apiKey()),
      baseUrl: apiBase(),
      cacheTtlSeconds: Math.round(CACHE_TTL_MS / 1000),
      liveCacheTtlSeconds: Math.round(LIVE_CACHE_TTL_MS / 1000),
      persistentCache: true,
      usageProtection: apiUsageSnapshot(),
    });
  });

  // Rota principal para o início do projeto: jogos reais do dia.
  app.get(["/api/jogos-hoje", "/api/football/today"], async (req: Request, res: Response) => {
    try {
      const date = String(req.query.date || todayBrazil());
      const limit = Number(req.query.limit || 60);
      const includeFinished = String(req.query.finished || "").toLowerCase() === "true";
      const games = await fixturesByDate(date, limit, !includeFinished);
      res.setHeader("Cache-Control", "no-store, max-age=0");
      res.json({ success: true, date, timezone: "America/Sao_Paulo", finishedIncluded: includeFinished, games });
    } catch (error) {
      sendError(res, error, "Erro ao buscar jogos de hoje.");
    }
  });

  app.get("/api/football/upcoming", async (req: Request, res: Response) => {
    try {
      const limit = Number(req.query.limit || 18);
      const games = await upcomingGames(limit);
      res.json({ success: true, games });
    } catch (error) {
      sendError(res, error, "Erro ao buscar próximos jogos.");
    }
  });


  app.get("/api/football/live", async (req: Request, res: Response) => {
    const limit = Number(req.query.limit || 12);
    const demoRequested = isDemoModeEnabled(req);
    try {
      const games = demoRequested ? demoLiveGames(limit) : await liveGamesDetailed(limit);
      res.setHeader("Cache-Control", "no-store, max-age=0");
      res.json({
        success: true,
        games,
        demoMode: demoRequested,
        updatedAt: new Date().toISOString(),
        notice: demoRequested ? "Modo demonstração ativo — dados simulados para teste antes do lançamento." : undefined,
      });
    } catch (error) {
      if (demoRequested) {
        res.setHeader("Cache-Control", "no-store, max-age=0");
        res.json({
          success: true,
          games: demoLiveGames(limit),
          demoMode: true,
          updatedAt: new Date().toISOString(),
          notice: "Modo demonstração ativo — API real indisponível, usando dados simulados.",
        });
        return;
      }
      sendError(res, error, "Erro ao buscar jogos ao vivo.");
    }
  });

  app.get("/api/football/team/:teamId/last", async (req: Request, res: Response) => {
    try {
      const teamId = Number(req.params.teamId);
      const limit = Number(req.query.limit || 5);
      if (!teamId) return res.status(400).json({ success: false, error: "ID do time inválido." });
      const games = await lastGames(teamId, limit);
      res.json({ success: true, games });
    } catch (error) {
      sendError(res, error, "Erro ao buscar últimos jogos.");
    }
  });


  app.get("/api/football/match-center/:fixtureId", async (req: Request, res: Response) => {
    try {
      const fixtureId = String(req.params.fixtureId || "");
      if (!fixtureId) {
        res.status(400).json({ success: false, error: "Informe o ID do jogo." });
        return;
      }
      const center = await buildMatchCenter(fixtureId);
      res.json({
        success: true,
        center,
        source: "API-Football",
      });
    } catch (error) {
      sendError(res, error, "Erro ao carregar Centro do Jogo.");
    }
  });

  app.get("/api/football/fixture/:fixtureId", async (req: Request, res: Response) => {
    try {
      const fixture = Number(req.params.fixtureId);
      if (!fixture) return res.status(400).json({ success: false, error: "ID do jogo inválido." });
      const data = await footballGet("/fixtures", { id: fixture });
      res.json({ success: true, fixture: data?.response?.[0] || null });
    } catch (error) {
      sendError(res, error, "Erro ao buscar dados do jogo.");
    }
  });

  app.get("/api/football/fixture/:fixtureId/statistics", async (req: Request, res: Response) => {
    try {
      const fixture = Number(req.params.fixtureId);
      if (!fixture) return res.status(400).json({ success: false, error: "ID do jogo inválido." });
      const data = await footballGet("/fixtures/statistics", { fixture });
      res.json({ success: true, statistics: data?.response || [] });
    } catch (error) {
      sendError(res, error, "Erro ao buscar estatísticas do jogo.");
    }
  });

  app.get("/api/football/fixture/:fixtureId/lineups", async (req: Request, res: Response) => {
    try {
      const fixture = Number(req.params.fixtureId);
      if (!fixture) return res.status(400).json({ success: false, error: "ID do jogo inválido." });
      const data = await footballGet("/fixtures/lineups", { fixture });
      res.json({ success: true, lineups: data?.response || [] });
    } catch (error) {
      sendError(res, error, "Erro ao buscar escalações do jogo.");
    }
  });






  app.get("/api/football/brasileirao", async (_req: Request, res: Response) => {
    try {
      const dashboard = await buildBrasileiraoDashboard();
      res.json({
        success: true,
        dashboard,
        source: "API-Football",
        cachedForMinutes: 30,
      });
    } catch (error) {
      sendError(res, error, "Erro ao carregar Campeonato Brasileiro Série A 2026.");
    }
  });

  app.get("/api/football/world-cup", async (_req: Request, res: Response) => {
    try {
      const dashboard = await buildWorldCupDashboard();
      res.json({
        success: true,
        dashboard,
        source: "API-Football",
        cachedForMinutes: 10,
      });
    } catch (error) {
      sendError(res, error, "Erro ao carregar a Copa do Mundo 2026.");
    }
  });

  app.get("/api/football/favorite-feed", async (req: Request, res: Response) => {
    const authorization = String(req.headers.authorization || "");
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    const user = getUserByToken(token);
    if (!user) {
      res.status(401).json({ success: false, error: "Faça login para consultar seus times." });
      return;
    }
    try {
      const favorites = getFavoriteTeams(user.id);
      const feeds = await Promise.all(favorites.map(async (team) => {
        const response = await footballGet("/fixtures", { team: team.teamId, next: 3 }, "standard");
        const fixtures = Array.isArray(response?.response) ? response.response : [];
        return {
          team,
          games: fixtures.map(toGame).filter(Boolean).slice(0, 3),
        };
      }));
      res.json({ success: true, feeds, updatedAt: new Date().toISOString(), cacheTtlSeconds: Math.round(CACHE_TTL_MS / 1000) });
    } catch (error) {
      sendError(res, error, "Erro ao carregar jogos dos times favoritos.");
    }
  });

  app.get("/api/football/statistics-dashboard", async (req: Request, res: Response) => {
    try {
      const date = String(req.query.date || todayBrazil());
      const leagueId = Number(req.query.league || 0) || undefined;
      const dashboard = await buildStatisticsDashboard(date, leagueId);
      res.json({
        success: true,
        dashboard,
        source: "API-Football",
        updatedAt: new Date().toISOString(),
        cachedForMinutes: 10,
      });
    } catch (error) {
      sendError(res, error, "Erro ao carregar o painel estatístico.");
    }
  });


  app.get("/api/football/reports", async (req: Request, res: Response) => {
    try {
      const limit = Math.max(5, Math.min(10, Number(req.query.limit || 10)));
      const reports = await buildDailyReports(limit);
      res.json({
        success: true,
        reports,
        updatedAt: new Date().toISOString(),
        source: "API-Football",
        cachedForMinutes: 10,
      });
    } catch (error) {
      sendError(res, error, "Erro ao carregar relatórios.");
    }
  });

  app.get("/api/football/rankings", async (req: Request, res: Response) => {
    try {
      const type = normalizeRankingType(req.query.type);
      const limit = Math.max(4, Math.min(8, Number(req.query.limit || 8)));
      const items = await buildFootballRanking(type, limit);
      res.json({
        success: true,
        type,
        items,
        updatedAt: new Date().toISOString(),
        source: "API-Football",
        cachedForMinutes: 10,
      });
    } catch (error) {
      sendError(res, error, "Erro ao carregar rankings.");
    }
  });

  app.get("/api/football/h2h", async (req: Request, res: Response) => {
    try {
      const teamA = Number(req.query.teamA);
      const teamB = Number(req.query.teamB);
      const last = Number(req.query.last || 10);
      if (!teamA || !teamB) return res.status(400).json({ success: false, error: "Informe teamA e teamB." });
      const data = await footballGet("/fixtures/headtohead", { h2h: `${teamA}-${teamB}`, last });
      res.json({ success: true, games: data?.response || [] });
    } catch (error) {
      sendError(res, error, "Erro ao buscar H2H.");
    }
  });

  app.get("/api/football/standings", async (req: Request, res: Response) => {
    try {
      const league = Number(req.query.league);
      const season = Number(req.query.season || new Date().getFullYear());
      if (!league) return res.status(400).json({ success: false, error: "Informe league." });
      const data = await footballGet("/standings", { league, season });
      res.json({ success: true, standings: data?.response || [] });
    } catch (error) {
      sendError(res, error, "Erro ao buscar tabela.");
    }
  });
}
