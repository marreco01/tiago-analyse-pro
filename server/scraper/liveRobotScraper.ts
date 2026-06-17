import {
  getCachedGames,
  updateGameRobot,
} from "./index";

export type LiveRobotGame = {
  id: string;
  fixtureId: string;
  time: string;
  status: string;
  elapsed: number | null;
  league: string;
  country?: string;
  home: string;
  away: string;
  homeLogo?: string;
  awayLogo?: string;
  homeGoals: number | null;
  awayGoals: number | null;
  stats: {
    shots: [number | null, number | null];
    shotsOnGoal: [number | null, number | null];
    corners: [number | null, number | null];
    yellowCards: [number | null, number | null];
    redCards: [number | null, number | null];
    possession: [number | null, number | null];
  };
  pressure: { home: number; away: number };
  alerts: string[];
  observations: string[];
  activityIndex: number;
  liveRoom: string;
  robotSource: "live-robot";
};

export type LiveRobotStatus = {
  id: "ao-vivo";
  name: string;
  status: "online" | "running" | "error";
  visibleToPublic: false;
  intervalMinutes: number;
  sources: string[];
  lastRunAt?: string;
  nextRunAt?: string;
  totalItems: number;
  gamesAnalyzed: number;
  liveGames: number;
  alertsGenerated: number;
  pressureHigh: number;
  activityHigh: number;
  lastError?: string;
};

export type LiveRobotLogEntry = {
  id: string;
  robot: "ao-vivo";
  level: "info" | "success" | "error";
  message: string;
  createdAt: string;
  totalItems?: number;
};

const LIVE_CACHE_TIME_MS = 1000 * 45;
const LIVE_STALE_MS = LIVE_CACHE_TIME_MS - 5000;
const LIVE_FETCH_TIMEOUT_MS = 5500;
const SOURCES = [
  "Robô Master Ao Vivo V20",
  "ESPN scoreboard + summary por competição",
  "TheSportsDB livescore como reforço",
  "Copa/Mundial/Libertadores/Champions/ligas principais",
  "Cache interno como última camada",
];


const NATIONAL_TEAM_FLAG_CODES: Record<string, string> = {
  // Copa 2026 / seleções em inglês e português
  "mexico": "mx", "méxico": "mx",
  "south africa": "za", "africa do sul": "za", "áfrica do sul": "za",
  "south korea": "kr", "korea republic": "kr", "coreia do sul": "kr",
  "czechia": "cz", "czech republic": "cz", "chequia": "cz", "chéquia": "cz", "tchequia": "cz", "tchéquia": "cz",
  "canada": "ca", "canadá": "ca",
  "bosnia and herzegovina": "ba", "bósnia e herzegovina": "ba", "bosnia": "ba",
  "qatar": "qa", "catar": "qa",
  "switzerland": "ch", "suica": "ch", "suíça": "ch",
  "brazil": "br", "brasil": "br",
  "morocco": "ma", "marrocos": "ma",
  "haiti": "ht", "haití": "ht",
  "scotland": "gb-sct", "escocia": "gb-sct", "escócia": "gb-sct",
  "united states": "us", "usa": "us", "estados unidos": "us",
  "paraguay": "py", "paraguai": "py",
  "australia": "au", "austrália": "au",
  "turkey": "tr", "turkiye": "tr", "türkiye": "tr", "turquia": "tr",
  "germany": "de", "alemanha": "de",
  "curacao": "cw", "curaçao": "cw",
  "ivory coast": "ci", "cote d'ivoire": "ci", "costa do marfim": "ci",
  "ecuador": "ec", "equador": "ec",
  "netherlands": "nl", "países baixos": "nl", "paises baixos": "nl", "holanda": "nl",
  "japan": "jp", "japao": "jp", "japão": "jp",
  "sweden": "se", "suecia": "se", "suécia": "se",
  "tunisia": "tn", "tunísia": "tn",
  "belgium": "be", "belgica": "be", "bélgica": "be",
  "egypt": "eg", "egito": "eg",
  "iran": "ir", "irã": "ir", "ira": "ir",
  "new zealand": "nz", "nova zelandia": "nz", "nova zelândia": "nz",
  "spain": "es", "espanha": "es",
  "cape verde": "cv", "cabo verde": "cv",
  "saudi arabia": "sa", "arábia saudita": "sa", "arabia saudita": "sa",
  "uruguay": "uy", "uruguai": "uy",
  "france": "fr", "frança": "fr", "franca": "fr",
  "senegal": "sn",
  "iraq": "iq", "iraque": "iq",
  "norway": "no", "noruega": "no",
  "argentina": "ar",
  "algeria": "dz", "argélia": "dz", "argelia": "dz",
  "austria": "at", "áustria": "at",
  "jordan": "jo", "jordânia": "jo", "jordania": "jo",
  "portugal": "pt",
  "dr congo": "cd", "congo dr": "cd", "rd congo": "cd", "congo": "cd",
  "uzbekistan": "uz", "uzbequistão": "uz", "uzbequistao": "uz",
  "colombia": "co", "colômbia": "co",
  "england": "gb-eng", "inglaterra": "gb-eng",
  "croatia": "hr", "croácia": "hr", "croacia": "hr",
  "ghana": "gh", "gana": "gh",
  "panama": "pa", "panamá": "pa",
};

