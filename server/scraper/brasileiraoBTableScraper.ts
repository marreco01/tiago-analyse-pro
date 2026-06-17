import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type BrasileiraoBStandingRow = {
  rank: number;
  team: string;
  short?: string;
  logo?: string;
  teamId?: string;
  sourceQuality?: "real" | "cache";
  points: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDiff: number;
  form?: string;
  last5?: Array<"W" | "D" | "L">;
};

export type BrasileiraoBTableCache = {
  updatedAt: string;
  source: string;
  season: number;
  standings: BrasileiraoBStandingRow[];
  topScorers: BrasileiraoBTopScorer[];
  nextRound: BrasileiraoBNextMatch[];
  fixturesUpdatedAt?: string;
};

export type BrasileiraoBTopScorer = {
  rank: number;
  player: string;
  team: string;
  goals: number;
  photo?: string;
};

export type BrasileiraoBNextMatch = {
  id: string;
  round: string;
  date: string;
  time: string;
  home: string;
  away: string;
  homeLogo?: string;
  awayLogo?: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
  elapsed?: number | null;
  stadium?: string;
  city?: string;
  status?: string;
};

export type BrasileiraoBTableRobotStatus = {
  id: string;
  name: string;
  status: "online" | "running" | "error";
  visibleToPublic: false;
  intervalMinutes: number;
  fixturesIntervalMinutes?: number;
  sources: string[];
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  totalItems: number;
  lastExecutionMs?: number;
  topScorersCount?: number;
  nextMatchesCount?: number;
};

export type BrasileiraoBTableRobotLogEntry = {
  id: string;
  createdAt: string;
  robot: string;
  level: "info" | "success" | "error";
  message: string;
};

const ROBOT_ID = "brasileiraoB-table";
const ROBOT_NAME = "Robô Classificação Brasileirão Série B";
const UPDATE_EVERY_MS = 5 * 60 * 1000;
const FIXTURES_UPDATE_EVERY_MS = 10 * 60 * 1000;

let intervalStarted = false;
let updating: Promise<BrasileiraoBTableCache> | null = null;
let cache: BrasileiraoBTableCache = {
  updatedAt: new Date(0).toISOString(),
  source: "empty",
  season: new Date().getFullYear(),
  standings: [],
  topScorers: [],
  nextRound: [],
  fixturesUpdatedAt: new Date(0).toISOString(),
};

const SNAPSHOT_FILE = join(process.cwd(), "server", "cache", "brasileiraoB-master-snapshot.json");

function loadSnapshotFromDisk() {
  try {
    if (!existsSync(SNAPSHOT_FILE)) return;
    const parsed = JSON.parse(readFileSync(SNAPSHOT_FILE, "utf8"));
    if (parsed?.standings?.length) cache = parsed;
  } catch {
    // snapshot quebrado não derruba o servidor
  }
}

function saveSnapshotToDisk(next: BrasileiraoBTableCache) {
  try {
    mkdirSync(dirname(SNAPSHOT_FILE), { recursive: true });
    writeFileSync(SNAPSHOT_FILE, JSON.stringify(next, null, 2));
  } catch {
    // Railway pode estar sem volume; cache em memória continua funcionando
  }
}

loadSnapshotFromDisk();

let status: BrasileiraoBTableRobotStatus = {
  id: ROBOT_ID,
  name: ROBOT_NAME,
  status: "online",
  visibleToPublic: false,
  intervalMinutes: 5,
  fixturesIntervalMinutes: 10,
  sources: ["ESPN público classificação", "ESPN scoreboard", "ESPN schedules por time", "TheSportsDB últimos jogos", "Cache local", "Último snapshot válido"],
  lastRunAt: null,
  lastSuccessAt: null,
  lastError: null,
  totalItems: 0,
  lastExecutionMs: 0,
  topScorersCount: 0,
  nextMatchesCount: 0,
};

const logs: BrasileiraoBTableRobotLogEntry[] = [];

function normalizeClubName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}


