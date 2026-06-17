export type UpcomingRobotGame = {
  id: string;
  fixtureId: string;
  date: string;
  time: string;
  competition: string;
  league: string;
  group?: string;
  home: string;
  away: string;
  status: "scheduled";
  source: "upcoming-robot-public";
  importance: number;
  importanceLabel: "Alta" | "Média" | "Normal";
  reason: string;
  homeLogo?: string;
  awayLogo?: string;
  venue?: string;
};

export type UpcomingRobotStatus = {
  id: "proximos";
  name: string;
  status: "online" | "running" | "error";
  visibleToPublic: false;
  intervalMinutes: number;
  sources: string[];
  lastRunAt?: string;
  nextRunAt?: string;
  totalItems: number;
  gamesAnalyzed: number;
  topGames: number;
  importantGames: number;
  lastError?: string;
};

export type UpcomingRobotLogEntry = {
  id: string;
  robot: "proximos";
  level: "info" | "success" | "error";
  message: string;
  createdAt: string;
  totalItems?: number;
};

const UPCOMING_CACHE_TIME_MS = 1000 * 60 * 10;
const SOURCES = [
  "ESPN público por competição",
  "Copa do Mundo/FIFA + principais ligas",
  "Sem calendário interno/fake",
];

const ESPN_LEAGUES = [
  { slug: "fifa.world", name: "Copa do Mundo", weight: 120, tier: "world" },
  { slug: "fifa.cwc", name: "Mundial de Clubes", weight: 112, tier: "world" },
  { slug: "conmebol.libertadores", name: "Libertadores", weight: 108, tier: "continental" },
  { slug: "uefa.champions", name: "Champions League", weight: 106, tier: "continental" },
  { slug: "bra.1", name: "Brasileirão Série A", weight: 101, tier: "national" },
  { slug: "eng.1", name: "Premier League", weight: 99, tier: "national" },
  { slug: "esp.1", name: "La Liga", weight: 96, tier: "national" },
  { slug: "ita.1", name: "Serie A Itália", weight: 94, tier: "national" },
  { slug: "ger.1", name: "Bundesliga", weight: 92, tier: "national" },
  { slug: "fra.1", name: "Ligue 1", weight: 88, tier: "national" },
  { slug: "uefa.europa", name: "Europa League", weight: 86, tier: "continental" },
  { slug: "conmebol.sudamericana", name: "Sul-Americana", weight: 84, tier: "continental" },
  { slug: "usa.1", name: "MLS", weight: 74, tier: "national" },
];

const BIG_TEAMS = [
  "flamengo", "palmeiras", "corinthians", "sao paulo", "são paulo", "vasco", "botafogo", "fluminense",
  "gremio", "grêmio", "internacional", "cruzeiro", "atletico-mg", "atlético-mg", "santos", "bahia", "fortaleza",
  "brasil", "brazil", "argentina", "franca", "frança", "france", "alemanha", "germany", "portugal", "espanha", "spain",
  "inglaterra", "england", "italia", "itália", "italy", "uruguay", "uruguai", "netherlands", "paises baixos", "países baixos",
  "real madrid", "barcelona", "manchester city", "manchester united", "liverpool", "arsenal", "chelsea", "bayern", "psg", "juventus", "milan", "inter", "napoli",
];

const logs: UpcomingRobotLogEntry[] = [];
let running = false;
let timer: NodeJS.Timeout | null = null;
let status: UpcomingRobotStatus["status"] = "online";
let lastRunAt = "";
let nextRunAt = "";
let lastError = "";

let cache = {
  updatedAt: new Date().toISOString(),
  games: [] as UpcomingRobotGame[],
};

function scheduleNextRun() {
  nextRunAt = new Date(Date.now() + UPCOMING_CACHE_TIME_MS).toISOString();
}