function teamFlagUrl(name: string) {
  const key = normalizeName(name).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  const code = NATIONAL_TEAM_FLAG_CODES[key];
  return code ? `https://flagcdn.com/w80/${code}.png` : "";
}

function teamLogoOrFlag(team: any, name: string) {
  const explicitLogo = String(team?.logo || team?.logos?.[0]?.href || team?.flag || "").trim();
  if (explicitLogo) return explicitLogo;
  return teamFlagUrl(name);
}

const ESPN_LIVE_LEAGUES = [
  { slug: "fifa.world", name: "Copa do Mundo", weight: 120 },
  { slug: "fifa.cwc", name: "Mundial de Clubes", weight: 115 },
  { slug: "conmebol.libertadores", name: "Libertadores", weight: 110 },
  { slug: "uefa.champions", name: "Champions League", weight: 108 },
  { slug: "bra.1", name: "Brasileirão Série A", weight: 102 },
  { slug: "eng.1", name: "Premier League", weight: 100 },
  { slug: "esp.1", name: "La Liga", weight: 98 },
  { slug: "ita.1", name: "Serie A Itália", weight: 96 },
  { slug: "ger.1", name: "Bundesliga", weight: 94 },
  { slug: "fra.1", name: "Ligue 1", weight: 90 },
  { slug: "uefa.europa", name: "Europa League", weight: 88 },
  { slug: "conmebol.sudamericana", name: "Sul-Americana", weight: 86 },
  { slug: "usa.1", name: "MLS", weight: 78 },
  { slug: "bra.2", name: "Brasileirão Série B", weight: 70 },
  { slug: "mex.1", name: "Liga MX", weight: 72 },
  { slug: "arg.1", name: "Argentina Primera", weight: 74 },
];

const STAT_ALIASES = {
  shots: ["total shots", "shots", "chutes", "finalizações", "finalizacoes"],
  shotsOnGoal: ["shots on target", "shots on goal", "sog", "chutes no gol", "finalizações certas", "finalizacoes certas"],
  corners: ["corner kicks", "corners", "escanteios", "cantos"],
  yellowCards: ["yellow cards", "cartões amarelos", "cartoes amarelos", "yellowcards"],
  redCards: ["red cards", "cartões vermelhos", "cartoes vermelhos", "redcards"],
  possession: ["possession", "posse", "possession %"],
};
const logs: LiveRobotLogEntry[] = [];
let running = false;
let timer: NodeJS.Timeout | null = null;
let status: LiveRobotStatus["status"] = "online";
let lastRunAt = "";
let nextRunAt = "";
let lastError = "";

let cache = {
  updatedAt: new Date().toISOString(),
  games: [] as LiveRobotGame[],
};

function scheduleNextRun() {
  nextRunAt = new Date(Date.now() + LIVE_CACHE_TIME_MS).toISOString();
}

function addLog(level: LiveRobotLogEntry["level"], message: string, totalItems?: number) {
  logs.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    robot: "ao-vivo",
    level,
    message,
    createdAt: new Date().toISOString(),
    totalItems,
  });
  if (logs.length > 100) logs.length = 100;
}

function ymd(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function todayBrazilYmd() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts.replace(/-/g, "");
}