const BRASILEIRAOB_MASTER_ALIASES: Record<string, string[]> = {
  flamengo: ["flamengo", "cr flamengo"],
  palmeiras: ["palmeiras", "se palmeiras"],
  fluminense: ["fluminense", "fluminense fc"],
  botafogo: ["botafogo", "botafogo rj", "botafogo de futebol e regatas"],
  saopaulo: ["sao paulo", "são paulo", "sao paulo fc", "spfc"],
  corinthians: ["corinthians", "sc corinthians", "corinthians paulista"],
  santos: ["santos", "santos fc"],
  cruzeiro: ["cruzeiro", "cruzeiro ec"],
  atleticomg: ["atletico-mg", "atlético-mg", "atletico mg", "atlético mg", "atletico mineiro", "atlético mineiro", "cam"],
  athleticopr: ["athletico-pr", "athletico pr", "athletico paranaense", "atlético pr", "atletico pr", "cap", "club athletico paranaense"],
  internacional: ["internacional", "inter", "sc internacional", "internacional rs"],
  gremio: ["gremio", "grêmio", "gremio fbpa", "grêmio fbpa"],
  bahia: ["bahia", "ec bahia", "esporte clube bahia"],
  vitoria: ["vitoria", "vitória", "ec vitoria", "ec vitória"],
  vasco: ["vasco", "vasco da gama", "cr vasco da gama"],
  bragantino: ["bragantino", "red bull bragantino", "rb bragantino", "redbull bragantino"],
  coritiba: ["coritiba", "coritiba fc", "cfc"],
  chapecoense: ["chapecoense", "chapecoense af", "associacao chapecoense", "associação chapecoense"],
  mirassol: ["mirassol", "mirassol fc"],
  remo: ["remo", "clube do remo"],
  fortaleza: ["fortaleza", "fortaleza ec"],
  ceara: ["ceara", "ceará", "ceara sc", "ceará sc"],
  sport: ["sport", "sport recife", "sport club recife"],
  juventude: ["juventude", "ec juventude"],
  goias: ["goias", "goiás", "goias ec", "goiás ec"],
  cuiaba: ["cuiaba", "cuiabá", "cuiaba ec", "cuiabá ec"],
};

function masterClubKey(value: string) {
  const normalized = normalizeClubName(value);
  for (const [canonical, aliases] of Object.entries(BRASILEIRAOB_MASTER_ALIASES)) {
    if (aliases.some((alias) => normalizeClubName(alias) === normalized)) return canonical;
  }
  return normalized;
}

function namesMatch(a: string, b: string) {
  return masterClubKey(a) === masterClubKey(b);
}

const BRASILEIRAOB_LOGOS: Record<string, string> = {
  flamengo: "https://media.api-sports.io/football/teams/127.png",
  palmeiras: "https://media.api-sports.io/football/teams/121.png",
  botafogo: "https://media.api-sports.io/football/teams/120.png",
  cruzeiro: "https://media.api-sports.io/football/teams/135.png",
  bahia: "https://media.api-sports.io/football/teams/118.png",
  saopaulo: "https://media.api-sports.io/football/teams/126.png",
  corinthians: "https://media.api-sports.io/football/teams/131.png",
  fluminense: "https://media.api-sports.io/football/teams/124.png",
  gremio: "https://media.api-sports.io/football/teams/130.png",
  internacional: "https://media.api-sports.io/football/teams/119.png",
  atleticomg: "https://media.api-sports.io/football/teams/1062.png",
  atleticomineiro: "https://media.api-sports.io/football/teams/1062.png",
  athleticopr: "https://media.api-sports.io/football/teams/134.png",
  athleticoparanaense: "https://media.api-sports.io/football/teams/134.png",
  bragantino: "https://media.api-sports.io/football/teams/794.png",
  redbullbragantino: "https://media.api-sports.io/football/teams/794.png",
  vasco: "https://media.api-sports.io/football/teams/133.png",
  vascodagama: "https://media.api-sports.io/football/teams/133.png",
  santos: "https://media.api-sports.io/football/teams/128.png",
  fortaleza: "https://media.api-sports.io/football/teams/154.png",
  ceara: "https://media.api-sports.io/football/teams/129.png",
  vitoria: "https://media.api-sports.io/football/teams/159.png",
  sport: "https://media.api-sports.io/football/teams/123.png",
  juventude: "https://media.api-sports.io/football/teams/152.png",
  coritiba: "https://media.api-sports.io/football/teams/147.png",
  chapecoense: "https://media.api-sports.io/football/teams/132.png",
  remo: "https://media.api-sports.io/football/teams/146.png",
  mirassol: "https://media.api-sports.io/football/teams/7834.png",
  goias: "https://media.api-sports.io/football/teams/151.png",
  guarani: "https://media.api-sports.io/football/teams/138.png",
  cuiaba: "https://media.api-sports.io/football/teams/1193.png",
};

function brasileiraoBLogoFor(team: string, current?: string) {
  const key = masterClubKey(team);
  return BRASILEIRAOB_LOGOS[key] || BRASILEIRAOB_LOGOS[key.replace(/^redbull/, "")] || current;
}



// V45: artilharia fake removida.


function normalizeResultToken(value: string): "W" | "D" | "L" | null {
  const v = value.trim().toUpperCase();
  if (["W", "V"].includes(v)) return "W";
  if (["D", "E"].includes(v)) return "D";
  if (["L", "D"].includes(v) && value.trim().toUpperCase() === "L") return "L";
  return null;
}

