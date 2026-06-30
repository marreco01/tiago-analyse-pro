export type StructuredLastGame = {
  opponent: string;
  score: string;
  result: "V" | "E" | "D";
  source?: string;
  competition?: string;
  date?: string;
};

export type StructuredTeamStats = {
  source: string;
  teamId: string | number;
  teamName: string;
  logo?: string;
  lastGames: StructuredLastGame[];
  form: Array<"V" | "E" | "D">;
  goalsFor: number;
  goalsAgainst: number;
  corners: number;
  cornersReliable: false;
  homeAway: { wins: number; draws: number; losses: number; estimated: false };
  sourceUrl: string;
  sourceText: string;
};


function readSportsDbKey() {
  const key =
    process.env.THESPORTSDB_API_KEY ||
    process.env.SPORTSDB_API_KEY ||
    process.env.THE_SPORTS_DB_API_KEY ||
    "123";
  return String(key).trim() || "123";
}

const SPORTSDB_BASE = () => `https://www.thesportsdb.com/api/v1/json/${readSportsDbKey()}`;


const normalize = (value: string) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(fc|cf|sc|ec|ac|club|clube|football|futebol|sociedade|associacao|regatas)\b/g, " ")
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

function scoreName(candidate: any, requestedName: string) {
  const wanted = aliases(requestedName);
  const haystacks = [candidate?.strTeam, candidate?.strTeamAlternate, candidate?.strShortName]
    .filter(Boolean)
    .map(normalize);
  let score = 0;
  for (const alias of wanted) {
    for (const hay of haystacks) {
      if (!hay) continue;
      if (hay === alias) score += 100;
      else if (hay.includes(alias) || alias.includes(hay)) score += 65;
      else {
        const words = alias.split(" ").filter(w => w.length > 2);
        score += words.filter(w => hay.includes(w)).length * 15;
      }
    }
  }
  return score;
}

async function sportsDbFetch(path: string) {
  const response = await fetch(`${SPORTSDB_BASE()}${path}`, {
    headers: { accept: "application/json", "user-agent": "TIAGO-ANALYSE-PRO/1.0" },
  });
  if (!response.ok) throw new Error(`TheSportsDB ${response.status} ${path}`);
  return response.json();
}

export async function searchSportsDbTeam(teamName: string) {
  const data = await sportsDbFetch(`/searchteams.php?t=${encodeURIComponent(teamName)}`);
  const teams = Array.isArray(data?.teams) ? data.teams : [];
  const ranked = teams
    .filter((team: any) => normalize(team?.strSport || "").includes("soccer"))
    .map((team: any) => ({ team, score: scoreName(team, teamName) }))
    .filter((item: any) => item.score > 0)
    .sort((a: any, b: any) => b.score - a.score);
  const chosen = ranked[0]?.team || null;
  console.log("[TheSportsDB] time escolhido:", teamName, "=>", chosen?.idTeam, chosen?.strTeam);
  return chosen;
}

function resultFromGoals(gf: number, ga: number): "V" | "E" | "D" {
  if (gf === ga) return "E";
  return gf > ga ? "V" : "D";
}

function validScore(home: unknown, away: unknown) {
  const h = Number(home);
  const a = Number(away);
  if (!Number.isFinite(h) || !Number.isFinite(a)) return null;
  if (h < 0 || a < 0 || h > 12 || a > 12) return null;
  return { home: h, away: a };
}

export async function getSportsDbTeamStats(teamName: string): Promise<StructuredTeamStats | null> {
  try {
    const team = await searchSportsDbTeam(teamName);
    if (!team?.idTeam) return null;

    const eventsData = await sportsDbFetch(`/eventslast.php?id=${encodeURIComponent(team.idTeam)}`);
    const events = Array.isArray(eventsData?.results) ? eventsData.results : [];
    const lastGames: StructuredLastGame[] = [];

    for (const event of events) {
      if (lastGames.length >= 5) break;
      const score = validScore(event?.intHomeScore, event?.intAwayScore);
      if (!score) continue;

      const home = String(event?.strHomeTeam || "").trim();
      const away = String(event?.strAwayTeam || "").trim();
      if (!home || !away) continue;

      const isHome = normalize(home) === normalize(team.strTeam);
      const isAway = normalize(away) === normalize(team.strTeam);
      if (!isHome && !isAway) continue;

      const opponent = isHome ? away : home;
      const gf = isHome ? score.home : score.away;
      const ga = isHome ? score.away : score.home;

      lastGames.push({
        opponent,
        score: `${gf} x ${ga}`,
        result: resultFromGoals(gf, ga),
        source: "TheSportsDB",
        competition: event?.strLeague || "",
        date: event?.dateEvent || event?.strTimestamp || "",
      });
    }

    if (!lastGames.length) return null;

    const goalsFor = lastGames.reduce((sum, game) => sum + Number(game.score.split(" x ")[0] || 0), 0);
    const goalsAgainst = lastGames.reduce((sum, game) => sum + Number(game.score.split(" x ")[1] || 0), 0);
    const form = lastGames.map(game => game.result);

    return {
      source: "TheSportsDB",
      teamId: team.idTeam,
      teamName: team.strTeam || teamName,
      logo: team.strBadge || team.strLogo || "",
      lastGames,
      form: form.slice(0, 5),
      goalsFor: Number((goalsFor / lastGames.length).toFixed(2)),
      goalsAgainst: Number((goalsAgainst / lastGames.length).toFixed(2)),
      corners: 0,
      cornersReliable: false,
      homeAway: {
        wins: form.filter(r => r === "V").length,
        draws: form.filter(r => r === "E").length,
        losses: form.filter(r => r === "D").length,
        estimated: false,
      },
      sourceUrl: "https://www.thesportsdb.com/",
      sourceText: lastGames.map(g => `${team.strTeam} ${g.score} ${g.opponent}${g.competition ? ` (${g.competition})` : ""}`).join("; "),
    };
  } catch (error) {
    console.warn("[TheSportsDB] falhou:", String(error).slice(0, 220));
    return null;
  }
}

export async function getSportsDbTeamPair(teamA: string, teamB: string) {
  const [a, b] = await Promise.allSettled([
    getSportsDbTeamStats(teamA),
    getSportsDbTeamStats(teamB),
  ]);

  const teamAStats = a.status === "fulfilled" ? a.value : null;
  const teamBStats = b.status === "fulfilled" ? b.value : null;

  return { teamA: teamAStats, teamB: teamBStats };
}
