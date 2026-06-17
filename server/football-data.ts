export type FootballDataLastGame = {
  opponent: string;
  score: string;
  result: "V" | "E" | "D";
  source?: string;
  competition?: string;
  date?: string;
};

export type FootballDataTeamStats = {
  source: "Football-Data.org";
  teamId: number;
  teamName: string;
  teamSlug?: string;
  logo?: string;
  lastGames: FootballDataLastGame[];
  form: Array<"V" | "E" | "D">;
  goalsFor: number;
  goalsAgainst: number;
  corners: number;
  cornersReliable: false;
  homeAway: { wins: number; draws: number; losses: number; estimated: false };
  sourceUrl: string;
  sourceText: string;
};

type FootballDataTeam = {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
  crest?: string;
  area?: { name?: string };
};

const FOOTBALL_DATA_BASE = "https://api.football-data.org/v4";

const COMPETITION_CODES = [
  "BSA", // Campeonato Brasileiro Série A, when available on the account
  "PL",
  "PD",
  "SA",
  "BL1",
  "FL1",
  "PPL",
  "DED",
  "CL",
  "EL",
  "CLI",
];

const normalize = (value: string) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(fc|cf|sc|ec|ac|club|clube|football|futebol|sociedade|associacao|associacao|regatas)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function aliases(teamName: string) {
  const base = normalize(teamName);
  const map: Record<string, string[]> = {
    flamengo: ["cr flamengo", "clube de regatas do flamengo", "fla"],
    palmeiras: ["se palmeiras", "sociedade esportiva palmeiras"],
    vasco: ["vasco da gama", "cr vasco da gama"],
    "sao paulo": ["sao paulo fc", "spfc"],
    santos: ["santos fc"],
    gremio: ["gremio fbpa", "grêmio"],
    internacional: ["sc internacional", "internacional porto alegre", "inter"],
    "atletico mg": ["atletico mineiro", "atlético mineiro"],
    "athletico pr": ["athletico paranaense"],
    psg: ["paris saint germain", "paris sg"],
  };
  return Array.from(new Set([base, ...(map[base] || [])].map(normalize))).filter(Boolean);
}

function token() {
  return (
    process.env.FOOTBALL_DATA_API_KEY ||
    process.env.FOOTBALL_DATA_KEY ||
    process.env.API_FOOTBALL_KEY ||
    ""
  ).trim();
}