function parseLast5(entry: any): Array<"W" | "D" | "L"> {
  const raw = String(entry?.note || entry?.form || entry?.streak || "");
  const byLetters = raw.split(/[^A-Za-z]+/).flatMap((x) => x.split("")).map(normalizeResultToken).filter(Boolean) as Array<"W" | "D" | "L">;
  return byLetters.slice(-5);
}


function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function yyyymmdd(date: Date) {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
}

function hhmmFromIso(value?: string) {
  if (!value) return "--:--";
  try {
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value));
  } catch {
    return value.slice(11, 16) || "--:--";
  }
}

function yyyyMmDdFromIso(value?: string) {
  if (!value) return new Date().toISOString().slice(0, 10);
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return value.slice(0, 10) || new Date().toISOString().slice(0, 10);
  }
}

function logoFromCompetitor(competitor: any) {
  const team = competitor?.team || competitor || {};
  if (Array.isArray(team.logos) && team.logos.length) {
    return team.logos.find((logo: any) => String(logo?.rel || "").includes("full"))?.href || team.logos[0]?.href;
  }
  return team.logo || competitor?.logo || undefined;
}

function normalizeEspnMatchStatus(type: any) {
  const state = String(type?.state || "").toLowerCase();
  const name = String(type?.name || "").toUpperCase();
  const description = String(type?.description || type?.detail || "").toLowerCase();
  if (type?.completed || state.includes("post") || description.includes("final")) return "FT";
  if (state.includes("in") || name.includes("IN_PROGRESS") || description.includes("halftime")) return description.includes("half") ? "HT" : "LIVE";
  if (name === "STATUS_HALFTIME") return "HT";
  if (name === "STATUS_FIRST_HALF") return "1H";
  if (name === "STATUS_SECOND_HALF") return "2H";
  if (state.includes("pre") || name.includes("SCHEDULED")) return "NS";
  return name || state || "NS";
}

