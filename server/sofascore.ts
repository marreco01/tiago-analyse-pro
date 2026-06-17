export type SofaLastGame = {
  opponent: string;
  score: string;
  result: "V" | "E" | "D";
  source?: string;
  competition?: string;
  date?: string;
};

export type SofaTeamStats = {
  source: "SofaScore";
  teamId: number;
  teamName: string;
  teamSlug?: string;
  logo?: string;
  lastGames: SofaLastGame[];
  form: Array<"V" | "E" | "D">;
  goalsFor: number;
  goalsAgainst: number;
  homeAway: {
    wins: number;
    draws: number;
    losses: number;
    estimated: boolean;
  };
  sourceUrl: string;
  sourceText: string;
};

const SOFASCORE_BASES = [
  "https://www.sofascore.com/api/v1",
  "https://api.sofascore.com/api/v1",
];

const clean = (value: unknown) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const normalize = (value: string) =>
  clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const aliases: Record<string, string[]> = {
  flamengo: ["flamengo", "cr flamengo"],
  palmeiras: ["palmeiras", "se palmeiras"],
  botafogo: ["botafogo", "botafogo rj", "botafogo fr"],
  fluminense: ["fluminense", "fluminense fc"],
  vasco: ["vasco", "vasco da gama", "cr vasco da gama"],
  gremio: ["gremio", "grêmio", "gremio fbpa"],
  internacional: ["internacional", "sc internacional", "inter"],
  "sao paulo": ["sao paulo", "são paulo", "sao paulo fc"],
  "atletico mg": ["atletico mg", "atlético mg", "atletico mineiro", "atlético mineiro"],
  "athletico pr": ["athletico pr", "athletico paranaense", "athletico-pr"],
  psg: ["psg", "paris saint germain", "paris saint-germain"],
};
// IDs conhecidos do SofaScore para evitar falha quando a busca textual do SofaScore muda,
// bloqueia ou retorna outro clube. Se o ID estiver incorreto ou não responder, o código
// tenta a busca normal logo em seguida.
const knownSofaTeams: Record<string, { id: number; name: string; slug: string }> = {
  flamengo: { id: 5981, name: "Flamengo", slug: "flamengo" },
  palmeiras: { id: 1963, name: "Palmeiras", slug: "palmeiras" },
  botafogo: { id: 1958, name: "Botafogo", slug: "botafogo" },
  fluminense: { id: 1961, name: "Fluminense", slug: "fluminense" },
  vasco: { id: 1974, name: "Vasco da Gama", slug: "vasco-da-gama" },
  santos: { id: 1968, name: "Santos", slug: "santos" },
  "sao paulo": { id: 1981, name: "São Paulo", slug: "sao-paulo" },
  corinthians: { id: 1957, name: "Corinthians", slug: "corinthians" },
  gremio: { id: 5926, name: "Grêmio", slug: "gremio" },
  internacional: { id: 1966, name: "Internacional", slug: "internacional" },
  cruzeiro: { id: 1954, name: "Cruzeiro", slug: "cruzeiro" },
  "atletico mg": { id: 1977, name: "Atlético Mineiro", slug: "atletico-mineiro" },
  "atletico-mg": { id: 1977, name: "Atlético Mineiro", slug: "atletico-mineiro" },
  bahia: { id: 1955, name: "Bahia", slug: "bahia" },
  fortaleza: { id: 2020, name: "Fortaleza", slug: "fortaleza" },
  "athletico pr": { id: 1967, name: "Athletico", slug: "athletico" },
  "athletico-pr": { id: 1967, name: "Athletico", slug: "athletico" },
  vitoria: { id: 1962, name: "Vitória", slug: "vitoria" },
  "sport recife": { id: 2021, name: "Sport Recife", slug: "sport-recife" },
  ceara: { id: 2001, name: "Ceará", slug: "ceara" },
  juventude: { id: 1980, name: "Juventude", slug: "juventude" },
  psg: { id: 1644, name: "Paris Saint-Germain", slug: "paris-saint-germain" },
  arsenal: { id: 42, name: "Arsenal", slug: "arsenal" },
  "real madrid": { id: 2829, name: "Real Madrid", slug: "real-madrid" },
  barcelona: { id: 2817, name: "Barcelona", slug: "barcelona" },
  "manchester city": { id: 17, name: "Manchester City", slug: "manchester-city" },
  "manchester united": { id: 35, name: "Manchester United", slug: "manchester-united" },
  liverpool: { id: 44, name: "Liverpool", slug: "liverpool" },
  chelsea: { id: 38, name: "Chelsea", slug: "chelsea" },
};

