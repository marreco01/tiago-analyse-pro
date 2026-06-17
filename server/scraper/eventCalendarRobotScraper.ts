export type CalendarEventStatus = "scheduled" | "live" | "finished";

export type CalendarRobotEvent = {
  id: string;
  fixtureId: string;
  date: string;
  time: string;
  timestamp: string;
  competition: string;
  league: string;
  country?: string;
  home: string;
  away: string;
  status: CalendarEventStatus;
  statusLabel: string;
  elapsed: number | null;
  homeGoals: number | null;
  awayGoals: number | null;
  homeLogo?: string;
  awayLogo?: string;
  venue?: string;
  source: "calendar-master-espn" | "calendar-master-cache";
  priority: number;
  priorityLabel: "Alta" | "Média" | "Normal";
};

export type CalendarRobotStatus = {
  id: "calendar-master";
  name: string;
  status: "online" | "running" | "error";
  visibleToPublic: false;
  intervalMinutes: number;
  sources: string[];
  lastRunAt?: string;
  nextRunAt?: string;
  totalItems: number;
  todayGames: number;
  liveGames: number;
  upcomingGames: number;
  finishedGames: number;
  lastError?: string;
};

export type CalendarRobotLogEntry = {
  id: string;
  robot: "calendar-master";
  level: "info" | "success" | "error";
  message: string;
  createdAt: string;
  totalItems?: number;
};

const CALENDAR_CACHE_TIME_MS = 1000 * 60 * 5;
const FETCH_TIMEOUT_MS = 6500;
const SOURCES = [
  "Calendário Master V21",
  "ESPN público por competição",
  "Copa/Mundial/Libertadores/Champions/ligas principais",
  "Timezone fixo America/Sao_Paulo",
  "Cache central para alimentar o site todo",
];

const CALENDAR_LEAGUES = [
  { slug: "fifa.world", name: "Copa do Mundo", country: "Mundo", weight: 130, rangeDays: 180 },
  { slug: "fifa.cwc", name: "Mundial de Clubes", country: "Mundo", weight: 124, rangeDays: 120 },
  { slug: "conmebol.libertadores", name: "Libertadores", country: "América do Sul", weight: 118, rangeDays: 90 },
  { slug: "uefa.champions", name: "Champions League", country: "Europa", weight: 116, rangeDays: 90 },
  { slug: "bra.1", name: "Brasileirão Série A", country: "Brasil", weight: 112, rangeDays: 80 },
  { slug: "uefa.europa", name: "Europa League", country: "Europa", weight: 105, rangeDays: 80 },
  { slug: "conmebol.sudamericana", name: "Sul-Americana", country: "América do Sul", weight: 102, rangeDays: 80 },
  { slug: "eng.1", name: "Premier League", country: "Inglaterra", weight: 100, rangeDays: 70 },
  { slug: "esp.1", name: "La Liga", country: "Espanha", weight: 98, rangeDays: 70 },
  { slug: "ita.1", name: "Serie A Itália", country: "Itália", weight: 96, rangeDays: 70 },
  { slug: "ger.1", name: "Bundesliga", country: "Alemanha", weight: 94, rangeDays: 70 },
  { slug: "fra.1", name: "Ligue 1", country: "França", weight: 92, rangeDays: 70 },
  { slug: "bra.2", name: "Brasileirão Série B", country: "Brasil", weight: 78, rangeDays: 45 },
  { slug: "arg.1", name: "Argentina Primera", country: "Argentina", weight: 76, rangeDays: 45 },
  { slug: "mex.1", name: "Liga MX", country: "México", weight: 74, rangeDays: 45 },
  { slug: "usa.1", name: "MLS", country: "Estados Unidos", weight: 70, rangeDays: 45 },
];

const BIG_TEAMS = [
  "flamengo", "palmeiras", "corinthians", "sao paulo", "são paulo", "vasco", "botafogo", "fluminense",
  "gremio", "grêmio", "internacional", "cruzeiro", "atletico-mg", "atlético-mg", "santos", "bahia", "fortaleza",
  "brasil", "brazil", "argentina", "france", "frança", "alemanha", "germany", "portugal", "espanha", "spain", "england", "inglaterra", "italy", "itália",
  "real madrid", "barcelona", "manchester city", "manchester united", "liverpool", "arsenal", "chelsea", "tottenham", "bayern", "dortmund", "psg", "juventus", "milan", "inter", "napoli",
];