function brazilTime(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseElapsedFromStatus(value: unknown): number | null {
  const text = String(value || "");
  const match = text.match(/(\d{1,3})/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? Math.max(1, Math.min(130, n)) : null;
}

function isEspnLiveStatus(statusType: any) {
  const state = String(statusType?.state || "").toLowerCase();
  const name = String(statusType?.name || statusType?.description || statusType?.detail || "").toLowerCase();
  return state === "in" || name.includes("in progress") || name.includes("halftime") || name.includes("live");
}

function liveStatusFromEspn(statusType: any) {
  const detail = String(statusType?.shortDetail || statusType?.detail || statusType?.description || "").trim();
  if (/half/i.test(detail)) return "HT";
  if (detail) return detail.toUpperCase();
  return "LIVE";
}

function espnScore(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function statNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value ?? "").replace("%", "").replace(",", ".");
  const match = text.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function emptyStats(): LiveRobotGame["stats"] {
  return {
    shots: [null, null],
    shotsOnGoal: [null, null],
    corners: [null, null],
    yellowCards: [null, null],
    redCards: [null, null],
    possession: [null, null],
  };
}

function mergeStats(base: LiveRobotGame["stats"], extra?: Partial<LiveRobotGame["stats"]>) {
  if (!extra) return base;
  const merged = { ...base } as LiveRobotGame["stats"];
  for (const key of Object.keys(base) as Array<keyof LiveRobotGame["stats"]>) {
    const incoming = extra[key];
    if (!Array.isArray(incoming)) continue;
    merged[key] = [
      base[key][0] ?? incoming[0] ?? null,
      base[key][1] ?? incoming[1] ?? null,
    ] as any;
  }
  return merged;
}

function setStat(stats: LiveRobotGame["stats"], key: keyof LiveRobotGame["stats"], side: 0 | 1, value: unknown) {
  const parsed = statNumber(value);
  if (parsed === null) return;
  stats[key][side] = parsed;
}

function normalizeName(value: unknown) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function matchStatKey(name: unknown): keyof LiveRobotGame["stats"] | null {
  const normalized = normalizeName(name);
  for (const [key, aliases] of Object.entries(STAT_ALIASES)) {
    if (aliases.some((alias) => normalized.includes(normalizeName(alias)))) return key as keyof LiveRobotGame["stats"];
  }
  return null;
}

function parseEspnCompetitorStats(competitors: any[]) {
  const stats = emptyStats();
  competitors.forEach((competitor: any, index: number) => {
    const side = competitor?.homeAway === "away" ? 1 : competitor?.homeAway === "home" ? 0 : (index === 0 ? 0 : 1);
    const list = Array.isArray(competitor?.statistics) ? competitor.statistics : [];
    for (const item of list) {
      const key = matchStatKey(item?.name || item?.displayName || item?.abbreviation);
      if (key) setStat(stats, key, side as 0 | 1, item?.value ?? item?.displayValue);
    }
  });
  return stats;
}

function parseEspnBoxscoreStats(summary: any) {
  const stats = emptyStats();
  const teams = Array.isArray(summary?.boxscore?.teams) ? summary.boxscore.teams : [];
  teams.forEach((team: any, index: number) => {
    const side = team?.homeAway === "away" ? 1 : team?.homeAway === "home" ? 0 : (index === 0 ? 0 : 1);
    const list = Array.isArray(team?.statistics) ? team.statistics : [];
    for (const item of list) {
      const key = matchStatKey(item?.name || item?.label || item?.displayName || item?.abbreviation);
      if (key) setStat(stats, key, side as 0 | 1, item?.value ?? item?.displayValue);
    }
  });
  return stats;
}

async function fetchJson(url: string, timeoutMs = LIVE_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 AnalyseProMasterLiveBot/20.0",
        accept: "application/json,text/plain,*/*",
      },
    });
    if (!response.ok) return null;
    return await response.json().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchEspnSummaryStats(leagueSlug: string, eventId: string) {
  if (!eventId) return undefined;
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueSlug}/summary?event=${encodeURIComponent(eventId)}`;
  const data = await fetchJson(url);
  if (!data) return undefined;
  return mergeStats(parseEspnBoxscoreStats(data), parseEspnCompetitorStats(data?.competitions?.[0]?.competitors || []));
}

function recalcGameActivity(game: LiveRobotGame) {
  const shotsHome = game.stats.shots[0] || 0;
  const shotsAway = game.stats.shots[1] || 0;
  const sogHome = game.stats.shotsOnGoal[0] || 0;
  const sogAway = game.stats.shotsOnGoal[1] || 0;
  const cornersHome = game.stats.corners[0] || 0;
  const cornersAway = game.stats.corners[1] || 0;
  const shots = shotsHome + shotsAway;
  const sog = sogHome + sogAway;
  const corners = cornersHome + cornersAway;
  const goals = (game.homeGoals || 0) + (game.awayGoals || 0);
  const elapsed = game.elapsed || 0;
  const hasStats = [shots, sog, corners].some((value) => value > 0);

  if (!hasStats) {
    // Sem estatísticas reais, o robô não deve inventar pressão/atividade alta.
    // Mantém apenas placar e minuto reais, com índice neutro.
    const neutralActivity = Math.max(35, Math.min(58, Math.round(38 + goals * 6 + Math.min(10, elapsed / 10))));
    game.activityIndex = neutralActivity;
    game.pressure = { home: 50, away: 50 };
    game.alerts = (game.alerts || []).filter((alert) => !/pressão|pressao|atividade|gol:/i.test(alert));
    game.observations = [
      "Placar e minuto reais encontrados.",
      "Pressão ofensiva, chutes, escanteios e cartões só aparecem quando a fonte pública entregar estatísticas reais.",
    ];
    return game;
  }

  const activity = Math.max(50, Math.min(99, Math.round(40 + sog * 8 + shots * 1.4 + corners * 3 + goals * 7 + Math.min(12, elapsed / 8))));
  const homeVolume = shotsHome * 2 + sogHome * 5 + cornersHome * 3;
  const awayVolume = shotsAway * 2 + sogAway * 5 + cornersAway * 3;
  game.activityIndex = activity;
  game.pressure = {
    home: Math.min(99, 38 + homeVolume),
    away: Math.min(99, 38 + awayVolume),
  };
  game.observations = [
    "Dados ao vivo enriquecidos por múltiplas fontes públicas.",
    `Atividade ${game.activityIndex}% calculada com estatísticas reais disponíveis.`,
  ];
  return game;
}

function buildEspnLiveGame(event: any, league: { slug: string; name: string; weight: number }): LiveRobotGame | null {
  const competition = event?.competitions?.[0];
  const competitors = Array.isArray(competition?.competitors) ? competition.competitors : [];
  const home = competitors.find((item: any) => item.homeAway === "home") || competitors[0];
  const away = competitors.find((item: any) => item.homeAway === "away") || competitors[1];
  const statusType = competition?.status?.type || event?.status?.type || event?.status;

  if (!home || !away || !isEspnLiveStatus(statusType)) return null;

  const homeName = String(home.team?.displayName || home.team?.shortDisplayName || home.team?.name || "").trim();
  const awayName = String(away.team?.displayName || away.team?.shortDisplayName || away.team?.name || "").trim();
  if (!homeName || !awayName) return null;

  const detail = statusType?.shortDetail || statusType?.detail || statusType?.description || "";
  const elapsed = parseElapsedFromStatus(detail);
  const homeGoals = espnScore(home.score);
  const awayGoals = espnScore(away.score);
  const statusText = liveStatusFromEspn(statusType);
  const goalBoost = ((homeGoals || 0) + (awayGoals || 0)) * 4;
  const activity = Math.max(40, Math.min(62, 42 + (elapsed ? Math.min(10, Math.round(elapsed / 10)) : 0) + goalBoost));

  return {
    id: String(event.id || `${league.slug}-${homeName}-${awayName}`),
    fixtureId: String(event.id || `${league.slug}-${homeName}-${awayName}`),
    time: brazilTime(event.date || competition.date || new Date().toISOString()),
    status: statusText,
    elapsed,
    league: league.name,
    country: league.name.includes("Copa") || league.name.includes("Mundial") ? "Mundo" : undefined,
    home: homeName,
    away: awayName,
    homeLogo: teamLogoOrFlag(home.team, homeName),
    awayLogo: teamLogoOrFlag(away.team, awayName),
    homeGoals,
    awayGoals,
    stats: parseEspnCompetitorStats(competitors),
    pressure: { home: 50, away: 50 },
    alerts: [
      `🔴 Ao vivo agora: ${homeName} x ${awayName}`,
      league.weight >= 110 ? "🏆 Jogo prioritário: Copa/Mundial/continental" : "⚽ Partida real detectada em fonte pública",
    ],
    observations: [
      `${league.name} detectado em tempo real.`,
      "Estatísticas detalhadas dependem da fonte disponível; placar e status priorizados.",
    ],
    activityIndex: activity,
    liveRoom: `${homeName} x ${awayName}`,
    robotSource: "live-robot",
  };
}

async function fetchEspnLiveLeague(league: { slug: string; name: string; weight: number }) {
  const today = todayBrazilYmd();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dates = `${ymd(yesterday)}-${ymd(tomorrow)}`;
  const urls = [
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.slug}/scoreboard?dates=${today}`,
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.slug}/scoreboard?dates=${dates}`,
  ];

  for (const url of urls) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "user-agent": "Mozilla/5.0 AnalyseProLiveBot/2.0",
          accept: "application/json,text/plain,*/*",
        },
      });
      clearTimeout(timeout);
      if (!response.ok) continue;
      const data: any = await response.json().catch(() => null);
      const events = Array.isArray(data?.events) ? data.events : [];
      const baseGames = events.map((event: any) => buildEspnLiveGame(event, league)).filter(Boolean) as LiveRobotGame[];
      if (baseGames.length) {
        const enriched = await Promise.all(baseGames.map(async (game) => {
          const summaryStats = await fetchEspnSummaryStats(league.slug, game.fixtureId);
          game.stats = mergeStats(game.stats, summaryStats);
          return recalcGameActivity(game);
        }));
        return enriched;
      }
    } catch {
      clearTimeout(timeout);
    }
  }

  return [] as LiveRobotGame[];
}

function isRealLiveStatus(value: unknown) {
  const status = String(value || "").toUpperCase().trim();
  return ["1H", "2H", "HT", "ET", "P", "LIVE", "IN_PLAY", "INT"].includes(status);
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildFromRealLive(raw: any): LiveRobotGame | null {
  const elapsed = safeNumber(raw.elapsed);
  const status = String(raw.status || "").toUpperCase();

  if (!isRealLiveStatus(status) && !(elapsed && elapsed > 0 && elapsed <= 130)) {
    return null;
  }

  const home = String(raw.home || "").trim();
  const away = String(raw.away || "").trim();
  if (!home || !away) return null;

  const stats = raw.stats || {};
  const pressure = raw.pressure || {};
  const activityIndex = safeNumber(raw.activityIndex) ?? 0;

  const game: LiveRobotGame = {
    id: String(raw.id || raw.fixtureId || `${home}-${away}`),
    fixtureId: String(raw.fixtureId || raw.id || `${home}-${away}`),
    time: String(raw.time || "--:--"),
    status: status || "LIVE",
    elapsed,
    league: String(raw.league || raw.competition || "Futebol"),
    country: raw.country ? String(raw.country) : undefined,
    home,
    away,
    homeLogo: String(raw.homeLogo || raw.homeFlag || raw.homeCrest || raw.homeBadge || teamFlagUrl(home) || "").trim(),
    awayLogo: String(raw.awayLogo || raw.awayFlag || raw.awayCrest || raw.awayBadge || teamFlagUrl(away) || "").trim(),
    homeGoals: safeNumber(raw.homeGoals),
    awayGoals: safeNumber(raw.awayGoals),
    stats: {
      shots: Array.isArray(stats.shots) ? stats.shots : [null, null],
      shotsOnGoal: Array.isArray(stats.shotsOnGoal) ? stats.shotsOnGoal : [null, null],
      corners: Array.isArray(stats.corners) ? stats.corners : [null, null],
      yellowCards: Array.isArray(stats.yellowCards) ? stats.yellowCards : [null, null],
      redCards: Array.isArray(stats.redCards) ? stats.redCards : [null, null],
      possession: Array.isArray(stats.possession) ? stats.possession : [null, null],
    },
    pressure: {
      home: safeNumber(pressure.home) ?? 0,
      away: safeNumber(pressure.away) ?? 0,
    },
    alerts: Array.isArray(raw.alerts) ? raw.alerts : [],
    observations: Array.isArray(raw.observations) ? raw.observations : ["Partida real ao vivo detectada."],
    activityIndex,
    liveRoom: String(raw.liveRoom || raw.fixtureId || raw.id || `${home}-${away}`),
    robotSource: "live-robot",
  };

  return game;
}


function buildSportsDbLiveGame(event: any): LiveRobotGame | null {
  const statusText = String(event?.strStatus || event?.strProgress || event?.strLive || "").toLowerCase();
  const minuteText = String(event?.strProgress || event?.intTime || "");
  const elapsed = parseElapsedFromStatus(minuteText);
  const isLive = statusText.includes("live") || statusText.includes("progress") || Boolean(elapsed);
  if (!isLive) return null;

  const home = String(event?.strHomeTeam || event?.homeTeam || "").trim();
  const away = String(event?.strAwayTeam || event?.awayTeam || "").trim();
  if (!home || !away) return null;
  const homeGoals = espnScore(event?.intHomeScore ?? event?.homeScore);
  const awayGoals = espnScore(event?.intAwayScore ?? event?.awayScore);
  const league = String(event?.strLeague || event?.strSport || "Futebol");
  const stats = emptyStats();
  setStat(stats, "shots", 0, event?.intHomeShots);
  setStat(stats, "shots", 1, event?.intAwayShots);
  setStat(stats, "shotsOnGoal", 0, event?.intHomeShotsOnTarget);
  setStat(stats, "shotsOnGoal", 1, event?.intAwayShotsOnTarget);
  setStat(stats, "corners", 0, event?.intHomeCorners);
  setStat(stats, "corners", 1, event?.intAwayCorners);
  setStat(stats, "yellowCards", 0, event?.intHomeYellowCards);
  setStat(stats, "yellowCards", 1, event?.intAwayYellowCards);
  setStat(stats, "redCards", 0, event?.intHomeRedCards);
  setStat(stats, "redCards", 1, event?.intAwayRedCards);
  setStat(stats, "possession", 0, event?.intHomePossession);
  setStat(stats, "possession", 1, event?.intAwayPossession);

  return recalcGameActivity({
    id: String(event?.idEvent || `${league}-${home}-${away}`),
    fixtureId: String(event?.idEvent || `${league}-${home}-${away}`),
    time: String(event?.strTime || event?.strTimestamp || "--:--").slice(0, 5),
    status: elapsed ? `${elapsed}'` : "LIVE",
    elapsed,
    league,
    country: event?.strCountry ? String(event.strCountry) : undefined,
    home,
    away,
    homeLogo: String(event?.strHomeTeamBadge || event?.strHomeTeamLogo || teamFlagUrl(home) || "").trim(),
    awayLogo: String(event?.strAwayTeamBadge || event?.strAwayTeamLogo || teamFlagUrl(away) || "").trim(),
    homeGoals,
    awayGoals,
    stats,
    pressure: { home: 50, away: 50 },
    alerts: [`🔴 Ao vivo agora: ${home} x ${away}`, "🌐 Fonte pública alternativa detectou a partida."],
    observations: [],
    activityIndex: 55,
    liveRoom: `${home} x ${away}`,
    robotSource: "live-robot",
  });
}