async function fdFetch(path: string) {
  const apiKey = token();
  if (!apiKey) throw new Error("FOOTBALL_DATA_API_KEY não configurada");

  const response = await fetch(`${FOOTBALL_DATA_BASE}${path}`, {
    headers: {
      "X-Auth-Token": apiKey,
      accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Football-Data ${response.status} ${path}: ${text.slice(0, 220)}`);
  }
  return response.json();
}

let cachedTeams: FootballDataTeam[] | null = null;

function scoreCandidate(candidate: FootballDataTeam, requestedName: string) {
  const wanted = aliases(requestedName);
  const haystacks = [candidate.name, candidate.shortName || "", candidate.tla || ""].map(normalize);
  let score = 0;
  for (const alias of wanted) {
    for (const hay of haystacks) {
      if (!hay) continue;
      if (hay === alias) score += 100;
      else if (hay.includes(alias) || alias.includes(hay)) score += 70;
      else {
        const aliasWords = alias.split(" ").filter(w => w.length > 2);
        const matched = aliasWords.filter(w => hay.includes(w)).length;
        if (matched) score += matched * 18;
      }
    }
  }
  return score;
}

async function loadTeamsFromCompetitions() {
  const all: FootballDataTeam[] = [];

  // First try the general team list, if enabled for the current account.
  try {
    for (const offset of [0, 100, 200, 300, 400, 500]) {
      const data = await fdFetch(`/teams?limit=100&offset=${offset}`);
      const teams = Array.isArray(data?.teams) ? data.teams : [];
      all.push(...teams);
      if (teams.length < 100) break;
    }
  } catch (error) {
    console.warn("[Football-Data] /teams indisponível nesta conta:", String(error).slice(0, 180));
  }

  // Then gather teams from subscribed/open competitions.
  for (const code of COMPETITION_CODES) {
    try {
      const data = await fdFetch(`/competitions/${code}/teams`);
      const teams = Array.isArray(data?.teams) ? data.teams : [];
      all.push(...teams);
      console.log(`[Football-Data] ${code}: ${teams.length} times carregados`);
    } catch (error) {
      console.warn(`[Football-Data] competição ${code} indisponível:`, String(error).slice(0, 160));
    }
  }

  const byId = new Map<number, FootballDataTeam>();
  for (const team of all) {
    if (team?.id && !byId.has(Number(team.id))) byId.set(Number(team.id), team);
  }
  return Array.from(byId.values());
}

export async function searchFootballDataTeam(teamName: string): Promise<FootballDataTeam | null> {
  if (!cachedTeams) cachedTeams = await loadTeamsFromCompetitions();
  if (!cachedTeams.length) return null;

  const ranked = cachedTeams
    .map(team => ({ team, score: scoreCandidate(team, teamName) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const chosen = ranked[0]?.team || null;
  console.log("[Football-Data] time escolhido:", teamName, "=>", chosen?.id, chosen?.name);
  return chosen;
}

function resultFromGoals(gf: number, ga: number): "V" | "E" | "D" {
  if (gf === ga) return "E";
  return gf > ga ? "V" : "D";
}

function scoreText(gf: number, ga: number) {
  return `${gf} x ${ga}`;
}

function finishedScore(match: any) {
  const home = match?.score?.fullTime?.home ?? match?.score?.regularTime?.home;
  const away = match?.score?.fullTime?.away ?? match?.score?.regularTime?.away;
  if (typeof home !== "number" || typeof away !== "number") return null;
  if (home > 12 || away > 12) return null;
  return { home, away };
}

async function getTeamMatches(teamId: number, limit = 20) {
  const today = new Date();
  const from = new Date(today.getTime() - 1000 * 60 * 60 * 24 * 720);
  const dateFrom = from.toISOString().slice(0, 10);
  const dateTo = today.toISOString().slice(0, 10);

  try {
    const data = await fdFetch(`/teams/${teamId}/matches?status=FINISHED&limit=${limit}`);
    return Array.isArray(data?.matches) ? data.matches : [];
  } catch (error) {
    console.warn("[Football-Data] matches por limit falhou, tentando por data:", String(error).slice(0, 180));
    const data = await fdFetch(`/teams/${teamId}/matches?status=FINISHED&dateFrom=${dateFrom}&dateTo=${dateTo}`);
    const matches = Array.isArray(data?.matches) ? data.matches : [];
    return matches.slice(-limit).reverse();
  }
}

export async function getFootballDataTeamStats(teamName: string): Promise<FootballDataTeamStats | null> {
  const team = await searchFootballDataTeam(teamName);
  if (!team?.id) return null;

  const matches = await getTeamMatches(Number(team.id), 20);
  const lastGames: FootballDataLastGame[] = [];

  for (const match of matches) {
    if (lastGames.length >= 5) break;
    const score = finishedScore(match);
    if (!score) continue;
    const home = match?.homeTeam;
    const away = match?.awayTeam;
    if (!home?.id || !away?.id) continue;
    const isHome = Number(home.id) === Number(team.id);
    const opponent = isHome ? away.shortName || away.name : home.shortName || home.name;
    const gf = isHome ? score.home : score.away;
    const ga = isHome ? score.away : score.home;
    lastGames.push({
      opponent: String(opponent || "Adversário"),
      score: scoreText(gf, ga),
      result: resultFromGoals(gf, ga),
      source: "Football-Data.org",
      competition: match?.competition?.name || "",
      date: match?.utcDate,
    });
  }

  if (!lastGames.length) return null;

  const goalsFor = lastGames.reduce((sum, game) => sum + Number(game.score.split(" x ")[0] || 0), 0);
  const goalsAgainst = lastGames.reduce((sum, game) => sum + Number(game.score.split(" x ")[1] || 0), 0);
  const form = lastGames.map(game => game.result);
  const wins = form.filter(r => r === "V").length;
  const draws = form.filter(r => r === "E").length;
  const losses = form.filter(r => r === "D").length;

  return {
    source: "Football-Data.org",
    teamId: Number(team.id),
    teamName: team.name || teamName,
    teamSlug: normalize(team.name || teamName).replace(/\s+/g, "-"),
    logo: team.crest,
    lastGames,
    form: form.slice(0, 5),
    goalsFor: Number((goalsFor / lastGames.length).toFixed(2)),
    goalsAgainst: Number((goalsAgainst / lastGames.length).toFixed(2)),
    corners: 0,
    cornersReliable: false,
    homeAway: { wins, draws, losses, estimated: false },
    sourceUrl: `https://www.football-data.org/`,
    sourceText: lastGames.map(g => `${team.name} ${g.score} ${g.opponent}${g.competition ? ` (${g.competition})` : ""}`).join("; "),
  };
}

export async function getFootballDataH2H(teamAId: number, teamBId: number) {
  try {
    const matches = await getTeamMatches(teamAId, 100);
    const h2h = matches.filter(match => {
      const homeId = Number(match?.homeTeam?.id);
      const awayId = Number(match?.awayTeam?.id);
      return (homeId === teamAId && awayId === teamBId) || (homeId === teamBId && awayId === teamAId);
    }).slice(0, 10);

    let teamAWins = 0, teamBWins = 0, draws = 0, teamAGoals = 0, teamBGoals = 0;
    for (const match of h2h) {
      const score = finishedScore(match);
      if (!score) continue;
      const teamAHome = Number(match?.homeTeam?.id) === teamAId;
      const aGoals = teamAHome ? score.home : score.away;
      const bGoals = teamAHome ? score.away : score.home;
      teamAGoals += aGoals;
      teamBGoals += bGoals;
      if (aGoals === bGoals) draws++;
      else if (aGoals > bGoals) teamAWins++;
      else teamBWins++;
    }

    return { teamAWins, draws, teamBWins, teamAGoals, teamBGoals, estimated: h2h.length === 0 };
  } catch {
    return { teamAWins: 0, draws: 0, teamBWins: 0, teamAGoals: 0, teamBGoals: 0, estimated: true };
  }
}

export async function getFootballDataTeamPair(teamA: string, teamB: string) {
  const [a, b] = await Promise.allSettled([
    getFootballDataTeamStats(teamA),
    getFootballDataTeamStats(teamB),
  ]);

  const teamAStats = a.status === "fulfilled" ? a.value : null;
  const teamBStats = b.status === "fulfilled" ? b.value : null;
  const h2h = teamAStats?.teamId && teamBStats?.teamId
    ? await getFootballDataH2H(teamAStats.teamId, teamBStats.teamId)
    : { teamAWins: 0, draws: 0, teamBWins: 0, teamAGoals: 0, teamBGoals: 0, estimated: true };

  return { teamA: teamAStats, teamB: teamBStats, h2h };
}