const logs: CalendarRobotLogEntry[] = [];
let running = false;
let timer: NodeJS.Timeout | null = null;
let status: CalendarRobotStatus["status"] = "online";
let lastRunAt = "";
let nextRunAt = "";
let lastError = "";

let cache = {
  updatedAt: new Date().toISOString(),
  events: [] as CalendarRobotEvent[],
};

function addLog(level: CalendarRobotLogEntry["level"], message: string, totalItems?: number) {
  logs.unshift({
    id: `calendar-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    robot: "calendar-master",
    level,
    message,
    createdAt: new Date().toISOString(),
    totalItems,
  });
  if (logs.length > 120) logs.length = 120;
}

function scheduleNextRun() {
  nextRunAt = new Date(Date.now() + CALENDAR_CACHE_TIME_MS).toISOString();
}

function ymd(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function brazilDateParts(dateValue: string | Date) {
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  if (Number.isNaN(date.getTime())) return { date: "", time: "--:--" };
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const time = date.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date: day, time };
}

function todayBrazilIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalize(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function parseElapsed(value: unknown): number | null {
  const match = String(value || "").match(/(\d{1,3})/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? Math.max(1, Math.min(130, n)) : null;
}

function score(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function classifyStatus(statusType: any): { status: CalendarEventStatus; label: string; elapsed: number | null } {
  const state = String(statusType?.state || "").toLowerCase();
  const name = String(statusType?.name || statusType?.description || statusType?.detail || statusType?.shortDetail || "").toLowerCase();
  const label = String(statusType?.shortDetail || statusType?.detail || statusType?.description || statusType?.name || "Agendado").trim();
  if (Boolean(statusType?.completed) || state === "post") return { status: "finished", label: label || "Finalizado", elapsed: null };
  if (state === "in" || name.includes("progress") || name.includes("live") || name.includes("half")) return { status: "live", label: label || "Ao vivo", elapsed: parseElapsed(label) };
  return { status: "scheduled", label: label || "Agendado", elapsed: null };
}

function priorityFor(home: string, away: string, leagueWeight: number) {
  const names = `${normalize(home)} ${normalize(away)}`;
  const bigHits = BIG_TEAMS.filter((team) => names.includes(normalize(team))).length;
  const derbyBoost = normalize(home).split(" ")[0] === normalize(away).split(" ")[0] ? 4 : 0;
  const priority = Math.min(100, Math.round((leagueWeight * 0.65) + (bigHits * 9) + derbyBoost));
  return {
    priority,
    priorityLabel: priority >= 82 ? "Alta" as const : priority >= 66 ? "Média" as const : "Normal" as const,
  };
}

async function fetchEspnLeague(league: (typeof CALENDAR_LEAGUES)[number], from: Date, to: Date): Promise<CalendarRobotEvent[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.slug}/scoreboard?dates=${ymd(from)}-${ymd(to)}&limit=500`;
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "AnalyseProCalendarBot/21 public schedule monitor" },
    });
    clearTimeout(timeout);
    if (!response.ok) return [];
    const json: any = await response.json();
    const events = Array.isArray(json?.events) ? json.events : [];

    return events.map((event: any) => {
      const competition = event?.competitions?.[0];
      const competitors = Array.isArray(competition?.competitors) ? competition.competitors : [];
      const home = competitors.find((item: any) => item.homeAway === "home") || competitors[0];
      const away = competitors.find((item: any) => item.homeAway === "away") || competitors[1];
      if (!home || !away) return null;

      const homeName = String(home.team?.displayName || home.team?.shortDisplayName || home.team?.name || "").trim();
      const awayName = String(away.team?.displayName || away.team?.shortDisplayName || away.team?.name || "").trim();
      if (!homeName || !awayName) return null;

      const rawDate = String(event.date || competition?.date || "");
      const parts = brazilDateParts(rawDate);
      if (!parts.date) return null;
      const statusInfo = classifyStatus(competition?.status?.type || event?.status?.type);
      const p = priorityFor(homeName, awayName, league.weight);
      const id = String(event.id || `${league.slug}-${parts.date}-${homeName}-${awayName}`).replace(/\s+/g, "-");

      return {
        id,
        fixtureId: id,
        date: parts.date,
        time: parts.time,
        timestamp: rawDate,
        competition: league.name,
        league: league.name,
        country: league.country,
        home: homeName,
        away: awayName,
        status: statusInfo.status,
        statusLabel: statusInfo.label,
        elapsed: statusInfo.elapsed,
        homeGoals: score(home.score),
        awayGoals: score(away.score),
        homeLogo: home.team?.logo || home.team?.logos?.[0]?.href || "",
        awayLogo: away.team?.logo || away.team?.logos?.[0]?.href || "",
        venue: competition?.venue?.fullName || event?.competitions?.[0]?.venue?.fullName || "",
        source: "calendar-master-espn" as const,
        priority: p.priority,
        priorityLabel: p.priorityLabel,
      };
    }).filter(Boolean) as CalendarRobotEvent[];
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