async function fetchSportsDbLivescore() {
  const urls = [
    "https://www.thesportsdb.com/api/v1/json/3/livescore.php?s=Soccer",
    "https://www.thesportsdb.com/api/v1/json/3/eventsday.php?s=Soccer",
  ];
  const batches = await Promise.all(urls.map(async (url) => {
    const data = await fetchJson(url, 6500);
    const events = Array.isArray(data?.events) ? data.events : Array.isArray(data?.livescores) ? data.livescores : [];
    return events.map(buildSportsDbLiveGame).filter(Boolean) as LiveRobotGame[];
  }));
  return batches.flat();
}

function enrichFromDuplicate(base: LiveRobotGame, duplicate: LiveRobotGame) {
  base.stats = mergeStats(base.stats, duplicate.stats);
  base.homeGoals = base.homeGoals ?? duplicate.homeGoals;
  base.awayGoals = base.awayGoals ?? duplicate.awayGoals;
  base.homeLogo = base.homeLogo || duplicate.homeLogo || teamFlagUrl(base.home);
  base.awayLogo = base.awayLogo || duplicate.awayLogo || teamFlagUrl(base.away);
  base.elapsed = base.elapsed ?? duplicate.elapsed;
  base.status = base.status || duplicate.status;
  base.pressure = {
    home: Math.max(base.pressure.home || 0, duplicate.pressure.home || 0),
    away: Math.max(base.pressure.away || 0, duplicate.pressure.away || 0),
  };
  base.activityIndex = Math.max(base.activityIndex || 0, duplicate.activityIndex || 0);
  base.alerts = Array.from(new Set([...(base.alerts || []), ...(duplicate.alerts || [])])).slice(0, 5);
  base.observations = Array.from(new Set([...(base.observations || []), ...(duplicate.observations || [])])).slice(0, 4);
  return recalcGameActivity(base);
}