function getKnownSofaTeam(teamName: string) {
  const normalized = normalize(teamName);
  const direct = knownSofaTeams[normalized];
  if (direct) return direct;

  for (const alias of teamAliases(teamName)) {
    if (knownSofaTeams[alias]) return knownSofaTeams[alias];
  }

  return null;
}


function teamAliases(teamName: string) {
  const base = normalize(teamName);
  return Array.from(new Set([base, ...(aliases[base] || [])].map(normalize))).filter(Boolean);
}

async function sofaFetch(path: string) {
  let lastError: unknown = null;
  for (const base of SOFASCORE_BASES) {
    try {
      const response = await fetch(`${base}${path}`, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
          accept: "application/json,text/plain,*/*",
          referer: "https://www.sofascore.com/",
          origin: "https://www.sofascore.com",
        },
      });
      if (!response.ok) {
        lastError = new Error(`SofaScore ${response.status} ${path}`);
        continue;
      }
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`SofaScore fetch failed: ${path}`);
}

function scoreTeamCandidate(entity: any, teamName: string) {
  const name = normalize(entity?.name || entity?.shortName || "");
  const slug = normalize(entity?.slug || "");
  const requested = teamAliases(teamName);
  let score = 0;
  for (const alias of requested) {
    if (name === alias || slug === alias) score += 100;
    else if (name.includes(alias) || alias.includes(name)) score += 70;
    else if (slug.includes(alias) || alias.includes(slug)) score += 55;
  }
  const sport = normalize(entity?.sport?.name || entity?.sport || "");
  if (sport.includes("football") || sport.includes("futebol") || sport.includes("soccer")) score += 15;
  return score;
}

export async function searchSofaScoreTeam(teamName: string): Promise<any | null> {
  const known = getKnownSofaTeam(teamName);
  if (known?.id) {
    console.log(`[SofaScore] usando ID conhecido para ${teamName}: ${known.id}`);
    return known;
  }

  const query = encodeURIComponent(teamName);
  const paths = [
    `/search/all?q=${query}&page=0`,
    `/search/teams?q=${query}&page=0`,
    `/search/team?q=${query}&page=0`,
  ];

  const candidates: any[] = [];
  for (const path of paths) {
    try {
      console.log(`[SofaScore] buscando time: ${teamName} em ${path}`);
      const data = await sofaFetch(path);

      const rawResults = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.teams)
          ? data.teams
          : Array.isArray(data?.teamResults)
            ? data.teamResults
            : [];

      for (const item of rawResults) {
        const entity = item?.entity || item?.team || item;
        const type = normalize(item?.type || entity?.type || "");
        const sport = normalize(entity?.sport?.name || entity?.sport || "");
        const category = normalize(entity?.category?.name || entity?.country?.name || "");
        if (type && !type.includes("team") && !sport.includes("football") && !sport.includes("soccer")) continue;
        if (!entity?.id || !entity?.name) continue;

        // Evita selecionar times de outros esportes quando o SofaScore retorna múltiplas entidades.
        if (sport && !sport.includes("football") && !sport.includes("soccer")) continue;

        candidates.push({ ...entity, _category: category });
      }
    } catch (error) {
      console.warn("[SofaScore] busca falhou:", path, error);
    }
  }

  if (!candidates.length) {
    console.warn(`[SofaScore] nenhum time encontrado para: ${teamName}`);
    return null;
  }

  candidates.sort((a, b) => scoreTeamCandidate(b, teamName) - scoreTeamCandidate(a, teamName));
  console.log(`[SofaScore] escolhido para ${teamName}:`, candidates[0]?.id, candidates[0]?.name, candidates[0]?.slug);
  return candidates[0];
}

function eventIsFinished(event: any) {
  const status = normalize(event?.status?.type || event?.status?.description || event?.status?.code || "");
  return status.includes("finished") || status.includes("ended") || status.includes("after") || event?.winnerCode;
}