function orderEvents(events: CalendarRobotEvent[]) {
  const today = todayBrazilIso();
  return [...events].sort((a, b) => {
    const liveA = a.status === "live" ? 1 : 0;
    const liveB = b.status === "live" ? 1 : 0;
    if (liveA !== liveB) return liveB - liveA;
    const todayA = a.date === today ? 1 : 0;
    const todayB = b.date === today ? 1 : 0;
    if (todayA !== todayB) return todayB - todayA;
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.time !== b.time) return a.time.localeCompare(b.time);
    return b.priority - a.priority;
  });
}

async function collectCalendarEvents() {
  const from = addDays(new Date(), -2);
  const batches = await Promise.all(CALENDAR_LEAGUES.map((league) => fetchEspnLeague(league, from, addDays(new Date(), league.rangeDays))));
  const unique = new Map<string, CalendarRobotEvent>();
  for (const event of batches.flat()) {
    const key = `${event.date}-${normalize(event.competition)}-${normalize(event.home)}-${normalize(event.away)}`;
    const existing = unique.get(key);
    if (!existing || event.priority > existing.priority || event.status === "live") unique.set(key, event);
  }
  return orderEvents(Array.from(unique.values()));
}

export async function updateCalendarRobot(force = false) {
  if (!force && cache.events.length && Date.now() - new Date(cache.updatedAt).getTime() < CALENDAR_CACHE_TIME_MS) return cache;
  status = "running";
  lastError = "";
  try {
    const events = await collectCalendarEvents();
    cache = { updatedAt: new Date().toISOString(), events };
    lastRunAt = cache.updatedAt;
    status = "online";
    scheduleNextRun();
    addLog(events.length ? "success" : "info", events.length ? `Calendário Master V21 atualizado: ${events.length} eventos reais encontrados.` : "Nenhum evento encontrado nas fontes públicas agora.", events.length);
  } catch (error) {
    lastError = error instanceof Error ? error.message : "Erro desconhecido";
    status = "error";
    scheduleNextRun();
    addLog("error", `Falha no Calendário Master V21: ${lastError}`, cache.events.length);
  }
  return cache;
}

export function getCalendarRobotStatus(): CalendarRobotStatus {
  const today = todayBrazilIso();
  const events = cache.events;
  return {
    id: "calendar-master",
    name: "Robô Calendário Master V21",
    status,
    visibleToPublic: false,
    intervalMinutes: Math.round(CALENDAR_CACHE_TIME_MS / 60000),
    sources: SOURCES,
    lastRunAt,
    nextRunAt,
    totalItems: events.length,
    todayGames: events.filter((e) => e.date === today).length,
    liveGames: events.filter((e) => e.status === "live").length,
    upcomingGames: events.filter((e) => e.status === "scheduled" && e.date >= today).length,
    finishedGames: events.filter((e) => e.status === "finished").length,
    lastError,
  };
}

export function getCalendarRobotLogs() { return logs; }
export function getCachedCalendarRobot() { return cache; }
export function getCalendarEventsByDate(date = todayBrazilIso()) { return cache.events.filter((event) => event.date === date); }
export function getUpcomingCalendarEvents(limit = 30) { return cache.events.filter((event) => event.status === "scheduled" && event.date >= todayBrazilIso()).slice(0, limit); }
export function getLiveCalendarEvents(limit = 30) { return cache.events.filter((event) => event.status === "live").slice(0, limit); }

export function startCalendarRobot() {
  if (running) return;
  running = true;
  addLog("info", "Robô Calendário Master V21 iniciado: datas/horários oficiais para alimentar todo o site.");
  scheduleNextRun();
  updateCalendarRobot(true).catch(() => undefined);
  timer = setInterval(() => updateCalendarRobot(true).catch(() => undefined), CALENDAR_CACHE_TIME_MS);
  timer.unref?.();
}