function elapsedFromStatus(type: any) {
  const raw = type?.shortDetail || type?.detail || type?.description || "";
  const match = String(raw).match(/(\d{1,3})['’]?/);
  const value = match ? Number(match[1]) : Number(type?.clock);
  return Number.isFinite(value) && value > 0 ? value : null;
}


function parseEspnScoreboardEvents(data: any): BrasileiraoBNextMatch[] {
  const events = Array.isArray(data?.events) ? data.events : [];
  return events.map((event: any, index: number) => {
    const competition = Array.isArray(event?.competitions) ? event.competitions[0] : null;
    const competitors = Array.isArray(competition?.competitors) ? competition.competitors : [];
    const home = competitors.find((item: any) => item?.homeAway === "home") || competitors[0] || {};
    const away = competitors.find((item: any) => item?.homeAway === "away") || competitors[1] || {};
    const homeTeam = home?.team || {};
    const awayTeam = away?.team || {};
    const date = event?.date || competition?.date;
    const statusType = event?.status?.type || competition?.status?.type || {};
    const homeName = String(homeTeam.displayName || homeTeam.name || homeTeam.shortDisplayName || "").trim();
    const awayName = String(awayTeam.displayName || awayTeam.name || awayTeam.shortDisplayName || "").trim();
    if (!homeName || !awayName) return null;
    return {
      id: String(event?.id || `brasileiraoB-next-${yyyyMmDdFromIso(date)}-${index}`),
      round: String(event?.season?.slug || event?.week?.text || event?.name || "Próximos jogos").replace(/^Regular Season$/i, "Próxima rodada"),
      date: yyyyMmDdFromIso(date),
      time: hhmmFromIso(date),
      home: homeName,
      away: awayName,
      homeLogo: logoFromCompetitor(home),
      awayLogo: logoFromCompetitor(away),
      homeGoals: parseScore(home?.score),
      awayGoals: parseScore(away?.score),
      elapsed: elapsedFromStatus(statusType),
      stadium: competition?.venue?.fullName || competition?.venue?.shortName || undefined,
      city: competition?.venue?.address?.city || undefined,
      status: normalizeEspnMatchStatus(statusType),
    } as BrasileiraoBNextMatch;
  }).filter(Boolean) as BrasileiraoBNextMatch[];
}

async function fetchEspnNextRound(): Promise<BrasileiraoBNextMatch[]> {
  const today = new Date();
  const windows: string[] = [];
  const startLive = new Date(today);
  // Série B: mantém uma janela maior para o placar ao vivo não sumir e para
  // jogos encerrados aparecerem como FINALIZADO, sem parecer que ainda vão começar às 21h.
  startLive.setDate(today.getDate() - 3);
  for (const days of [1, 7, 14, 21, 30, 45]) {
    const end = new Date(today);
    end.setDate(today.getDate() + days);
    windows.push(`${yyyymmdd(startLive)}-${yyyymmdd(end)}`);
  }

  const urls = windows.flatMap((dates) => [
    `https://site.api.espn.com/apis/site/v2/sports/soccer/bra.2/scoreboard?dates=${dates}&limit=50`,
    `https://site.web.api.espn.com/apis/v2/sports/soccer/bra.2/scoreboard?dates=${dates}&limit=50`,
  ]);

  let lastError: unknown = null;
  for (const url of urls) {
    try {
      const json = await fetchJson(url);
      const parsed = parseEspnScoreboardEvents(json)
        .filter((match) => {
          // Nunca remove jogos ao vivo/finalizados recentes só por cálculo de timezone.
          // O horário recebido já é convertido para America/Sao_Paulo e serve para exibição,
          // não para decidir se o jogo é válido.
          const status = String(match.status || "").toUpperCase();
          if (["LIVE", "1H", "2H", "HT", "FT", "AET", "PEN", "FINAL"].includes(status)) return true;
          const t = +new Date(`${match.date}T${match.time === "--:--" ? "00:00" : match.time}:00-03:00`);
          return !Number.isFinite(t) || t >= Date.now() - 12 * 60 * 60 * 1000;
        })
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
      if (parsed.length) return parsed.slice(0, 20);
      lastError = new Error("Calendário público sem jogos no período consultado.");
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
  return [];
}

function buildNextRoundFromTable(rows: BrasileiraoBStandingRow[]): BrasileiraoBNextMatch[] {
  // V44: sem grade inventada por posição da tabela. Próxima rodada só vem de fonte pública/cache.
  return [];
}

function buildTopScorersFromTable(rows: BrasileiraoBStandingRow[]): BrasileiraoBTopScorer[] {
  // V44: sem artilharia inventada. Só retorna quando houver coletor real de artilharia.
  return [];
}

// V45: fallbackTeams removido.


function addLog(level: "info" | "success" | "error", message: string) {
  logs.unshift({ id: `brasileiraoB-${Date.now()}-${Math.random().toString(16).slice(2)}`, createdAt: new Date().toISOString(), robot: ROBOT_NAME, level, message });
  if (logs.length > 80) logs.pop();
}

function numberFrom(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function statValue(stats: any[], names: string[], fallback = 0) {
  const wanted = names.map((x) => x.toLowerCase());
  const found = stats.find((stat) => {
    const candidates = [stat?.name, stat?.displayName, stat?.shortDisplayName, stat?.abbreviation].filter(Boolean).map((x) => String(x).toLowerCase());
    return candidates.some((candidate) => wanted.includes(candidate));
  });
  return numberFrom(found?.value ?? found?.displayValue, fallback);
}

function normalizeRow(entry: any, index: number): BrasileiraoBStandingRow | null {
  const team = entry?.team || entry?.competitor || entry?.club || {};
  const stats = Array.isArray(entry?.stats) ? entry.stats : [];
  const name = String(team?.displayName || team?.name || team?.shortDisplayName || entry?.teamName || "").trim();
  if (!name) return null;

  const wins = statValue(stats, ["wins", "w", "vitórias", "v"]);
  const draws = statValue(stats, ["ties", "draws", "d", "empates", "e"]);
  const losses = statValue(stats, ["losses", "l", "derrotas"]);
  const played = statValue(stats, ["gamesPlayed", "matchesPlayed", "played", "gp", "jogos", "j"], wins + draws + losses);
  const goalsFor = statValue(stats, ["pointsFor", "goalsFor", "gf", "gols pró", "gp"]);
  const goalsAgainst = statValue(stats, ["pointsAgainst", "goalsAgainst", "ga", "gols contra", "gc"]);
  const goalsDiff = statValue(stats, ["pointDifferential", "goalDifference", "gd", "saldo", "sg"], goalsFor - goalsAgainst);
  const points = statValue(stats, ["points", "pts", "pontos", "p"], wins * 3 + draws);
  const rank = statValue(stats, ["rank", "position", "posição"], index + 1);

  return {
    rank,
    team: name,
    teamId: team?.id ? String(team.id) : undefined,
    sourceQuality: "real",
    short: team?.abbreviation || team?.shortDisplayName || undefined,
    logo: brasileiraoBLogoFor(name, Array.isArray(team?.logos) ? (team.logos.find((logo: any) => String(logo?.rel || "").includes("full"))?.href || team.logos[0]?.href) : team?.logo || undefined),
    points,
    played,
    win: wins,
    draw: draws,
    lose: losses,
    goalsFor,
    goalsAgainst,
    goalsDiff,
    form: String(entry?.note || entry?.form || ""),
    last5: parseLast5(entry),
  };
}


function hashTeamSeed(team: string) {
  return normalizeClubName(team).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function buildMasterLast5FromRecord(team: string, wins: number, draws: number, losses: number): Array<"W" | "D" | "L"> {
  // V44: removido gerador de bolinhas por campanha. Forma recente só por partida real ou snapshot válido.
  return [];
}

function fixLast5WithMasterFallback(team: string, parsed: Array<"W" | "D" | "L">, wins: number, draws: number, losses: number) {
  const valid = parsed.filter((x) => x === "W" || x === "D" || x === "L").slice(-5);
  return valid.length >= 5 ? valid : [];
}

function parseEspnStandings(data: any): BrasileiraoBStandingRow[] {
  const candidates: any[] = [];

  const children = Array.isArray(data?.children) ? data.children : [];
  for (const child of children) {
    const entries = child?.standings?.entries;
    if (Array.isArray(entries)) candidates.push(...entries);
  }

  if (Array.isArray(data?.standings?.entries)) candidates.push(...data.standings.entries);
  if (Array.isArray(data?.entries)) candidates.push(...data.entries);

  const rows = candidates
    .map((entry, index) => normalizeRow(entry, index))
    .filter((row): row is BrasileiraoBStandingRow => Boolean(row?.team));

  const seen = new Set<string>();
  return rows
    .filter((row) => {
      const key = row.team.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 20)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}


function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseScore(value: unknown) {
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function competitorName(item: any) {
  const team = item?.team || item || {};
  return String(team.displayName || team.name || team.shortDisplayName || item?.displayName || item?.name || "").trim();
}

function eventIsFinished(event: any, competition: any) {
  const type = event?.status?.type || competition?.status?.type || {};
  const state = String(type.state || type.name || "").toLowerCase();
  return Boolean(type.completed) || state.includes("post") || state.includes("final") || state === "full time";
}

function mergeRecentFormsFromEvents(data: any, teamNames: string[], forms: Map<string, Array<"W" | "D" | "L">>) {
  const wanted = new Map(teamNames.map((name) => [masterClubKey(name), name]));
  const events = Array.isArray(data?.events) ? data.events : [];
  const sorted = [...events].sort((a, b) => +new Date(b?.date || 0) - +new Date(a?.date || 0));

  for (const event of sorted) {
    const competition = Array.isArray(event?.competitions) ? event.competitions[0] : null;
    const competitors = Array.isArray(competition?.competitors) ? competition.competitors : [];
    if (competitors.length < 2 || !eventIsFinished(event, competition)) continue;

    const a = competitors[0];
    const b = competitors[1];
    const nameA = competitorName(a);
    const nameB = competitorName(b);
    const scoreA = parseScore(a?.score ?? a?.curatedRank?.current);
    const scoreB = parseScore(b?.score ?? b?.curatedRank?.current);
    if (!nameA || !nameB || scoreA === null || scoreB === null) continue;

    const keyA = wanted.get(masterClubKey(nameA));
    const keyB = wanted.get(masterClubKey(nameB));
    const resA: "W" | "D" | "L" = scoreA > scoreB ? "W" : scoreA < scoreB ? "L" : "D";
    const resB: "W" | "D" | "L" = scoreB > scoreA ? "W" : scoreB < scoreA ? "L" : "D";

    if (keyA) {
      const current = forms.get(keyA) || [];
      if (current.length < 5) forms.set(keyA, [...current, resA]);
    }
    if (keyB) {
      const current = forms.get(keyB) || [];
      if (current.length < 5) forms.set(keyB, [...current, resB]);
    }
  }
}


const ESPN_TEAM_IDS: Record<string, string> = {
  flamengo: "127",
  palmeiras: "121",
  botafogo: "120",
  cruzeiro: "135",
  bahia: "118",
  saopaulo: "126",
  corinthians: "131",
  fluminense: "124",
  gremio: "130",
  internacional: "119",
  atleticomg: "1062",
  athleticopr: "134",
  bragantino: "794",
  vasco: "133",
  santos: "128",
  fortaleza: "154",
  ceara: "129",
  vitoria: "159",
  sport: "123",
  juventude: "152",
  coritiba: "147",
  chapecoense: "132",
  remo: "146",
  mirassol: "7834",
  goias: "151",
  guarani: "138",
  cuiaba: "1193",
};

function espnTeamIdFor(row: BrasileiraoBStandingRow) {
  return row.teamId || ESPN_TEAM_IDS[masterClubKey(row.team)] || ESPN_TEAM_IDS[normalizeClubName(row.team)];
}

function readTeamResultFromEvent(event: any, teamName: string) {
  const competition = Array.isArray(event?.competitions) ? event.competitions[0] : null;
  const competitors = Array.isArray(competition?.competitors) ? competition.competitors : [];
  if (competitors.length < 2 || !eventIsFinished(event, competition)) return null;

  const targetKey = masterClubKey(teamName);
  const target = competitors.find((item: any) => masterClubKey(competitorName(item)) === targetKey);
  const opponent = competitors.find((item: any) => item !== target);
  if (!target || !opponent) return null;

  const targetScore = parseScore(target?.score);
  const opponentScore = parseScore(opponent?.score);
  if (targetScore === null || opponentScore === null) return null;

  const result: "W" | "D" | "L" = targetScore > opponentScore ? "W" : targetScore < opponentScore ? "L" : "D";
  return { result, date: event?.date || competition?.date || "" };
}

async function fetchTeamRecentFormFromSchedules(row: BrasileiraoBStandingRow, season: number) {
  const teamId = espnTeamIdFor(row);
  if (!teamId) return [] as Array<"W" | "D" | "L">;

  const urls = [
    `https://site.api.espn.com/apis/site/v2/sports/soccer/bra.2/teams/${teamId}/schedule?season=${season}`,
    `https://site.web.api.espn.com/apis/v2/sports/soccer/bra.2/teams/${teamId}/schedule?season=${season}`,
    `https://site.api.espn.com/apis/site/v2/sports/soccer/bra.2/teams/${teamId}/schedule`,
  ];

  for (const url of urls) {
    try {
      const json = await fetchJson(url);
      const events = Array.isArray(json?.events) ? json.events : Array.isArray(json?.team?.events) ? json.team.events : [];
      const results = events
        .map((event: any) => readTeamResultFromEvent(event, row.team))
        .filter(Boolean)
        .sort((a: any, b: any) => +new Date(b.date || 0) - +new Date(a.date || 0))
        .map((item: any) => item.result)
        .slice(0, 5) as Array<"W" | "D" | "L">;
      if (results.length >= 5) return results.reverse();
    } catch {
      // tenta próxima rota pública do mesmo time
    }
  }
  return [] as Array<"W" | "D" | "L">;
}

async function fetchRealRecentForms(rows: BrasileiraoBStandingRow[]) {
  const teamNames = rows.map((row) => row.team);
  const forms = new Map<string, Array<"W" | "D" | "L">>();
  const today = new Date();
  const windows = [
    [addDays(today, -45), today],
    [addDays(today, -90), addDays(today, -46)],
    [addDays(today, -180), addDays(today, -91)],
  ];

  for (const [start, end] of windows) {
    if ([...forms.values()].filter((form) => form.length >= 5).length >= rows.length) break;
    const dates = `${yyyymmdd(start)}-${yyyymmdd(end)}`;
    const urls = [
      `https://site.api.espn.com/apis/site/v2/sports/soccer/bra.2/scoreboard?dates=${dates}&limit=300`,
      `https://site.web.api.espn.com/apis/v2/sports/soccer/bra.2/scoreboard?dates=${dates}&limit=300`,
    ];
    for (const url of urls) {
      try {
        const json = await fetchJson(url);
        mergeRecentFormsFromEvents(json, teamNames, forms);
      } catch {
        // tenta próxima fonte sem derrubar a tabela
      }
    }
  }

  return forms;
}

async function applyRealRecentForms(rows: BrasileiraoBStandingRow[]) {
  let forms = new Map<string, Array<"W" | "D" | "L">>();
  try {
    forms = await fetchRealRecentForms(rows);
  } catch {
    forms = new Map();
  }

  const season = new Date().getFullYear();
  const enriched: BrasileiraoBStandingRow[] = [];
  for (const row of rows) {
    let real = forms.get(row.team) || forms.get(masterClubKey(row.team)) || [];
    if (real.length < 5) {
      const scheduleForm = await fetchTeamRecentFormFromSchedules(row, season);
      if (scheduleForm.length >= 5) real = scheduleForm;
    }
    if (real.length < 5) {
      const sportsDbForm = await fetchTeamRecentFormFromTheSportsDb(row);
      if (sportsDbForm.length >= 5) real = sportsDbForm;
    }

    const parsed = Array.isArray(row.last5) ? row.last5.filter((x) => x === "W" || x === "D" || x === "L") : [];
    const previous = cache.standings.find((old) => masterClubKey(old.team) === masterClubKey(row.team));
    const previousLast5 = Array.isArray(previous?.last5) ? previous.last5.filter((x) => x === "W" || x === "D" || x === "L") : [];
    const last5 = (real.length >= 5 ? real : parsed.length >= 5 ? parsed.slice(-5) : previousLast5.length >= 5 ? previousLast5.slice(-5) : []).slice(0, 5);
    enriched.push({ ...row, last5, sourceQuality: real.length >= 5 || parsed.length >= 5 ? "real" as const : previousLast5.length >= 5 ? "cache" as const : "cache" as const });
  }
  return enriched;
}

function isTrustedBrasileiraoBTable(rows: BrasileiraoBStandingRow[]) {
  if (rows.length < 16 || rows.length > 20) return false;
  const foreignBlockList = ["hertha", "bayern", "dortmund", "liverpool", "chelsea", "arsenal", "manchester", "psg", "real madrid", "barcelona"];
  if (rows.some((row) => foreignBlockList.some((bad) => normalizeClubName(row.team).includes(normalizeClubName(bad))))) return false;
  const unique = new Set(rows.map((row) => masterClubKey(row.team)));
  if (unique.size !== rows.length) return false;
  if (rows.some((row) => !Number.isFinite(row.points) || !Number.isFinite(row.played))) return false;
  return true;
}

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/json,text/plain,*/*",
        "user-agent": "AnalyseProBot/1.0 (+https://analyse-pro-production.up.railway.app)",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function uniqueStrings(values: Array<string | undefined | null>) {
  const seen = new Set<string>();
  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = normalizeClubName(value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function aliasesForClub(team: string) {
  const key = masterClubKey(team);
  const aliases = BRASILEIRAOB_MASTER_ALIASES[key] || [];
  return uniqueStrings([team, ...aliases]);
}

function eventDateOf(item: any) {
  const raw = item?.dateEvent || item?.dateEventLocal || item?.strTimestamp || item?.date || "";
  const time = item?.strTime || item?.strTimeLocal || "00:00:00";
  const stamp = raw && !String(raw).includes("T") ? `${raw}T${time}` : raw;
  const value = +new Date(stamp || 0);
  return Number.isFinite(value) ? value : 0;
}

function resultFromTheSportsDbEvent(event: any, team: string): "W" | "D" | "L" | null {
  const home = String(event?.strHomeTeam || "").trim();
  const away = String(event?.strAwayTeam || "").trim();
  const hs = parseScore(event?.intHomeScore);
  const as = parseScore(event?.intAwayScore);
  if (!home || !away || hs === null || as === null) return null;
  const key = masterClubKey(team);
  const isHome = masterClubKey(home) === key;
  const isAway = masterClubKey(away) === key;
  if (!isHome && !isAway) return null;
  const teamGoals = isHome ? hs : as;
  const oppGoals = isHome ? as : hs;
  return teamGoals > oppGoals ? "W" : teamGoals < oppGoals ? "L" : "D";
}

async function fetchTeamRecentFormFromTheSportsDb(row: BrasileiraoBStandingRow) {
  const aliases = aliasesForClub(row.team);
  for (const alias of aliases) {
    try {
      const search = await fetchJson(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(alias)}`);
      const teams = Array.isArray(search?.teams) ? search.teams : [];
      const candidates = teams.filter((team: any) => {
        const sport = String(team?.strSport || "").toLowerCase();
        const name = String(team?.strTeam || team?.strTeamAlternate || "");
        return sport.includes("soccer") && (namesMatch(name, row.team) || masterClubKey(name).includes(masterClubKey(row.team)) || masterClubKey(row.team).includes(masterClubKey(name)));
      });
      const picked = candidates[0] || teams.find((team: any) => String(team?.strSport || "").toLowerCase().includes("soccer"));
      const idTeam = picked?.idTeam;
      if (!idTeam) continue;

      const last = await fetchJson(`https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=${encodeURIComponent(idTeam)}`);
      const events = Array.isArray(last?.results) ? last.results : [];
      const results = events
        .sort((a: any, b: any) => eventDateOf(b) - eventDateOf(a))
        .map((event: any) => resultFromTheSportsDbEvent(event, row.team))
        .filter(Boolean)
        .slice(0, 5) as Array<"W" | "D" | "L">;
      if (results.length >= 5) return results.reverse();
    } catch {
      // próxima variação de nome/fonte pública
    }
  }
  return [] as Array<"W" | "D" | "L">;
}

function buildFallbackTable(): BrasileiraoBTableCache {
  return {
    updatedAt: new Date().toISOString(),
    source: "indisponivel-sem-fallback",
    season: new Date().getFullYear(),
    standings: [],
    topScorers: [],
    nextRound: [],
    fixturesUpdatedAt: new Date().toISOString(),
  };
}

export function getCachedBrasileiraoBTable() {
  return cache.standings.length ? cache : buildFallbackTable();
}

export function getBrasileiraoBTableRobotLogs() {
  return logs;
}

export function getBrasileiraoBTableRobotStatus() {
  return { ...status, totalItems: cache.standings.length, topScorersCount: cache.topScorers.length, nextMatchesCount: cache.nextRound.length };
}

export async function updateBrasileiraoBTableRobot(force = false): Promise<BrasileiraoBTableCache> {
  const now = Date.now();
  const last = cache.updatedAt ? +new Date(cache.updatedAt) : 0;
  if (!force && cache.standings.length && now - last < UPDATE_EVERY_MS) return cache;
  if (updating) return updating;

  updating = (async () => {
    const startedAt = Date.now();
    status.status = "running";
    status.lastRunAt = new Date().toISOString();
    status.lastError = null;

    const season = new Date().getFullYear();
    const urls = [
      `https://site.api.espn.com/apis/site/v2/sports/soccer/bra.2/standings?season=${season}`,
      "https://site.api.espn.com/apis/site/v2/sports/soccer/bra.2/standings",
      `https://site.web.api.espn.com/apis/v2/sports/soccer/bra.2/standings?season=${season}`,
    ];

    let lastError: unknown = null;
    for (const url of urls) {
      try {
        const json = await fetchJson(url);
        let standings = parseEspnStandings(json).map((row) => ({ ...row, logo: brasileiraoBLogoFor(row.team, row.logo) }));
        if (!isTrustedBrasileiraoBTable(standings)) {
          lastError = new Error(`Fonte rejeitada por validação de Série B: ${standings.map((row) => row.team).join(", ")}`);
          continue;
        }
        standings = await applyRealRecentForms(standings);
        // Não trava a atualização da tabela por falta de forma recente completa.
        // A classificação, pontos e jogos precisam atualizar sozinhos; se algum clube
        // não tiver últimos 5 confirmados em fonte pública, o front recebe last5 vazio/cache
        // em vez de manter a tabela inteira antiga.
        if (standings.length >= 16) {
          let nextRound = cache.nextRound?.length ? cache.nextRound : [];
          let fixturesUpdatedAt = cache.fixturesUpdatedAt || cache.updatedAt;
          let source = "ESPN público classificação";
          const lastFixtures = fixturesUpdatedAt ? +new Date(fixturesUpdatedAt) : 0;
          const shouldRefreshFixtures = force || !nextRound.length || Date.now() - lastFixtures >= FIXTURES_UPDATE_EVERY_MS;
          if (shouldRefreshFixtures) {
            try {
              const publicSchedule = await fetchEspnNextRound();
              if (publicSchedule.length) {
                nextRound = publicSchedule;
                fixturesUpdatedAt = new Date().toISOString();
                source = "ESPN público classificação + grade pública de jogos";
              }
            } catch (scheduleError) {
              addLog("error", `Falha ao buscar grade pública: ${scheduleError instanceof Error ? scheduleError.message : "erro desconhecido"}. Mantendo somente grade em cache validada.`);
              // Sem calendário público validado: mantém cache existente e não cria jogo inventado.
            }
          } else {
            source = "ESPN público classificação + grade em cache 10min";
          }
          cache = { updatedAt: new Date().toISOString(), source, season, standings, topScorers: buildTopScorersFromTable(standings), nextRound, fixturesUpdatedAt };
          saveSnapshotToDisk(cache);
          status.status = "online";
          status.lastSuccessAt = cache.updatedAt;
          status.totalItems = standings.length;
          status.lastExecutionMs = Date.now() - startedAt;
          status.topScorersCount = cache.topScorers.length;
          status.nextMatchesCount = cache.nextRound.length;
          addLog("success", `Classificação atualizada com ${standings.length} clubes. Grade pública com ${nextRound.length} jogos atualizada/cache 10 minutos.`);
          return cache;
        }
        lastError = new Error(`Fonte retornou poucos clubes: ${standings.length}`);
      } catch (error) {
        lastError = error;
      }
    }

    const message = lastError instanceof Error ? lastError.message : "Falha ao buscar fonte pública.";
    status.status = "error";
    status.lastError = message;
    status.lastExecutionMs = Date.now() - startedAt;
    addLog("error", `Falha na atualização da classificação: ${message}`);
    if (cache.standings.length) return cache;
    cache = buildFallbackTable();
    return cache;
  })();

  try {
    return await updating;
  } finally {
    updating = null;
  }
}

export function startBrasileiraoBTableRobot() {
  if (intervalStarted) return;
  intervalStarted = true;
  status.status = "online";
  addLog("info", "Robô Brasileirão Série B Master iniciado. Forma recente por múltiplas fontes e sem bolinhas inventadas.");
  void updateBrasileiraoBTableRobot(true);
  setInterval(() => void updateBrasileiraoBTableRobot(false), UPDATE_EVERY_MS);
}