function getScore(event: any) {
  const home = event?.homeScore?.current ?? event?.homeScore?.normaltime ?? event?.homeScore?.display;
  const away = event?.awayScore?.current ?? event?.awayScore?.normaltime ?? event?.awayScore?.display;
  if (typeof home !== "number" || typeof away !== "number") return null;
  if (home > 9 || away > 9) return null;
  return { home, away, text: `${home} x ${away}` };
}

function resultFromGoals(goalsFor: number, goalsAgainst: number): "V" | "E" | "D" {
  if (goalsFor === goalsAgainst) return "E";
  return goalsFor > goalsAgainst ? "V" : "D";
}

function makeTeamUrl(team: any) {
  const slug = team?.slug || normalize(team?.name || "").replace(/\s+/g, "-");
  return `https://www.sofascore.com/team/football/${slug}/${team?.id}`;
}

export async function getSofaScoreTeamStats(teamName: string): Promise<SofaTeamStats | null> {
  const team = await searchSofaScoreTeam(teamName);
  if (!team?.id) {
    console.warn(`[SofaScore] ID não encontrado para ${teamName}`);
    return null;
  }

  const events: any[] = [];
  for (const page of [0, 1]) {
    try {
      console.log(`[SofaScore] buscando eventos: ${teamName} (${team.id}) página ${page}`);
      const data = await sofaFetch(`/team/${team.id}/events/last/${page}`);
      const pageEvents = Array.isArray(data?.events) ? data.events : [];
      events.push(...pageEvents);
      if (events.length >= 12) break;
    } catch (error) {
      console.warn("SofaScore events failed:", teamName, error);
    }
  }

  const lastGames: SofaLastGame[] = [];
  for (const event of events) {
    if (lastGames.length >= 5) break;
    if (!eventIsFinished(event)) continue;
    const score = getScore(event);
    if (!score) continue;
    const home = event?.homeTeam;
    const away = event?.awayTeam;
    if (!home?.name || !away?.name) continue;
    const isHome = Number(home.id) === Number(team.id);
    const opponent = isHome ? away.name : home.name;
    const gf = isHome ? score.home : score.away;
    const ga = isHome ? score.away : score.home;
    const date = event?.startTimestamp
      ? new Date(Number(event.startTimestamp) * 1000).toISOString()
      : undefined;
    lastGames.push({
      opponent: clean(opponent),
      score: isHome ? score.text : `${score.away} x ${score.home}`,
      result: resultFromGoals(gf, ga),
      source: "SofaScore",
      competition: clean(event?.tournament?.name || event?.season?.name || ""),
      date,
    });
  }

  if (!lastGames.length) {
    console.warn(`[SofaScore] sem últimos jogos válidos para ${teamName} (${team.id})`);
    return null;
  }

  let goalsFor = 0;
  let goalsAgainst = 0;
  for (const game of lastGames) {
    const match = game.score.match(/(\d+)\s*x\s*(\d+)/i);
    if (!match) continue;
    goalsFor += Number(match[1]);
    goalsAgainst += Number(match[2]);
  }

  const form = lastGames.map(game => game.result);
  const wins = form.filter(item => item === "V").length;
  const draws = form.filter(item => item === "E").length;
  const losses = form.filter(item => item === "D").length;
  const sourceUrl = makeTeamUrl(team);

  return {
    source: "SofaScore",
    teamId: Number(team.id),
    teamName: clean(team.name || teamName),
    teamSlug: clean(team.slug || ""),
    logo: `https://www.sofascore.com/api/v1/team/${team.id}/image`,
    lastGames,
    form: form.slice(0, 5),
    goalsFor: Number((goalsFor / lastGames.length).toFixed(2)),
    goalsAgainst: Number((goalsAgainst / lastGames.length).toFixed(2)),
    homeAway: { wins, draws, losses, estimated: false },
    sourceUrl,
    sourceText: lastGames
      .map(game => `${teamName} ${game.score} ${game.opponent}${game.competition ? ` (${game.competition})` : ""}`)
      .join("; "),
  };
}

export async function getSofaScoreTeamPair(teamA: string, teamB: string) {
  const [teamAStats, teamBStats] = await Promise.allSettled([
    getSofaScoreTeamStats(teamA),
    getSofaScoreTeamStats(teamB),
  ]);

  return {
    teamA: teamAStats.status === "fulfilled" ? teamAStats.value : null,
    teamB: teamBStats.status === "fulfilled" ? teamBStats.value : null,
  };
}
