import type { Express, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { getSportsDbTeamPair } from "./sportsdb";
import { ApiUsageLimitError, controlledApiFootballFetch, consumeUserAnalysisRequest, recordApiCacheHit } from "./api-usage-control";

type LastGame = { opponent: string; score: string; result: "V" | "E" | "D"; source?: string; date?: string };
type TeamPublicStats = {
  goalsFor: number;
  goalsAgainst: number;
  corners: number;
  cornersReliable?: boolean;
  form: Array<"V" | "E" | "D">;
  lastGames: LastGame[];
  homeAway: { wins: number; draws: number; losses: number; estimated?: boolean };
};
type WebSource = { title: string; url: string; snippet: string; rawContent?: string };
type AnalysisResult = {
  sourceMode: string;
  confidence: number;
  bestMarket: string;
  riskLevel: string;
  summary: string;
  marketProbabilities: Array<{ name: string; value: string; level: string }>;
  likelyScores: string[];
  stats: {
    teamA: TeamPublicStats;
    teamB: TeamPublicStats;
    averageCorners: number;
    over15: number;
    over25: number;
    btts: number;
    cards: number;
  };
  h2h: { teamAWins: number; draws: number; teamBWins: number; teamAGoals: number; teamBGoals: number; estimated?: boolean };
};
type ApiTeam = { id: number; name: string; logo?: string; country?: string };
type ApiFixture = any;

const API_BASE = "https://v3.football.api-sports.io";
const analysisApiCache = new Map<string, { expiresAt: number; data: any }>();
const ANALYSIS_API_CACHE_TTL_MS = 1000 * 60 * 10;

function analysisCacheKey(pathName: string, params: Record<string, string | number | undefined>) {
  const values = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && String(value) !== "")
    .sort(([a], [b]) => a.localeCompare(b));
  return `${pathName}?${JSON.stringify(values)}`;
}

const KNOWN_TEAM_IDS: Record<string, number> = {
  flamengo: 127,
  palmeiras: 121,
  botafogo: 120,
  fluminense: 124,
  vasco: 133,
  "vasco da gama": 133,
  corinthians: 131,
  "sao paulo": 126,
  "são paulo": 126,
  santos: 128,
  gremio: 130,
  "grêmio": 130,
  internacional: 119,
  cruzeiro: 135,
  "atletico mg": 1062,
  "atlético mg": 1062,
  "atletico-mg": 1062,
  "atlético-mg": 1062,
  bahia: 118,
  fortaleza: 154,
  "athletico pr": 134,
  "athletico-pr": 134,
  "athletico paranaense": 134,
  vitoria: 147,
  "vitória": 147,
  juventude: 155,
  sport: 151,
  "sport recife": 151,
  ceara: 152,
  "ceará": 152,
  bragantino: 776,
  "red bull bragantino": 776,
  mirassol: 794,
  psg: 85,
  arsenal: 42,
  "real madrid": 541,
  barcelona: 529,
  "manchester city": 50,
  "manchester united": 33,
  liverpool: 40,
  chelsea: 49,
  tottenham: 47,
  newcastle: 34,
  "aston villa": 66,
  juventus: 496,
  "ac milan": 489,
  "inter de milao": 505,
  "inter de milão": 505,
  napoli: 492,
  roma: 497,
  lazio: 487,
  atalanta: 499,
  "bayern de munique": 157,
  "bayern munich": 157,
  "borussia dortmund": 165,
  "bayer leverkusen": 168,
  benfica: 211,
  porto: 212,
  sporting: 228,
  braga: 217,
  ajax: 194,
  psv: 197,
  feyenoord: 201,
};