function addLog(level: UpcomingRobotLogEntry["level"], message: string, totalItems?: number) {
  logs.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    robot: "proximos",
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

function isoDateFromEspn(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function timeFromEspn(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
}

function todayBrazilIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function normalizeText(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function importanceFor(home: string, away: string, competition: string, base: number) {
  const text = normalizeText(`${home} ${away} ${competition}`);
  const hits = BIG_TEAMS.filter((team) => text.includes(normalizeText(team))).length;
  let importance = base + hits * 7;
  if (text.includes("copa do mundo") || text.includes("world cup")) importance += 18;
  if (text.includes("mundial")) importance += 14;
  if (text.includes("libertadores") || text.includes("champions")) importance += 10;
  if (hits >= 2) importance += 8;
  importance = Math.max(1, Math.min(100, Math.round(importance)));
  return {
    importance,
    importanceLabel: importance >= 78 ? "Alta" as const : importance >= 58 ? "Média" as const : "Normal" as const,
    reason: competition.includes("Copa do Mundo") ? "Copa do Mundo"
      : hits >= 2 ? "Clássico ou clubes/seleções fortes"
      : importance >= 78 ? "Liga principal"
      : "Calendário público",
  };
}

async function fetchEspnLeague(league: { slug: string; name: string; weight: number; tier: string }, from: Date, to: Date) {
  const dates = `${ymd(from)}-${ymd(to)}`;
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.slug}/scoreboard?dates=${dates}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "Mozilla/5.0 AnalyseProBot/2.0", accept: "application/json,text/plain,*/*" },
    });
    clearTimeout(timeout);
    if (!response.ok) return [];
    const data: any = await response.json().catch(() => null);
    const events = Array.isArray(data?.events) ? data.events : [];
    return events.map((event: any) => {
      const competition = event?.competitions?.[0];
      const competitors = Array.isArray(competition?.competitors) ? competition.competitors : [];
      const home = competitors.find((item: any) => item.homeAway === "home") || competitors[0];
      const away = competitors.find((item: any) => item.homeAway === "away") || competitors[1];
      const statusType = competition?.status?.type || event?.status?.type;
      const completed = Boolean(statusType?.completed);
      const state = String(statusType?.state || "").toLowerCase();
      if (!home || !away || completed || state === "in") return null;
      const homeName = String(home.team?.displayName || home.team?.shortDisplayName || home.team?.name || "").trim();
      const awayName = String(away.team?.displayName || away.team?.shortDisplayName || away.team?.name || "").trim();
      const date = isoDateFromEspn(event.date || competition.date || "");
      const time = timeFromEspn(event.date || competition.date || "");
      if (!homeName || !awayName || !date || date < todayBrazilIso()) return null;
      const rank = importanceFor(homeName, awayName, league.name, league.weight);
      const id = String(event.id || `${league.slug}-${date}-${homeName}-${awayName}`).replace(/\s+/g, "-");
      return {
        id,
        fixtureId: id,
        date,
        time,
        competition: league.name,
        league: league.name,
        group: event?.season?.slug || undefined,
        home: homeName,
        away: awayName,
        status: "scheduled" as const,
        source: "upcoming-robot-public" as const,
        importance: rank.importance,
        importanceLabel: rank.importanceLabel,
        reason: rank.reason,
        homeLogo: home.team?.logo || home.team?.logos?.[0]?.href || "",
        awayLogo: away.team?.logo || away.team?.logos?.[0]?.href || "",
        venue: competition?.venue?.fullName || event?.competitions?.[0]?.venue?.fullName || "",
      };
    }).filter(Boolean) as UpcomingRobotGame[];
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

async function collectUpcomingGames() {
  const from = new Date();
  const toShort = new Date();
  toShort.setDate(toShort.getDate() + 45);
  const toWorldCup = new Date();
  toWorldCup.setDate(toWorldCup.getDate() + 90);

  const batches = await Promise.all(ESPN_LEAGUES.map((league) => {
    const to = league.tier === "world" ? toWorldCup : toShort;
    return fetchEspnLeague(league, from, to);
  }));

  const unique = new Map<string, UpcomingRobotGame>();
  for (const game of batches.flat()) unique.set(`${game.date}-${game.home}-${game.away}-${game.competition}`, game);

  const games = Array.from(unique.values());
  const world = games.filter((g) => /Copa do Mundo|Mundial/i.test(g.competition));
  const libertadoresChampions = games.filter((g) => /Libertadores|Champions/i.test(g.competition));
  const brasileirao = games.filter((g) => /Brasileirão Série A/i.test(g.competition));
  const topLeagues = games.filter((g) => /Premier League|La Liga|Serie A Itália|Bundesliga|Ligue 1/i.test(g.competition));
  const others = games.filter((g) => !world.includes(g) && !libertadoresChampions.includes(g) && !brasileirao.includes(g) && !topLeagues.includes(g));

  const ordered = [...world, ...libertadoresChampions, ...brasileirao, ...topLeagues, ...others]
    .sort((a, b) => b.importance - a.importance || a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  return ordered.slice(0, 10);
}

export async function updateUpcomingRobot(force = false) {
  if (!force && cache.games.length && Date.now() - new Date(cache.updatedAt).getTime() < UPCOMING_CACHE_TIME_MS) return cache;
  status = "running";
  lastError = "";
  try {
    const games = await collectUpcomingGames();
    cache = { updatedAt: new Date().toISOString(), games };
    lastRunAt = cache.updatedAt;
    status = "online";
    scheduleNextRun();
    addLog(games.length ? "success" : "info", games.length ? `Robô Próximos Jogos V11: ${games.length} jogos principais encontrados.` : "Nenhum jogo principal encontrado nas fontes públicas agora.", games.length);
  } catch (error) {
    lastError = error instanceof Error ? error.message : "Erro desconhecido";
    status = "error";
    scheduleNextRun();
    addLog("error", `Falha no Robô Próximos Jogos V11: ${lastError}`, cache.games.length);
  }
  return cache;
}

export function getUpcomingRobotStatus(): UpcomingRobotStatus {
  const games = cache.games;
  return {
    id: "proximos",
    name: "Robô Próximos Jogos V11",
    status,
    visibleToPublic: false,
    intervalMinutes: Math.round(UPCOMING_CACHE_TIME_MS / 60000),
    sources: SOURCES,
    lastRunAt,
    nextRunAt,
    totalItems: games.length,
    gamesAnalyzed: games.length,
    topGames: games.length,
    importantGames: games.filter((game) => game.importance >= 78).length,
    lastError,
  };
}

export function getUpcomingRobotLogs() { return logs; }
export function getCachedUpcomingRobot() { return cache; }
export function startUpcomingRobot() {
  if (running) return;
  running = true;
  addLog("info", "Robô Próximos Jogos V11 iniciado: Copa do Mundo + principais ligas + fonte pública.");
  scheduleNextRun();
  updateUpcomingRobot(true).catch(() => undefined);
  timer = setInterval(() => updateUpcomingRobot(true).catch(() => undefined), UPCOMING_CACHE_TIME_MS);
  timer.unref?.();
}