function livePriority(game: LiveRobotGame) {
  const text = `${game.league} ${game.country || ""}`.toLowerCase();
  let priority = 0;
  if (text.includes("copa") || text.includes("world")) priority += 120;
  if (text.includes("mundial") || text.includes("club")) priority += 115;
  if (text.includes("libertadores") || text.includes("champions")) priority += 105;
  if (text.includes("brasileir") || text.includes("premier") || text.includes("la liga") || text.includes("bundesliga")) priority += 90;
  return priority + (game.activityIndex || 0) + (game.elapsed || 0) / 3;
}
async function collectLiveGames() {
  const [publicBatches, sportsDbGames] = await Promise.all([
    Promise.all(ESPN_LIVE_LEAGUES.map(fetchEspnLiveLeague)),
    fetchSportsDbLivescore(),
  ]);

  const cached = getCachedGames();
  const sourceGames = Array.isArray((cached as any).liveGames)
    ? (cached as any).liveGames
    : Array.isArray((cached as any).games)
      ? (cached as any).games
      : [];

  const apiCacheLive = sourceGames
    .map(buildFromRealLive)
    .filter(Boolean) as LiveRobotGame[];

  const unique = new Map<string, LiveRobotGame>();
  for (const game of [...publicBatches.flat(), ...sportsDbGames, ...apiCacheLive]) {
    const key = `${game.home}-${game.away}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
    const previous = unique.get(key);
    if (!previous) unique.set(key, recalcGameActivity(game));
    else unique.set(key, enrichFromDuplicate(previous, game));
  }

  return Array.from(unique.values())
    .sort((a, b) => livePriority(b) - livePriority(a))
    .slice(0, 30);
}

export async function updateLiveRobot(force = false) {
  const stale = Date.now() - new Date(cache.updatedAt || 0).getTime() > LIVE_STALE_MS;
  if (!force && cache.games.length && !stale) return cache;
  status = "running";
  lastError = "";

  try {
    const games = await collectLiveGames();
    cache = { updatedAt: new Date().toISOString(), games };
    lastRunAt = cache.updatedAt;
    status = "online";
    scheduleNextRun();

    if (games.length) {
      addLog("success", `Robô Ao Vivo atualizado: ${games.length} partidas reais ao vivo.`, games.length);
    } else {
      addLog("info", "Nenhuma partida real ao vivo encontrada. Nada foi simulado.", 0);
    }
  } catch (error) {
    lastError = error instanceof Error ? error.message : "Erro desconhecido";
    status = "error";
    scheduleNextRun();
    addLog("error", `Falha no Robô Ao Vivo: ${lastError}`, cache.games.length);
  }

  return cache;
}

export function getLiveRobotStatus(): LiveRobotStatus {
  const games = cache.games;
  return {
    id: "ao-vivo",
    name: "Robô Ao Vivo",
    status,
    visibleToPublic: false,
    intervalMinutes: Math.max(1, Math.round(LIVE_CACHE_TIME_MS / 60000)),
    sources: SOURCES,
    lastRunAt,
    nextRunAt,
    totalItems: games.length,
    gamesAnalyzed: games.length,
    liveGames: games.length,
    alertsGenerated: games.reduce((sum, game) => sum + game.alerts.length, 0),
    pressureHigh: games.filter((game) => Math.max(game.pressure.home, game.pressure.away) >= 72).length,
    activityHigh: games.filter((game) => game.activityIndex >= 72).length,
    lastError,
  };
}

export function getLiveRobotLogs() {
  return logs;
}

export function getCachedLiveRobot() {
  return cache;
}

export function startLiveRobot() {
  if (running) return;
  running = true;
  addLog("info", "Robô Master Ao Vivo V20 iniciado: múltiplas fontes públicas, Copa/Mundial/ligas principais e atualização em até 45 segundos.");
  scheduleNextRun();
  updateLiveRobot(true).catch(() => undefined);
  timer = setInterval(() => updateLiveRobot(true).catch(() => undefined), LIVE_CACHE_TIME_MS);
  timer.unref?.();
}