function normalizeTeam(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readKeyFromEnvFile(fileName: string): string {
  try {
    const fullPath = path.resolve(process.cwd(), fileName);
    if (!fs.existsSync(fullPath)) return "";
    const raw = fs.readFileSync(fullPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const cleaned = line.trim();
      if (!cleaned || cleaned.startsWith("#")) continue;
      let match = cleaned.match(/^API_FOOTBALL_KEY\s*=\s*(.+)$/i);
      if (match?.[1]) return match[1].trim().replace(/^['"]|['"]$/g, "");
      match = cleaned.match(/^API[-_]?KEY\s*[:=]\s*(.+)$/i);
      if (match?.[1]) return match[1].trim().replace(/^['"]|['"]$/g, "");
    }
  } catch {}
  return "";
}

function getApiKey() {
  return String(
    process.env.API_FOOTBALL_KEY ||
      process.env.API_KEY ||
      process.env["API-KEY"] ||
      readKeyFromEnvFile(".env.local") ||
      readKeyFromEnvFile(".env") ||
      ""
  ).trim();
}

async function apiGet(pathName: string, params: Record<string, string | number | undefined> = {}) {
  const key = getApiKey();
  if (!key) throw new Error("API_FOOTBALL_KEY não configurada. Crie .env.local com API_FOOTBALL_KEY=sua_chave_da_API_Sports.");

  const cacheKey = analysisCacheKey(pathName, params);
  const cached = analysisApiCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    recordApiCacheHit(`analysis:${pathName}`);
    return cached.data;
  }

  const url = new URL(`${API_BASE}${pathName}`);
  Object.entries(params).forEach(([name, value]) => {
    if (value !== undefined && value !== null && String(value) !== "") url.searchParams.set(name, String(value));
  });

  const response = await controlledApiFootballFetch(url.toString(), {
    headers: { "x-apisports-key": key, accept: "application/json" },
  }, `analysis:${pathName}`, "standard");
  const text = await response.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { throw new Error(`Resposta inválida da API-Football: ${text.slice(0, 200)}`); }

  if (!response.ok) throw new Error(`API-Football HTTP ${response.status}: ${JSON.stringify(data?.errors || data).slice(0, 300)}`);
  if (data?.errors && Object.keys(data.errors).length) throw new Error(`API-Football: ${JSON.stringify(data.errors)}`);
  analysisApiCache.set(cacheKey, { expiresAt: Date.now() + ANALYSIS_API_CACHE_TTL_MS, data });
  return data;
}

async function findTeam(teamName: string, providedId?: number): Promise<ApiTeam | null> {
  const normalized = normalizeTeam(teamName);
  const localId = Number(providedId || KNOWN_TEAM_IDS[normalized] || 0);

  // Primeiro tenta pelo ID vindo do front/mapeamento local. Se a API não confirmar, faz busca por nome.
  if (localId) {
    try {
      const data = await apiGet("/teams", { id: localId });
      const team = data?.response?.[0]?.team;
      if (team?.id) {
        return { id: Number(team.id), name: team.name || teamName, logo: team.logo, country: team.country };
      }
      console.warn(`ID local não confirmado pela API-Football para ${teamName}: ${localId}. Tentando busca por nome.`);
    } catch (e) {
      console.warn(`Falha ao confirmar ID local para ${teamName}:`, e instanceof Error ? e.message : e);
    }
  }

  try {
    const data = await apiGet("/teams", { search: teamName });
    const candidates = Array.isArray(data?.response) ? data.response : [];
    if (!candidates.length) {
      // Último fallback: usa o ID local mesmo sem confirmação, para permitir tentar fixtures.
      return localId ? { id: localId, name: teamName } : null;
    }

    const exact = candidates.find((item: any) => normalizeTeam(item?.team?.name) === normalized);
    const contains = candidates.find((item: any) => {
      const apiName = normalizeTeam(item?.team?.name || "");
      return apiName.includes(normalized) || normalized.includes(apiName);
    });

    // Preferência para Brasil quando for clube brasileiro comum.
    const brazil = candidates.find((item: any) => String(item?.team?.country || "").toLowerCase().includes("brazil"));
    const team = (exact || contains || brazil || candidates[0])?.team;
    return team?.id ? { id: Number(team.id), name: team.name || teamName, logo: team.logo, country: team.country } : null;
  } catch (e) {
    console.warn(`Busca por nome falhou para ${teamName}:`, e instanceof Error ? e.message : e);
    return localId ? { id: localId, name: teamName } : null;
  }
}

function resultFromGoals(forGoals: number, againstGoals: number): "V" | "E" | "D" {
  if (forGoals > againstGoals) return "V";
  if (forGoals < againstGoals) return "D";
  return "E";
}

function finishedFixture(fixture: any) {
  const short = String(fixture?.fixture?.status?.short || "").toUpperCase();
  const goals = fixture?.goals;
  return ["FT", "AET", "PEN"].includes(short) && goals?.home != null && goals?.away != null;
}

function sortByDateDesc(fixtures: ApiFixture[]) {
  return fixtures
    .filter(finishedFixture)
    .sort((a, b) => new Date(b?.fixture?.date || 0).getTime() - new Date(a?.fixture?.date || 0).getTime());
}

function todayISO() { return new Date().toISOString().slice(0, 10); }
function yearsAgoISO(years: number) { const d = new Date(); d.setFullYear(d.getFullYear() - years); return d.toISOString().slice(0, 10); }
function currentYear() { return new Date().getFullYear(); }

const TEAM_LEAGUE_HINTS: Record<number, number[]> = {
  // Brasil: Serie A, Serie B, Copa do Brasil, Libertadores, Sul-Americana, Estaduais principais
  127: [71, 11, 13, 73, 475], // Flamengo
  121: [71, 11, 13, 73, 475], // Palmeiras
  120: [71, 11, 13, 73, 475], // Botafogo
  124: [71, 11, 13, 73, 475], // Fluminense
  133: [71, 72, 11, 13, 73, 475], // Vasco
  131: [71, 11, 13, 73, 475],
  126: [71, 11, 13, 73, 475],
  128: [71, 72, 11, 13, 73, 475],
  130: [71, 72, 11, 13, 73, 475],
  119: [71, 72, 11, 13, 73, 475],
  135: [71, 72, 11, 13, 73, 475],
  1062: [71, 11, 13, 73, 475],
  118: [71, 72, 11, 13, 73, 475],
  154: [71, 72, 11, 13, 73, 475],
  134: [71, 72, 11, 13, 73, 475],
  147: [71, 72, 11, 13, 73, 475],
  155: [71, 72, 11, 13, 73, 475],
  776: [71, 72, 11, 13, 73, 475],

  // Europa principais
  85: [61, 2, 3, 66], // PSG Ligue 1 / UCL / UEL / Coupe de France
  42: [39, 2, 3, 48, 45], // Arsenal PL / UCL / UEL / FA Cup / Carabao
  50: [39, 2, 3, 48, 45],
  40: [39, 2, 3, 48, 45],
  49: [39, 2, 3, 48, 45],
  33: [39, 2, 3, 48, 45],
  541: [140, 2, 3, 143],
  529: [140, 2, 3, 143],
  530: [140, 2, 3, 143],
  496: [135, 2, 3, 137],
  489: [135, 2, 3, 137],
  505: [135, 2, 3, 137],
  157: [78, 2, 3, 81],
  165: [78, 2, 3, 81],
  211: [94, 2, 3, 97],
  212: [94, 2, 3, 97],
  228: [94, 2, 3, 97],
};

function recentSeasons() {
  const year = currentYear();
  return [year, year - 1, year - 2, year - 3];
}

function dedupeFixtures(fixtures: ApiFixture[]) {
  const seen = new Set<number>();
  const out: ApiFixture[] = [];
  for (const fixture of fixtures) {
    const id = Number(fixture?.fixture?.id);
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(fixture);
    }
  }
  return sortByDateDesc(out);
}

async function getLastFixtures(team: ApiTeam, limit = 5): Promise<ApiFixture[]> {
  const all: ApiFixture[] = [];
  const addFrom = async (params: Record<string, string | number | undefined>, label: string) => {
    try {
      const data = await apiGet("/fixtures", params);
      const response = Array.isArray(data?.response) ? data.response : [];
      const finished = sortByDateDesc(response);
      if (finished.length) console.log(`API-Football fixtures OK (${label})`, team.name, finished.length);
      all.push(...finished);
    } catch (e) {
      if (e instanceof ApiUsageLimitError) throw e;
      console.warn(`Falha fixtures ${team.name} (${label}):`, e instanceof Error ? e.message : e);
    }
  };

  // 1) Endpoint simples, normalmente suficiente.
  await addFrom({ team: team.id, last: 20 }, "team+last");
  if (dedupeFixtures(all).length >= limit) return dedupeFixtures(all).slice(0, limit);

  // 2) Alguns planos/ligas respondem melhor com season.
  for (const season of recentSeasons()) {
    await addFrom({ team: team.id, season, last: 20 }, `team+season+last ${season}`);
    if (dedupeFixtures(all).length >= limit) return dedupeFixtures(all).slice(0, limit);
  }

  // 3) Algumas competições exigem league+season. Isto cobre Brasil e principais ligas.
  const leagues = TEAM_LEAGUE_HINTS[Number(team.id)] || [];
  for (const league of leagues) {
    for (const season of recentSeasons()) {
      await addFrom({ team: team.id, league, season }, `team+league+season ${league}/${season}`);
      if (dedupeFixtures(all).length >= limit) return dedupeFixtures(all).slice(0, limit);
    }
  }

  // 4) Fallback por intervalo de data.
  await addFrom({ team: team.id, from: yearsAgoISO(4), to: todayISO() }, "team+date-range");

  return dedupeFixtures(all).slice(0, limit);
}

async function getHeadToHeadFixtures(teamA: ApiTeam, teamB: ApiTeam, limit = 10): Promise<ApiFixture[]> {
  const attempts = [
    { h2h: `${teamA.id}-${teamB.id}`, last: limit },
    { h2h: `${teamA.id}-${teamB.id}`, from: yearsAgoISO(8), to: todayISO() },
  ];
  for (const params of attempts) {
    try {
      const data = await apiGet("/fixtures/headtohead", params);
      const fixtures = sortByDateDesc(Array.isArray(data?.response) ? data.response : []);
      if (fixtures.length) return fixtures.slice(0, limit);
    } catch (e) {
      if (e instanceof ApiUsageLimitError) throw e;
      console.warn(`Falha ao buscar confronto direto:`, e instanceof Error ? e.message : e);
    }
  }
  return [];
}

function fixtureToLastGame(fixture: ApiFixture, team: ApiTeam): LastGame | null {
  const home = fixture?.teams?.home;
  const away = fixture?.teams?.away;
  const goals = fixture?.goals;
  if (!home || !away || goals?.home == null || goals?.away == null) return null;
  const isHome = Number(home.id) === Number(team.id);
  const opponent = isHome ? away.name : home.name;
  const forGoals = isHome ? Number(goals.home) : Number(goals.away);
  const againstGoals = isHome ? Number(goals.away) : Number(goals.home);
  return { opponent, score: `${forGoals} x ${againstGoals}`, result: resultFromGoals(forGoals, againstGoals), source: fixture?.league?.name || "API-Football", date: fixture?.fixture?.date };
}

async function getFixtureStats(fixtureId: number, teamId: number) {
  try {
    const data = await apiGet("/fixtures/statistics", { fixture: fixtureId, team: teamId });
    const stats = data?.response?.[0]?.statistics || [];
    const find = (type: string) => stats.find((s: any) => String(s.type).toLowerCase() === type.toLowerCase())?.value;
    const toNumber = (value: any) => {
      if (value == null) return null;
      if (typeof value === "number") return value;
      const parsed = Number(String(value).replace("%", "").replace(",", "."));
      return Number.isFinite(parsed) ? parsed : null;
    };
    return { corners: toNumber(find("Corner Kicks")), yellowCards: toNumber(find("Yellow Cards")), redCards: toNumber(find("Red Cards")) };
  } catch (e) {
    if (e instanceof ApiUsageLimitError) throw e;
    return { corners: null, yellowCards: null, redCards: null };
  }
}

function average(values: number[]) { const valid = values.filter(Number.isFinite); return valid.length ? Number((valid.reduce((s, v) => s + v, 0) / valid.length).toFixed(2)) : 0; }

function sportsDbToTeamStats(input: any): TeamPublicStats | null {
  if (!input || !Array.isArray(input.lastGames) || !input.lastGames.length) return null;
  return {
    goalsFor: Number(input.goalsFor || 0),
    goalsAgainst: Number(input.goalsAgainst || 0),
    corners: 0,
    cornersReliable: false,
    form: Array.isArray(input.form) ? input.form.slice(0, 5) : input.lastGames.map((g: any) => g.result).slice(0, 5),
    lastGames: input.lastGames.slice(0, 5).map((g: any) => ({
      opponent: String(g.opponent || ""),
      score: String(g.score || ""),
      result: g.result === "V" || g.result === "E" || g.result === "D" ? g.result : "E",
      source: "TheSportsDB",
      date: g.date,
    })),
    homeAway: input.homeAway || { wins: 0, draws: 0, losses: 0, estimated: false },
  };
}

function mergeTeamStats(primary: TeamPublicStats, fallback: TeamPublicStats | null) {
  if (primary.lastGames.length >= 3) return primary;
  if (fallback?.lastGames?.length) return fallback;
  return primary;
}


async function buildTeamStatsFromApi(team: ApiTeam, fixtures: ApiFixture[]): Promise<TeamPublicStats> {
  const lastGames = fixtures.map((fixture) => fixtureToLastGame(fixture, team)).filter(Boolean) as LastGame[];
  const form = lastGames.map((game) => game.result).slice(0, 5);
  let goalsForTotal = 0, goalsAgainstTotal = 0, wins = 0, draws = 0, losses = 0;
  for (const game of lastGames) {
    const match = game.score.match(/(\d+)\s*x\s*(\d+)/i);
    if (!match) continue;
    const gf = Number(match[1]); const ga = Number(match[2]);
    goalsForTotal += gf; goalsAgainstTotal += ga;
    if (game.result === "V") wins++; else if (game.result === "D") losses++; else draws++;
  }
  const statsSamples = await Promise.all(fixtures.slice(0, 5).map((fixture) => getFixtureStats(Number(fixture?.fixture?.id), team.id)));
  const cornerValues = statsSamples.map((item) => item.corners).filter((value): value is number => value != null);
  const cardValues = statsSamples.flatMap((item) => [item.yellowCards, item.redCards]).filter((value): value is number => value != null);
  return {
    goalsFor: lastGames.length ? Number((goalsForTotal / lastGames.length).toFixed(2)) : 0,
    goalsAgainst: lastGames.length ? Number((goalsAgainstTotal / lastGames.length).toFixed(2)) : 0,
    corners: average(cornerValues),
    cornersReliable: cornerValues.length >= 3,
    form,
    lastGames,
    homeAway: { wins, draws, losses, estimated: false },
  };
}

function buildH2H(teamA: ApiTeam, teamB: ApiTeam, fixtures: ApiFixture[]): AnalysisResult["h2h"] {
  let teamAWins = 0, teamBWins = 0, draws = 0, teamAGoals = 0, teamBGoals = 0;
  for (const fixture of fixtures) {
    const home = fixture?.teams?.home, away = fixture?.teams?.away, goals = fixture?.goals;
    if (!home || !away || goals?.home == null || goals?.away == null) continue;
    const aIsHome = Number(home.id) === Number(teamA.id);
    const aGoals = aIsHome ? Number(goals.home) : Number(goals.away);
    const bGoals = aIsHome ? Number(goals.away) : Number(goals.home);
    teamAGoals += aGoals; teamBGoals += bGoals;
    if (aGoals === bGoals) draws++; else if (aGoals > bGoals) teamAWins++; else teamBWins++;
  }
  return { teamAWins, draws, teamBWins, teamAGoals, teamBGoals, estimated: fixtures.length === 0 };
}

function calcRates(teamAStats: TeamPublicStats, teamBStats: TeamPublicStats) {
  const allGames = [...teamAStats.lastGames, ...teamBStats.lastGames];
  if (!allGames.length) return { over15: 0, over25: 0, btts: 0, confidence: 0 };
  let over15Count = 0, over25Count = 0, bttsCount = 0;
  for (const game of allGames) {
    const match = game.score.match(/(\d+)\s*x\s*(\d+)/i); if (!match) continue;
    const a = Number(match[1]), b = Number(match[2]);
    if (a + b >= 2) over15Count++; if (a + b >= 3) over25Count++; if (a > 0 && b > 0) bttsCount++;
  }
  const base = allGames.length || 1;
  const over15 = Math.round((over15Count / base) * 100), over25 = Math.round((over25Count / base) * 100), btts = Math.round((bttsCount / base) * 100);
  return { over15, over25, btts, confidence: Math.round((over15 + over25 + btts) / 3) };
}

function estimateLikelyScores(teamAStats: TeamPublicStats, teamBStats: TeamPublicStats) {
  if (teamAStats.lastGames.length < 3 || teamBStats.lastGames.length < 3) return [];
  const a = Math.max(0, Math.min(4, Math.round((teamAStats.goalsFor + teamBStats.goalsAgainst) / 2)));
  const b = Math.max(0, Math.min(4, Math.round((teamBStats.goalsFor + teamAStats.goalsAgainst) / 2)));
  return Array.from(new Set([`${a} x ${b}`, `${Math.max(0, a - 1)} x ${b}`, `${a} x ${Math.max(0, b - 1)}`]));
}

async function searchTavilyContext(teamA: string, teamB: string): Promise<WebSource[]> { return []; }
async function askOpenAI(teamA: string, teamB: string, sources: WebSource[], base: AnalysisResult): Promise<AnalysisResult> { return base; }

async function buildApiFootballAnalysis(teamAName: string, teamBName: string, teamAId?: number, teamBId?: number): Promise<{ analysis: AnalysisResult; sources: WebSource[]; notice: string }> {
  if (!getApiKey()) throw new Error("API_FOOTBALL_KEY não configurada. Coloque a chave no arquivo .env.local.");
  const [teamA, teamB] = await Promise.all([findTeam(teamAName, teamAId), findTeam(teamBName, teamBId)]);
  if (!teamA || !teamB) throw new Error(`API-Football não encontrou ${!teamA ? teamAName : teamBName}.`);
  console.log("API-Football teams:", teamAName, teamA.id, "x", teamBName, teamB.id);

  const [fixturesA, fixturesB, h2hFixtures, contextSources, sportsDbPair] = await Promise.all([
    getLastFixtures(teamA, 5),
    getLastFixtures(teamB, 5),
    getHeadToHeadFixtures(teamA, teamB, 10),
    searchTavilyContext(teamAName, teamBName),
    getSportsDbTeamPair(teamAName, teamBName),
  ]);
  console.log("API-Football fixtures:", teamA.name, fixturesA.length, teamB.name, fixturesB.length, "H2H", h2hFixtures.length);

  const [apiTeamAStats, apiTeamBStats] = await Promise.all([buildTeamStatsFromApi(teamA, fixturesA), buildTeamStatsFromApi(teamB, fixturesB)]);
  const sportsTeamAStats = sportsDbToTeamStats((sportsDbPair as any)?.teamA);
  const sportsTeamBStats = sportsDbToTeamStats((sportsDbPair as any)?.teamB);
  const teamAStats = mergeTeamStats(apiTeamAStats, sportsTeamAStats);
  const teamBStats = mergeTeamStats(apiTeamBStats, sportsTeamBStats);
  const { over15, over25, btts, confidence } = calcRates(teamAStats, teamBStats);
  const cornersReliable = Boolean(teamAStats.cornersReliable && teamBStats.cornersReliable);
  const averageCorners = cornersReliable ? Number((teamAStats.corners + teamBStats.corners).toFixed(1)) : 0;
  const riskLevel = confidence >= 75 ? "ALTA" : confidence >= 60 ? "MÉDIA" : "BAIXA";
  const analysis: AnalysisResult = {
    sourceMode: "API-Football + TheSportsDB",
    confidence,
    bestMarket: "Leitura estatística de gols",
    riskLevel,
    summary: teamAStats.lastGames.length && teamBStats.lastGames.length
      ? `Dados carregados por API-Football e TheSportsDB para ${teamA.name} x ${teamB.name}. Últimos jogos usam API-Football com fallback TheSportsDB; confrontos diretos vêm da API-Football.`
      : `As fontes estruturadas responderam, mas não retornaram jogos finalizados suficientes para ${teamA.name} x ${teamB.name}. Veja o terminal para detalhes.`,
    marketProbabilities: [
      { name: "Jogos com 2+ gols", value: `${over15}%`, level: over15 >= 75 ? "ALTA" : over15 ? "MÉDIA" : "N/D" },
      { name: "Jogos com 3+ gols", value: `${over25}%`, level: over25 >= 65 ? "ALTA" : over25 ? "MÉDIA" : "N/D" },
      { name: "Jogos em que ambas as equipas marcaram", value: `${btts}%`, level: btts >= 68 ? "ALTA" : btts ? "MÉDIA" : "N/D" },
      { name: "Dados de escanteios", value: cornersReliable ? `${averageCorners}` : "N/D", level: cornersReliable ? "INFO" : "N/D" },
      { name: "Base de dados", value: "API-Football + TheSportsDB", level: "INFO" },
    ],
    likelyScores: estimateLikelyScores(teamAStats, teamBStats),
    stats: { teamA: teamAStats, teamB: teamBStats, averageCorners, over15, over25, btts, cards: 0 },
    h2h: buildH2H(teamA, teamB, h2hFixtures),
  };
  const sources: WebSource[] = [
    { title: `${teamA.name} - últimos jogos`, url: "https://www.api-football.com/", snippet: `${teamAStats.lastGames.length} jogos carregados da fonte estruturada.` },
    { title: `${teamB.name} - últimos jogos`, url: "https://www.api-football.com/", snippet: `${teamBStats.lastGames.length} jogos carregados da fonte estruturada.` },
    { title: `${teamA.name} x ${teamB.name} - confronto direto`, url: "https://www.api-football.com/", snippet: `${h2hFixtures.length} confrontos carregados da API-Football.` },
    ...contextSources,
  ];
  return { analysis: await askOpenAI(teamAName, teamBName, contextSources, analysis), sources, notice: teamAStats.lastGames.length && teamBStats.lastGames.length ? "Dados principais carregados por API-Football + TheSportsDB." : "Fontes estruturadas consultadas, mas sem jogos finalizados suficientes para um ou ambos os times." };
}

export function registerPublicWebAnalyze(app: Express) {
  app.post("/api/web-analyze", async (req: Request, res: Response) => {
    const payload = (req.body || {}) as { teamA?: string; teamB?: string; teamAId?: number; teamBId?: number };
    const teamA = String(payload.teamA || "").trim();
    const teamB = String(payload.teamB || "").trim();
    if (!teamA || !teamB) return res.status(400).json({ success: false, error: "Informe Time A e Time B." });
    try {
      consumeUserAnalysisRequest(req);
      const { analysis, sources, notice } = await buildApiFootballAnalysis(teamA, teamB, Number(payload.teamAId || 0) || undefined, Number(payload.teamBId || 0) || undefined);
      return res.json({ success: true, teamA, teamB, notice, sources, teamASources: sources.filter((s) => normalizeTeam(s.title).includes(normalizeTeam(teamA))), teamBSources: sources.filter((s) => normalizeTeam(s.title).includes(normalizeTeam(teamB))), h2hSources: sources.filter((s) => normalizeTeam(s.title).includes("confronto")), analysis });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao consultar API-Football.";
      console.error("Erro em /api/web-analyze:", message);
      const status = error instanceof ApiUsageLimitError ? error.statusCode : 502;
      return res.status(status).json({ success: false, error: message, budgetProtected: error instanceof ApiUsageLimitError });
    }
  });
}
