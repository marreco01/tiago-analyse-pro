import type { Express, Request, Response } from "express";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { getUserByToken, isAdmin } from "./app-data";
import {
  getGameRobotLogs,
  getGameRobotStatus,
  getCachedGames,
  getNewsRobotLogs,
  getNewsRobotStatus,
  getWorldCupRobotLogs,
  getWorldCupRobotStatus,
  getWorldCupTeamsForCompare,
  findWorldCupAnalysis,
  getCachedWorldCup,
  startWorldCupRobot,
  updateWorldCupRobot,
  setWorldCupManualResult,
  startGameRobot,
  updateGameRobot,
  updatePublicNews,
  getCachedStatistics,
  getStatisticalOpportunity,
  getStatisticalRobotLogs,
  getStatisticalRobotStatus,
  startStatisticalRobot,
  updateStatisticalRobot,
  getCachedCorners,
  getCornerOpportunity,
  getCornerRobotLogs,
  getCornerRobotStatus,
  startCornerRobot,
  updateCornerRobot,
  getCachedCards,
  getCardOpportunity,
  getCardRobotLogs,
  getCardRobotStatus,
  startCardRobot,
  updateCardRobot,
  getCachedGoals,
  getGoalOpportunity,
  getGoalRobotLogs,
  getGoalRobotStatus,
  startGoalRobot,
  updateGoalRobot,
  getCachedLiveRobot,
  getLiveRobotLogs,
  getLiveRobotStatus,
  startLiveRobot,
  updateLiveRobot,
  getCachedUpcomingRobot,
  getUpcomingRobotLogs,
  getUpcomingRobotStatus,
  startUpcomingRobot,
  updateUpcomingRobot,
  getCachedInstagramProjects,
  getInstagramRobotLogs,
  getInstagramRobotStatus,
  startInstagramRobot,
  updateInstagramProjectStatus,
  updateInstagramRobot,
  getCachedBrasileiraoTable,
  getBrasileiraoTableRobotLogs,
  getBrasileiraoTableRobotStatus,
  startBrasileiraoTableRobot,
  updateBrasileiraoTableRobot,
  getCachedBrasileiraoBTable,
  getBrasileiraoBTableRobotLogs,
  getBrasileiraoBTableRobotStatus,
  startBrasileiraoBTableRobot,
  updateBrasileiraoBTableRobot,
  startBrasileiraoLogoRobot,
  updateBrasileiraoLogoRobot,
  getBrasileiraoLogoRobotStatus,
  getBrasileiraoLogoRobotLogs,
  getCachedBrasileiraoLogos,
  getBrasileiraoLogoImage,
  startRankingRobot,
  updateRankingRobot,
  getRankingRobotStatus,
  getRankingRobotLogs,
  getCachedRankingRobot,
  startCalendarRobot,
  updateCalendarRobot,
  getCalendarRobotStatus,
  getCalendarRobotLogs,
  getCachedCalendarRobot,
  startMasterSearchRobot,
  updateMasterSearchRobot,
  getMasterSearchRobotStatus,
  getMasterSearchRobotLogs,
  getCachedMasterSearchRobot,
  collectMasterSearchLogs,
  getMasterCompare,
  getCompetitionAreaRobotArchitecture,
  runChampionshipRobotGroup,
  runAnalysisAreaRobotGroup,
} from "./scraper";

function requireAdmin(req: Request, res: Response) {
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const user = token ? getUserByToken(token) : null;

  if (!user) {
    res
      .status(401)
      .json({ success: false, error: "Faça login como administrador." });
    return null;
  }

  if (!isAdmin(user)) {
    res
      .status(403)
      .json({
        success: false,
        error: "Acesso permitido apenas ao administrador.",
      });
    return null;
  }

  return user;
}

function clampPercent(value: number, min = 35, max = 96) {
  if (!Number.isFinite(value)) return 50;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function impliedProbabilityFromOdd(odd: number) {
  if (!Number.isFinite(odd) || odd <= 1) return 0;
  return 100 / odd;
}

function fairOdd(probability: number) {
  const p = Math.max(1, Math.min(99, probability)) / 100;
  return Number((1 / p).toFixed(2));
}

function riskFromConfidence(confidence: number) {
  if (confidence >= 82) return "Baixo";
  if (confidence >= 70) return "Médio";
  return "Alto";
}

function hashText(text: string) {
  let hash = 0;
  const raw = String(text || "");
  for (let i = 0; i < raw.length; i++)
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

function teamStyleScore(name: string) {
  const n = String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const defensive = [
    "uruguay",
    "croacia",
    "croatia",
    "italia",
    "italy",
    "paraguay",
    "japan",
    "japao",
    "morocco",
    "marrocos",
    "senegal",
    "coritiba",
    "athletico",
    "vasco",
  ];
  const open = [
    "brasil",
    "brazil",
    "franca",
    "france",
    "argentina",
    "portugal",
    "alemanha",
    "germany",
    "england",
    "inglaterra",
    "spain",
    "espanha",
    "flamengo",
    "palmeiras",
    "botafogo",
    "fluminense",
    "real madrid",
    "manchester city",
    "liverpool",
    "psg",
    "bayern",
    "barcelona",
  ];
  if (open.some(x => n.includes(x))) return 9;
  if (defensive.some(x => n.includes(x))) return 4;
  return 6 + (hashText(n) % 4);
}

function marketOddFromConfidence(probability: number) {
  const p = Math.max(1, Math.min(96, probability)) / 100;
  const conservativeMargin =
    probability >= 88 ? 1.12 : probability >= 78 ? 1.1 : 1.08;
  return Number(((1 / p) * conservativeMargin).toFixed(2));
}

function bookmakerOddEstimate(
  probability: number,
  market: string,
  seed: string
) {
  const base = marketOddFromConfidence(probability);
  const variation = 1 + ((hashText(seed + market) % 18) - 5) / 100;
  return Number(Math.max(1.18, base * variation).toFixed(2));
}

function valueGrade(confidence: number, offeredOdd: number) {
  const fair = fairOdd(confidence);
  const ev = ((confidence / 100) * offeredOdd - 1) * 100;
  if (ev >= 18) return "Muito forte";
  if (ev >= 8) return "Valor positivo";
  if (offeredOdd > fair) return "Leve valor";
  return "Neutro";
}

function valueStatus(confidence: number, marketOdd?: number) {
  if (!marketOdd || marketOdd <= 1) return "Aguardando odd";
  const implied = impliedProbabilityFromOdd(marketOdd);
  const edge = confidence - implied;
  if (edge >= 8) return "Valor positivo";
  if (edge >= 2) return "Neutro";
  return "Sem valor";
}

function normalizeLeagueName(league: string) {
  const raw = String(league || "Competição");
  const l = raw.toLowerCase();
  if (
    l.includes("série b") ||
    l.includes("serie b") ||
    l.includes("brasileirao b") ||
    l.includes("brasileirão b")
  )
    return "Brasileirão Série B";
  if (l.includes("brasile")) return "Brasileirão Série A";
  if (l.includes("world") || l.includes("copa")) return "Copa do Mundo";
  if (l.includes("libertadores")) return "Libertadores";
  if (l.includes("champions")) return "Champions League";
  if (l.includes("premier")) return "Premier League";
  return raw.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function competitionWeight(league: string) {
  const l = String(league || "").toLowerCase();
  if (l.includes("copa") || l.includes("world")) return 18;
  if (l.includes("mundial")) return 17;
  if (l.includes("libertadores")) return 16;
  if (l.includes("champions")) return 16;
  if (l.includes("brasile")) return 15;
  if (
    l.includes("premier") ||
    l.includes("la liga") ||
    l.includes("serie a") ||
    l.includes("bundesliga") ||
    l.includes("ligue")
  )
    return 12;
  return 6;
}

function teamPower(name: string) {
  const n = String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const elite = [
    "flamengo",
    "palmeiras",
    "botafogo",
    "sao paulo",
    "corinthians",
    "fluminense",
    "gremio",
    "internacional",
    "cruzeiro",
    "atletico",
    "brasil",
    "argentina",
    "franca",
    "france",
    "espanha",
    "spain",
    "portugal",
    "inglaterra",
    "england",
    "alemanha",
    "germany",
    "real madrid",
    "barcelona",
    "manchester city",
    "liverpool",
    "arsenal",
    "bayern",
    "psg",
    "inter",
    "milan",
    "juventus",
    "napoli",
  ];
  const strong = [
    "bahia",
    "fortaleza",
    "vasco",
    "santos",
    "athletico",
    "bragantino",
    "chelsea",
    "tottenham",
    "dortmund",
    "atletico madrid",
    "benfica",
    "porto",
    "ajax",
    "marseille",
    "monaco",
  ];
  if (elite.some(x => n.includes(x))) return 12;
  if (strong.some(x => n.includes(x))) return 8;
  return 4;
}

function buildMarketConfidence(event: any, market: string) {
  const league = String(event.league || event.competition || "");
  const importance = Number(
    event.priority || event.importance || competitionWeight(league) * 5
  );
  const homePower = teamPower(event.home);
  const awayPower = teamPower(event.away);
  const style = teamStyleScore(event.home) + teamStyleScore(event.away);
  const diff = Math.abs(homePower - awayPower);
  const seed = hashText(
    `${event.home}-${event.away}-${league}-${market}-${event.date || ""}`
  );
  const variance = (seed % 17) - 8;
  const leagueBoost = Math.min(12, competitionWeight(league) / 2);
  const base =
    50 +
    leagueBoost +
    Math.min(10, importance / 12) +
    Math.min(10, (homePower + awayPower) / 3) +
    variance;

  if (market === "Over 1.5") {
    return clampPercent(
      base + Math.round(style / 2) + (diff <= 4 ? 3 : -1),
      62,
      91
    );
  }
  if (market === "Over 2.5") {
    return clampPercent(
      base + Math.round(style / 3) - 5 + (diff <= 6 ? 2 : -2),
      48,
      84
    );
  }
  if (market === "Ambas Marcam") {
    return clampPercent(
      base - 8 + (diff <= 4 ? 8 : diff <= 8 ? 3 : -5),
      42,
      82
    );
  }
  if (market === "Over 8.5 escanteios") {
    const cornerBias = (homePower + awayPower >= 16 ? 5 : 0) + (seed % 9);
    return clampPercent(base - 4 + cornerBias, 44, 86);
  }
  if (market === "Over 3.5 cartões") {
    const hotLeague = /brasile|libertadores|copa|world/i.test(league) ? 8 : 2;
    return clampPercent(base - 7 + hotLeague + (seed % 7), 40, 84);
  }
  if (market === "Favorito") {
    return clampPercent(
      base - 10 + diff * 2 + (homePower > awayPower ? 3 : 0),
      42,
      88
    );
  }
  return clampPercent(base, 40, 88);
}

function isValidFixtureName(name: unknown) {
  const text = String(name || "").trim();
  if (text.length < 2) return false;
  if (/^(undefined|null|time a|time b|selecione|aguardando)$/i.test(text))
    return false;
  return true;
}

function todayIsoBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDaysIsoBrazil(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function normalizeEntryFixture(
  raw: any,
  fallbackLeague = "Competição",
  index = 0
) {
  const home = String(
    raw?.home ||
      raw?.homeTeam ||
      raw?.mandante ||
      raw?.teamA ||
      raw?.team1 ||
      ""
  ).trim();
  const away = String(
    raw?.away ||
      raw?.awayTeam ||
      raw?.visitante ||
      raw?.teamB ||
      raw?.team2 ||
      ""
  ).trim();
  if (
    !isValidFixtureName(home) ||
    !isValidFixtureName(away) ||
    home.toLowerCase() === away.toLowerCase()
  )
    return null;

  const league = normalizeLeagueName(
    raw?.league ||
      raw?.competition ||
      raw?.tournament ||
      raw?.country ||
      fallbackLeague
  );
  const date =
    String(raw?.date || raw?.day || "").slice(0, 10) ||
    addDaysIsoBrazil(index % 8);
  const time =
    String(raw?.time || raw?.hour || raw?.kickoff || "--:--").slice(0, 5) ||
    "--:--";
  const status = String(
    raw?.status || raw?.statusLabel || "scheduled"
  ).toLowerCase();

  return {
    id: String(
      raw?.fixtureId ||
        raw?.matchId ||
        raw?.id ||
        `${league}-${date}-${home}-${away}`
    ).replace(/\s+/g, "-"),
    fixtureId: String(raw?.fixtureId || raw?.matchId || raw?.id || ""),
    home,
    away,
    homeLogo:
      raw?.homeLogo || raw?.homeFlag || raw?.homeCrest || raw?.homeBadge || "",
    awayLogo:
      raw?.awayLogo || raw?.awayFlag || raw?.awayCrest || raw?.awayBadge || "",
    date,
    time,
    league,
    competition: league,
    venue: raw?.venue || raw?.stadium || raw?.arena || "",
    status:
      status.includes("final") || status.includes("finished")
        ? "finished"
        : status.includes("live") || status.includes("ao vivo")
          ? "live"
          : "scheduled",
    priority: Number(
      raw?.priority || raw?.importance || competitionWeight(league) * 5
    ),
    importance: Number(
      raw?.importance || raw?.priority || competitionWeight(league) * 5
    ),
    source: raw?.source || "entries-master-source",
  };
}


function normalizeEntryTeamKey(name: string) {
  const cleaned = normalizeTeamKey(name);
  const aliases: Record<string, string> = {
    portugal: "portugal",
    por: "portugal",
    congodr: "congodr",
    rdcongo: "congodr",
    drcongo: "congodr",
    congodemocraticrepublic: "congodr",
    democraticrepublicofcongo: "congodr",
    cod: "congodr",
    brazil: "brasil",
    bra: "brasil",
    brasil: "brasil",
    haiti: "haiti",
    hai: "haiti",
    argentina: "argentina",
    arg: "argentina",
    algeria: "argelia",
    argelia: "argelia",
    dz: "argelia",
    dza: "argelia",
    england: "england",
    inglaterra: "england",
    eng: "england",
    croatia: "croacia",
    croacia: "croacia",
    cro: "croacia",
  };
  return aliases[cleaned] || cleaned;
}

function normalizedEntryGameKey(event: any) {
  const homeKey = normalizeEntryTeamKey(String(event?.home || ""));
  const awayKey = normalizeEntryTeamKey(String(event?.away || ""));
  const teams = [homeKey, awayKey].sort().join("-");
  return `${event?.date || ""}-${teams}`;
}

function fixtureIdentityKeys(event: any) {
  const fixtureId = String(event?.fixtureId || event?.id || "").trim().toLowerCase();
  const gameKey = normalizedEntryGameKey(event);
  const homeKey = normalizeEntryTeamKey(String(event?.home || ""));
  const awayKey = normalizeEntryTeamKey(String(event?.away || ""));
  return { fixtureId, gameKey, homeKey, awayKey };
}

function collectEntryFixtures(master: any) {
  const buckets: Array<{ list: any[]; league: string }> = [
    {
      list: Array.isArray(master?.calendar?.events)
        ? master.calendar.events
        : [],
      league: "Calendário Master",
    },
    {
      list: Array.isArray(master?.upcoming?.games) ? master.upcoming.games : [],
      league: "Próximos Jogos",
    },
    {
      list: Array.isArray(master?.worldCup?.matches)
        ? master.worldCup.matches
        : [],
      league: "Copa do Mundo",
    },
    {
      list: Array.isArray(master?.brasileiraoTable?.nextRound)
        ? master.brasileiraoTable.nextRound
        : [],
      league: "Brasileirão Série A",
    },
    {
      list: Array.isArray(master?.brasileiraoBTable?.nextRound)
        ? master.brasileiraoBTable.nextRound
        : [],
      league: "Brasileirão Série B",
    },
    { list: Array.isArray(master?.games) ? master.games : [], league: "Jogos" },
  ];

  const today = todayIsoBrazil();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 2);
  const maxIso = maxDate.toISOString().slice(0, 10);
  const unique = new Map<string, any>();

  for (const bucket of buckets) {
    for (const item of bucket.list) {
      const fixture = normalizeEntryFixture(item, bucket.league, unique.size);
      if (!fixture) continue;
      if (fixture.status === "finished") continue;
      if (!fixture.date) continue;
      if (fixture.date < today) continue;
      if (fixture.date > maxIso) continue;
      const { fixtureId, gameKey } = fixtureIdentityKeys(fixture);
      const key = fixtureId || gameKey;
      if (!unique.has(key)) unique.set(key, fixture);
    }
  }

  return Array.from(unique.values()).sort((a, b) => {
    const weight = competitionWeight(b.league) - competitionWeight(a.league);
    if (weight) return weight;
    const p =
      Number(b.priority || b.importance || 0) -
      Number(a.priority || a.importance || 0);
    if (p) return p;
    return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
  });
}

function fallbackEntryFixtures() {
  // V45: removido calendário/entradas fake. Entradas IA só com jogos reais do Master.
  return [] as any[];
}

function marketLabel(market: string) {
  if (market === "Ambas Marcam") return "BTTS";
  return market;
}

// V45 Entradas IA: aplica margem de segurança no mercado publicado.
// O robô pode detectar uma linha mais alta, mas a entrada exibida fica mais conservadora.
// Ex.: 8.5 cantos vira 4.5; 4.5 cartões vira 2.5; Over 2.5 gols vira Over 1.5.
function safeEntryMarket(market: string) {
  const text = String(market || "");

  // Resultado/under gols não recebem redução, como combinado.
  if (/favorito|dupla chance|empate anula/i.test(text)) return text;
  if (/under/i.test(text)) return text;

  const overMatch = text.match(/Over\s+(\d+(?:\.5)?)/i);
  if (!overMatch) return text;

  const line = Number(overMatch[1]);
  if (!Number.isFinite(line)) return text;

  let safeLine = line;
  if (/escanteio/i.test(text)) {
    safeLine = Math.max(3.5, Math.floor(line / 2) + 0.5);
  } else if (/cart/i.test(text)) {
    safeLine = Math.max(1.5, Math.floor(line / 2) + 0.5);
  } else if (/gol|gols/i.test(text)) {
    safeLine = Math.max(0.5, line - 1);
  }

  return text.replace(/Over\s+\d+(?:\.5)?/i, `Over ${safeLine.toFixed(1)}`);
}

function entryMarketGroup(market: string) {
  const text = String(market || "").toLowerCase();
  if (
    text.includes("favorito") ||
    text.includes("dupla chance") ||
    text.includes("empate anula")
  ) {
    return "resultado";
  }
  if (text.includes("escanteio") || text.includes("cart")) {
    return "complementar";
  }
  if (
    text.includes("gol") ||
    text.includes("over") ||
    text.includes("under") ||
    text.includes("ambas") ||
    text.includes("btts")
  ) {
    return "gols";
  }
  return "outros";
}

function entryGameKey(entry: any) {
  return entry.fixtureId ? String(entry.fixtureId).toLowerCase() : normalizedEntryGameKey(entry);
}

function buildEntryForMarket(event: any, eventIndex: number, market: string) {
  const rawMarket = market;
  const publishedMarket = safeEntryMarket(rawMarket);
  const league = normalizeLeagueName(
    event.league || event.competition || "Competição"
  );
  const priority = Number(
    event.priority || event.importance || competitionWeight(league) * 5
  );
  const confidence = buildMarketConfidence(
    { ...event, league, priority, importance: priority },
    rawMarket
  );
  const oddJusta = marketOddFromConfidence(confidence);
  const estimatedMarketOdd = bookmakerOddEstimate(
    confidence,
    market,
    `${event.home}-${event.away}-${league}`
  );
  const ev = Number(
    (((confidence / 100) * estimatedMarketOdd - 1) * 100).toFixed(1)
  );
  const risk = riskFromConfidence(confidence);
  const group = entryMarketGroup(publishedMarket);
  const groupBonus = group === "gols" ? 6 : group === "resultado" ? 5 : group === "complementar" ? 4 : 0;
  const score =
    confidence +
    groupBonus +
    Math.max(0, ev / 2) +
    competitionWeight(league) * 2 +
    Math.min(18, teamPower(event.home) + teamPower(event.away)) +
    Math.min(12, priority / 10);

  return {
    id: `${event.fixtureId || event.id || eventIndex}-${publishedMarket.replace(/\W+/g, "-").toLowerCase()}`,
    fixtureId: event.fixtureId || event.id || "",
    home: event.home,
    away: event.away,
    homeLogo: event.homeLogo,
    awayLogo: event.awayLogo,
    date: event.date || "",
    time: event.time || "--:--",
    league,
    competition: league,
    venue: event.venue || "",
    market: publishedMarket,
    rawMarket,
    marketGroup: group,
    confidence,
    fairOdd: oddJusta,
    estimatedMarketOdd,
    ev,
    risk,
    value: valueGrade(confidence, estimatedMarketOdd),
    stakePercent:
      confidence >= 84 ? 4 : confidence >= 75 ? 3 : confidence >= 68 ? 2 : 1,
    reason:
      "Robô avaliou mercados por categoria, aplicou margem de segurança e publicou 1 de gols, 1 de resultado e 1 complementar.",
    score,
  };
}

function buildMasterEntries(master: any, limit = 3) {
  const fixtures = collectEntryFixtures(master).slice(0, 80);

  const marketsByGroup: Record<string, string[]> = {
    gols: [
      "Over 1.5 gols",
      "Over 2.5 gols",
      "Over 3.5 gols",
      "Under 3.5 gols",
      "Ambas marcam - Sim",
      "Ambas marcam - Não",
    ],
    resultado: ["Favorito", "Dupla chance", "Empate anula"],
    complementar: [
      "Over 7.5 escanteios",
      "Over 8.5 escanteios",
      "Over 9.5 escanteios",
      "Over 10.5 escanteios",
      "Over 3.5 cartões",
      "Over 4.5 cartões",
      "Over 5.5 cartões",
    ],
  };

  const approvedGames: any[][] = [];
  const usedGames = new Set<string>();
  const usedTeams = new Set<string>();

  for (const [eventIndex, event] of fixtures.entries()) {
    const { fixtureId, gameKey, homeKey, awayKey } = fixtureIdentityKeys(event);
    const uniqueGameKey = fixtureId || gameKey;
    if (usedGames.has(uniqueGameKey)) continue;
    if (usedTeams.has(homeKey) || usedTeams.has(awayKey)) continue;

    const selected: any[] = [];
    for (const group of ["gols", "resultado", "complementar"]) {
      const seenPublishedMarkets = new Set<string>();
      const candidates = marketsByGroup[group]
        .map(market => buildEntryForMarket(event, eventIndex, market))
        .filter(entry => {
          if (entry.confidence < 75) return false;
          const key = String(entry.market || "").toLowerCase();
          if (seenPublishedMarkets.has(key)) return false;
          seenPublishedMarkets.add(key);
          return true;
        })
        .sort((a, b) => b.score - a.score);
      if (!candidates.length) break;
      selected.push(candidates[0]);
    }

    if (selected.length !== 3) continue;
    usedGames.add(uniqueGameKey);
    usedGames.add(gameKey);
    if (fixtureId) usedGames.add(fixtureId);
    usedTeams.add(homeKey);
    usedTeams.add(awayKey);
    approvedGames.push(
      selected.sort((a, b) => {
        const order: Record<string, number> = { gols: 0, resultado: 1, complementar: 2 };
        return (order[a.marketGroup] ?? 9) - (order[b.marketGroup] ?? 9);
      })
    );
  }

  return approvedGames
    .sort((a, b) => {
      const avgA = a.reduce((sum, item) => sum + item.confidence, 0) / 3;
      const avgB = b.reduce((sum, item) => sum + item.confidence, 0) / 3;
      const scoreA = a.reduce((sum, item) => sum + item.score, 0);
      const scoreB = b.reduce((sum, item) => sum + item.score, 0);
      return avgB - avgA || scoreB - scoreA;
    })
    .slice(0, limit)
    .flat();
}

function buildEntriesGroups(entries: any[]) {
  const gameMap = new Map<string, any[]>();
  for (const entry of entries) {
    const key = entryGameKey(entry);
    const list = gameMap.get(key) || [];
    if (!list.some(item => item.marketGroup === entry.marketGroup) && list.length < 3) {
      list.push(entry);
    }
    gameMap.set(key, list);
  }
  const topGames = Array.from(gameMap.values())
    .filter(markets => markets.length === 3)
    .map(markets => ({
      game: markets[0],
      markets,
      bestMarket: markets[0],
      confidence: Math.round(
        markets.reduce((sum, item) => sum + item.confidence, 0) / 3
      ),
    }));
  return {
    topGames,
    top: entries.slice(0, 9),
    dailyMultiples: topGames,
    conservadora: [],
    moderada: [],
    agressiva: [],
    goals: entries.filter(entry => entry.marketGroup === "gols").slice(0, 3),
    btts: entries.filter(entry => String(entry.market).toLowerCase().includes("ambas")).slice(0, 3),
    corners: entries.filter(entry => String(entry.market).includes("escanteios")).slice(0, 3),
    cards: entries.filter(entry => String(entry.market).includes("cartões")).slice(0, 3),
    favorites: entries.filter(entry => entry.marketGroup === "resultado").slice(0, 3),
  };
}

const ENTRIES_AUDIT_FILE = join(
  process.cwd(),
  "server",
  "cache",
  "entries-ai-audit.json"
);

type EntryAuditItem = {
  id: string;
  fixtureId?: string;
  home: string;
  away: string;
  league: string;
  market: string;
  confidence: number;
  risk: string;
  status: "pending" | "green" | "red";
  resultLabel: string;
  score?: string;
  createdAt: string;
  checkedAt?: string;
};

function readEntriesAudit(): EntryAuditItem[] {
  try {
    if (!existsSync(ENTRIES_AUDIT_FILE)) return [];
    const parsed = JSON.parse(readFileSync(ENTRIES_AUDIT_FILE, "utf8"));
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function writeEntriesAudit(items: EntryAuditItem[]) {
  try {
    mkdirSync(join(process.cwd(), "server", "cache"), { recursive: true });
    writeFileSync(
      ENTRIES_AUDIT_FILE,
      JSON.stringify(
        { updatedAt: new Date().toISOString(), items: items.slice(0, 500) },
        null,
        2
      )
    );
  } catch {
    // Cache em disco é opcional no Railway; se falhar, a rota continua respondendo.
  }
}

function normalizeTeamKey(name: string) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function extractScoreFromFixture(match: any) {
  const homeScore =
    match?.homeScore ??
    match?.homeGoals ??
    match?.scoreHome ??
    match?.score?.home ??
    match?.home?.score;
  const awayScore =
    match?.awayScore ??
    match?.awayGoals ??
    match?.scoreAway ??
    match?.score?.away ??
    match?.away?.score;
  const h = Number(homeScore);
  const a = Number(awayScore);
  if (!Number.isFinite(h) || !Number.isFinite(a)) return null;
  return { home: h, away: a };
}

function isFinishedFixture(match: any) {
  const status = String(
    match?.status || match?.statusLabel || match?.state || ""
  ).toLowerCase();
  return (
    status.includes("final") ||
    status.includes("finished") ||
    status.includes("encerr") ||
    status.includes("ft")
  );
}

function marketWon(market: string, score: { home: number; away: number }) {
  const total = score.home + score.away;
  if (market.includes("Over 0.5")) return total >= 1;
  if (market.includes("Over 1.5")) return total >= 2;
  if (market.includes("Over 2.5")) return total >= 3;
  if (market.includes("Over 3.5")) return total >= 4;
  if (market.includes("Under 3.5")) return total <= 3;
  if (market.includes("Ambas marcam - Sim") || market === "Ambas Marcam")
    return score.home > 0 && score.away > 0;
  if (market.includes("Ambas marcam - Não"))
    return !(score.home > 0 && score.away > 0);
  if (
    market === "Favorito" ||
    market === "Dupla chance" ||
    market === "Empate anula"
  )
    return score.home !== score.away;
  // Escanteios/cartões só são auditados quando houver placar estatístico específico; sem stats finais, fica pendente.
  return null;
}

function collectFinishedFixturesForAudit(master: any) {
  const lists = [
    ...(Array.isArray(master?.calendar?.events) ? master.calendar.events : []),
    ...(Array.isArray(master?.upcoming?.games) ? master.upcoming.games : []),
    ...(Array.isArray(master?.worldCup?.matches)
      ? master.worldCup.matches
      : []),
    ...(Array.isArray(master?.brasileiraoTable?.nextRound)
      ? master.brasileiraoTable.nextRound
      : []),
    ...(Array.isArray(master?.brasileiraoBTable?.nextRound)
      ? master.brasileiraoBTable.nextRound
      : []),
    ...(Array.isArray(master?.games) ? master.games : []),
  ];
  return lists.filter(
    match => isFinishedFixture(match) && extractScoreFromFixture(match)
  );
}

function auditEntries(entries: any[], master: any) {
  const previous = readEntriesAudit();
  const byId = new Map(previous.map(item => [item.id, item]));
  const finished = collectFinishedFixturesForAudit(master);

  for (const entry of entries) {
    const id = String(entry.id);
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, {
        id,
        fixtureId: entry.fixtureId || "",
        home: entry.home,
        away: entry.away,
        league: entry.league,
        market: entry.market,
        confidence: entry.confidence,
        risk: entry.risk,
        status: "pending",
        resultLabel: "Aguardando jogo finalizar",
        createdAt: new Date().toISOString(),
      });
    }
  }

  for (const item of byId.values()) {
    if (item.status !== "pending") continue;
    const match = finished.find(m => {
      const mh = normalizeTeamKey(
        m?.home || m?.homeTeam || m?.mandante || m?.teamA || ""
      );
      const ma = normalizeTeamKey(
        m?.away || m?.awayTeam || m?.visitante || m?.teamB || ""
      );
      return (
        mh === normalizeTeamKey(item.home) && ma === normalizeTeamKey(item.away)
      );
    });
    if (!match) continue;
    const score = extractScoreFromFixture(match);
    if (!score) continue;
    const won = marketWon(item.market, score);
    if (won === null) {
      item.resultLabel = "Finalizado, aguardando estatísticas do mercado";
      item.score = `${score.home}x${score.away}`;
      continue;
    }
    item.status = won ? "green" : "red";
    item.score = `${score.home}x${score.away}`;
    item.checkedAt = new Date().toISOString();
    item.resultLabel = won
      ? "Green confirmado pelo robô"
      : "Red confirmado pelo robô";
  }

  const next = Array.from(byId.values())
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 500);
  writeEntriesAudit(next);
  return next;
}

function buildEntriesStats(items: EntryAuditItem[]) {
  const groups = new Map<string, EntryAuditItem[]>();
  for (const item of items) {
    const key = `${item.createdAt.slice(0, 10)}-${item.home}-${item.away}-${item.league}`.toLowerCase();
    const list = groups.get(key) || [];
    list.push(item);
    groups.set(key, list);
  }

  let green = 0;
  let red = 0;
  let pending = 0;

  for (const list of groups.values()) {
    const top3 = list.slice(0, 3);
    if (top3.some(item => item.status === "red")) {
      red += 1;
    } else if (top3.length >= 3 && top3.every(item => item.status === "green")) {
      green += 1;
    } else {
      pending += 1;
    }
  }

  const decided = green + red;
  const accuracy = decided ? Number(((green / decided) * 100).toFixed(1)) : 0;
  const byMarket = Array.from(
    items
      .reduce((map, item) => {
        const current = map.get(item.market) || {
          market: item.market,
          green: 0,
          red: 0,
          pending: 0,
          accuracy: 0,
        };
        if (item.status === "green") current.green += 1;
        else if (item.status === "red") current.red += 1;
        else current.pending += 1;
        const total = current.green + current.red;
        current.accuracy = total
          ? Number(((current.green / total) * 100).toFixed(1))
          : 0;
        map.set(item.market, current);
        return map;
      }, new Map<string, any>())
      .values()
  ).sort((a, b) => b.red - a.red || b.accuracy - a.accuracy);

  return { green, red, pending, decided, accuracy, byMarket };
}

const ENTRIES_MASTER_LOGS: any[] = [];
let entriesMasterLastRunAt = "";
let entriesMasterTotalItems = 0;
let entriesMasterLastMessage = "Aguardando primeira execução.";
let entriesMasterLastError = "";
let entriesMasterLastStats = { green: 0, red: 0, pending: 0, decided: 0, accuracy: 0 };

function logEntriesMaster(
  message: string,
  level: "info" | "success" | "error" = "info",
  meta: any = {}
) {
  const item = {
    id: `entries-${Date.now()}-${ENTRIES_MASTER_LOGS.length}`,
    robot: "Robô Entradas IA",
    level,
    message,
    meta,
    createdAt: new Date().toISOString(),
  };
  ENTRIES_MASTER_LOGS.unshift(item);
  if (ENTRIES_MASTER_LOGS.length > 80) ENTRIES_MASTER_LOGS.length = 80;
  entriesMasterLastMessage = message;
  entriesMasterLastError = level === "error" ? message : "";
  return item;
}

function getEntriesMasterRobotStatus() {
  return {
    id: "entries-master",
    name: "Robô Entradas IA",
    title: "Robô Entradas IA",
    status: entriesMasterLastError
      ? "error"
      : entriesMasterLastRunAt
        ? "online"
        : "planejado",
    lastRunAt: entriesMasterLastRunAt,
    totalItems: entriesMasterTotalItems,
    interval: "Sob demanda + janela móvel 48h",
    description:
      "Gera partida única com até 3 melhores mercados por jogo, somente jogos das próximas 48h, e audita green/red após finalização.",
    source: "Master Search + Série A + Série B + Copa + Ao Vivo",
    message: entriesMasterLastMessage,
    green: entriesMasterLastStats.green,
    red: entriesMasterLastStats.red,
    pending: entriesMasterLastStats.pending,
    accuracy: entriesMasterLastStats.accuracy,
  };
}

function getEntriesMasterLogs() {
  return ENTRIES_MASTER_LOGS;
}

function registerEntriesMasterRun(
  entries: any[],
  audit: EntryAuditItem[],
  source = "manual"
) {
  entriesMasterLastRunAt = new Date().toISOString();
  entriesMasterTotalItems = entries.length;
  const games = new Set(entries.map(entry => `${entry.home} x ${entry.away}`))
    .size;
  const stats = buildEntriesStats(audit);
  entriesMasterLastStats = stats;
  logEntriesMaster(
    `Scanner executado: ${games} jogo(s), ${entries.length} mercado(s), ${stats.green} green(s), ${stats.red} red(s), ${stats.pending} pendente(s).`,
    "success",
    { source, games, entries: entries.length, stats }
  );
}

function registerEntriesMasterError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Erro no Robô Entradas IA.";
  logEntriesMaster(message, "error");
}

function plannedRobots() {
  return [
    getNewsRobotStatus(),
    getGameRobotStatus(),
    getCalendarRobotStatus(),
    getUpcomingRobotStatus(),
    getWorldCupRobotStatus(),
    getStatisticalRobotStatus(),
    getCornerRobotStatus(),
    getCardRobotStatus(),
    getGoalRobotStatus(),
    getLiveRobotStatus(),
    getInstagramRobotStatus(),
    getBrasileiraoTableRobotStatus(),
    getBrasileiraoLogoRobotStatus(),
    getRankingRobotStatus(),
    getMasterSearchRobotStatus(),
    getEntriesMasterRobotStatus(),
  ];
}

export function registerAdminRobotRoutes(app: Express) {
  startGameRobot();
  startCalendarRobot();
  startUpcomingRobot();
  startInstagramRobot();
  startWorldCupRobot();
  startStatisticalRobot();
  startCornerRobot();
  startCardRobot();
  startGoalRobot();
  startLiveRobot();
  startBrasileiraoTableRobot();
  startBrasileiraoBTableRobot();
  startBrasileiraoLogoRobot();
  startRankingRobot();
  startMasterSearchRobot();

  app.post("/api/admin/robots/master-search/run", async (req, res) => {
    if (!requireAdmin(req, res)) return;

    try {
      const data = await updateMasterSearchRobot(true);
      res.json({
        success: true,
        message: "Robô Master Global executado agora.",
        robot: getMasterSearchRobotStatus(),
        data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao executar Robô Master Global.",
      });
    }
  });

  app.post("/api/admin/robots/entries-master/run", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const master = await updateMasterSearchRobot(true);
      const brasileiraoTable = await updateBrasileiraoTableRobot(true).catch(
        () => getCachedBrasileiraoTable()
      );
      const brasileiraoBTable = await updateBrasileiraoBTableRobot(true).catch(
        () => getCachedBrasileiraoBTable()
      );
      const entriesMaster = { ...master, brasileiraoTable, brasileiraoBTable };
      const entries = buildMasterEntries(entriesMaster, 3);
      const audit = auditEntries(entries, entriesMaster);
      registerEntriesMasterRun(entries, audit, "admin-panel");
      res.json({
        success: true,
        message: "Robô Entradas IA executado pelo painel Admin.",
        robot: getEntriesMasterRobotStatus(),
        entries: entries.slice(0, 20),
        stats: buildEntriesStats(audit),
        logs: getEntriesMasterLogs().slice(0, 20),
      });
    } catch (error) {
      registerEntriesMasterError(error);
      res
        .status(500)
        .json({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Erro ao executar Entradas IA no painel Admin.",
        });
    }
  });

  app.get("/api/admin/robots/entries-master/logs", (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json({
      success: true,
      robot: getEntriesMasterRobotStatus(),
      logs: getEntriesMasterLogs(),
    });
  });

  app.get("/api/admin/robots/master-search/cache", (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json({
      success: true,
      data: getCachedMasterSearchRobot(),
      robot: getMasterSearchRobotStatus(),
      logs: collectMasterSearchLogs(),
    });
  });

  app.get("/api/master-search/status", (_req, res) => {
    res.json({ success: true, robot: getMasterSearchRobotStatus() });
  });

  app.get("/api/master-search/data", async (req, res) => {
    const data = await updateMasterSearchRobot(false);
    res.json({ success: true, data, robot: getMasterSearchRobotStatus() });
  });

  app.get("/api/admin/robots/architecture", (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json({
      success: true,
      architecture: getCompetitionAreaRobotArchitecture(),
    });
  });

  app.post("/api/admin/robots/championship/:groupId/run", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const data = await runChampionshipRobotGroup(
        String(req.params.groupId || ""),
        true
      );
      res.json({
        success: true,
        message: `${data.group.title} executado pela arquitetura V42.`,
        data,
      });
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Erro ao executar grupo por campeonato.",
        });
    }
  });

  app.post("/api/admin/robots/analysis-area/:groupId/run", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const data = await runAnalysisAreaRobotGroup(
        String(req.params.groupId || ""),
        true
      );
      res.json({
        success: true,
        message: `${data.group.title} executado pela arquitetura V42.`,
        data,
      });
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Erro ao executar grupo por área de análise.",
        });
    }
  });
  app.get("/api/entries-master/opportunities", async (req, res) => {
    try {
      const limit = Math.max(
        3,
        Math.min(3, Number(req.query.limit || 3) || 3)
      );
      const master = await updateMasterSearchRobot(false);
      const brasileiraoTable = await updateBrasileiraoTableRobot(false).catch(
        () => getCachedBrasileiraoTable()
      );
      const brasileiraoBTable = await updateBrasileiraoBTableRobot(false).catch(
        () => getCachedBrasileiraoBTable()
      );
      const entriesMaster = { ...master, brasileiraoTable, brasileiraoBTable };
      const entries = buildMasterEntries(entriesMaster, limit);
      const audit = auditEntries(entries, entriesMaster);
      const auditStats = buildEntriesStats(audit);
      registerEntriesMasterRun(entries, audit, "opportunities");
      const grouped = buildEntriesGroups(entries);
      res.json({
        success: true,
        updatedAt: entriesMasterLastRunAt || master.updatedAt,
        source: "entries-master-v48-3-multiplas-dia",
        entries,
        grouped,
        audit: audit.slice(0, 80),
        auditStats,
        robot: getEntriesMasterRobotStatus(),
        logs: getEntriesMasterLogs().slice(0, 20),
      });
    } catch (error) {
      registerEntriesMasterError(error);
      res
        .status(500)
        .json({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Erro no Robô Entradas Master.",
        });
    }
  });

  app.get("/api/entries-master/audit", async (_req, res) => {
    try {
      const master = await updateMasterSearchRobot(false);
      const brasileiraoTable = await updateBrasileiraoTableRobot(false).catch(
        () => getCachedBrasileiraoTable()
      );
      const brasileiraoBTable = await updateBrasileiraoBTableRobot(false).catch(
        () => getCachedBrasileiraoBTable()
      );
      const entriesMaster = { ...master, brasileiraoTable, brasileiraoBTable };
      const entries = buildMasterEntries(entriesMaster, 3);
      const audit = auditEntries(entries, entriesMaster);
      res.json({
        success: true,
        updatedAt: new Date().toISOString(),
        audit,
        stats: buildEntriesStats(audit),
      });
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Erro no robô de auditoria das Entradas IA.",
        });
    }
  });

  app.post("/api/entries-master/run", async (_req, res) => {
    try {
      const master = await updateMasterSearchRobot(true);
      const brasileiraoTable = await updateBrasileiraoTableRobot(true).catch(
        () => getCachedBrasileiraoTable()
      );
      const brasileiraoBTable = await updateBrasileiraoBTableRobot(true).catch(
        () => getCachedBrasileiraoBTable()
      );
      const entriesMaster = { ...master, brasileiraoTable, brasileiraoBTable };
      const entries = buildMasterEntries(entriesMaster, 3);
      const audit = auditEntries(entries, entriesMaster);
      registerEntriesMasterRun(entries, audit, "force-run");
      res.json({
        success: true,
        message: "Robô Entradas IA executado agora.",
        updatedAt: entriesMasterLastRunAt,
        totalEntries: entries.length,
        stats: buildEntriesStats(audit),
        entries,
        grouped: buildEntriesGroups(entries),
        audit: audit.slice(0, 80),
        robot: getEntriesMasterRobotStatus(),
        logs: getEntriesMasterLogs().slice(0, 20),
      });
    } catch (error) {
      registerEntriesMasterError(error);
      res
        .status(500)
        .json({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Erro ao executar Robô Entradas IA.",
        });
    }
  });

  app.post("/api/entries-master/calculate", async (req, res) => {
    try {
      const odd = Number(req.body?.odd);
      const stakeValue = Number(req.body?.stakeValue || 0);
      const bankroll = Number(req.body?.bankroll || 0);
      const confidence = clampPercent(Number(req.body?.confidence || 0), 1, 99);
      const market = String(req.body?.market || "Mercado");
      const fair = marketOddFromConfidence(confidence);
      const implied = impliedProbabilityFromOdd(odd);
      const edge = Number((confidence - implied).toFixed(2));
      const ev = Number((((confidence / 100) * odd - 1) * 100).toFixed(2));
      const risk = riskFromConfidence(confidence);
      const status = valueStatus(confidence, odd);
      const stakePercent =
        status === "Valor positivo"
          ? confidence >= 84
            ? 3
            : confidence >= 74
              ? 2
              : 1
          : 0;
      const suggestedStake =
        bankroll > 0 ? Number(((bankroll * stakePercent) / 100).toFixed(2)) : 0;
      const possibleReturn =
        stakeValue > 0 && odd > 1 ? Number((stakeValue * odd).toFixed(2)) : 0;
      res.json({
        success: true,
        result: {
          market,
          confidence,
          odd,
          fairOdd: fair,
          impliedProbability: Number(implied.toFixed(2)),
          edge,
          ev,
          risk,
          status,
          stakePercent,
          suggestedStake,
          possibleReturn,
        },
      });
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Erro ao calcular entrada.",
        });
    }
  });
  app.post("/api/master-search/compare", async (req, res) => {
    try {
      const teamA = String(req.body?.teamA || "");
      const teamB = String(req.body?.teamB || "");
      if (!teamA || !teamB || teamA === teamB) {
        res
          .status(400)
          .json({ success: false, error: "Selecione dois times diferentes." });
        return;
      }
      const data = await getMasterCompare(teamA, teamB);
      res.json(data);
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Erro no comparador Master.",
        });
    }
  });

  app.get("/api/admin/robots", (req, res) => {
    if (!requireAdmin(req, res)) return;

    res.json({
      success: true,
      robots: plannedRobots(),
      logs: [
        ...getNewsRobotLogs(),
        ...getGameRobotLogs(),
        ...getCalendarRobotLogs(),
        ...getWorldCupRobotLogs(),
        ...getStatisticalRobotLogs(),
        ...getCornerRobotLogs(),
        ...getCardRobotLogs(),
        ...getGoalRobotLogs(),
        ...getLiveRobotLogs(),
        ...getUpcomingRobotLogs(),
        ...getInstagramRobotLogs(),
        ...getBrasileiraoTableRobotLogs(),
        ...getBrasileiraoLogoRobotLogs(),
        ...getMasterSearchRobotLogs(),
        ...getEntriesMasterLogs(),
      ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
      phases: [
        {
          title: "Fase 1",
          status: "ativo",
          items: [
            "Robô Notícias",
            "Painel Admin dos Robôs",
            "Logs",
            "Atualização automática",
          ],
        },
        {
          title: "Fase 2",
          status: "ativo",
          items: ["Robô Jogos", "Últimos jogos", "Tabelas", "Estatísticas"],
        },

        {
          title: "Fase 2.1",
          status: "ativo",
          items: [
            "Robô Calendário Master",
            "Datas reais",
            "Timezone Brasil",
            "Carrega site todo",
            "Atualização 5 minutos",
          ],
        },
        {
          title: "Fase 3",
          status: "ativo",
          items: ["Robô Copa", "48 seleções", "Grupos", "Calendário"],
        },
        {
          title: "Fase 3.3",
          status: "ativo",
          items: ["Robô Estatístico", "Over", "BTTS", "Escanteios", "Cartões"],
        },
        {
          title: "Fase 3.4",
          status: "ativo",
          items: [
            "Robô Escanteios",
            "Over 7.5",
            "Over 8.5",
            "Over 9.5",
            "Over 10.5",
            "Over 11.5",
          ],
        },
        {
          title: "Fase 3.5",
          status: "ativo",
          items: [
            "Robô Cartões",
            "Over 2.5",
            "Over 3.5",
            "Over 4.5",
            "Over 5.5",
          ],
        },
        {
          title: "Fase 3.6",
          status: "ativo",
          items: [
            "Robô Gols",
            "Over 0.5 HT",
            "Over 1.5",
            "Over 2.5",
            "Over 3.5",
            "BTTS",
            "Próximo Gol",
          ],
        },
        {
          title: "Fase 3.7",
          status: "ativo",
          items: [
            "Robô Ao Vivo",
            "10 principais partidas",
            "Pressão",
            "Alertas IA",
            "Atualização 1 minuto",
          ],
        },
        {
          title: "Fase 3.8",
          status: "ativo",
          items: [
            "Robô Próximos Jogos",
            "Top 10 partidas",
            "Sem calendário fake",
            "Atualização 1 minuto",
          ],
        },
        {
          title: "Fase 3.9",
          status: "ativo",
          items: [
            "Robô Classificação Brasileirão",
            "Fonte pública alternativa",
            "Cache no servidor",
            "Atualização 5 minutos",
          ],
        },
        {
          title: "Fase 3.10",
          status: "ativo",
          items: [
            "Robô Escudos Brasileirão",
            "Busca pública",
            "Cache local",
            "Atualização diária",
            "Fallback sem quebrar layout",
          ],
        },
        {
          title: "Fase 3.11",
          status: "ativo",
          items: [
            "Robô Entradas IA",
            "Partida única",
            "Top 3 mercados por jogo",
            "Green/Red automático",
            "Logs no Admin",
          ],
        },
      ],
    });
  });

  app.get("/api/calendar-master/events", async (req, res) => {
    const master = await updateMasterSearchRobot(false);
    const data = master.calendar;
    const limit = Math.max(
      1,
      Math.min(300, Number(req.query.limit || 100) || 100)
    );
    const date = String(req.query.date || "");
    const statusFilter = String(req.query.status || "");
    let events = data.events;
    if (date) events = events.filter(event => event.date === date);
    if (["scheduled", "live", "finished"].includes(statusFilter))
      events = events.filter(event => event.status === statusFilter);
    res.json({
      success: true,
      updatedAt: data.updatedAt,
      source: "master-search-v26-global",
      robot: getCalendarRobotStatus(),
      events: events.slice(0, limit),
    });
  });

  app.get("/api/calendar-master/today", async (_req, res) => {
    const master = await updateMasterSearchRobot(false);
    const data = master.calendar;
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    res.json({
      success: true,
      date: today,
      updatedAt: data.updatedAt,
      source: "master-search-v26-global",
      events: data.events.filter(event => event.date === today),
    });
  });

  app.post("/api/admin/robots/calendar-master/run", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const data = await updateCalendarRobot(true);
      res.json({
        success: true,
        message: "Robô Calendário Master executado agora.",
        robot: getCalendarRobotStatus(),
        totalItems: data.events.length,
        updatedAt: data.updatedAt,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao executar Calendário Master.",
      });
    }
  });

  app.get("/api/admin/robots/calendar-master/cache", (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json({
      success: true,
      data: getCachedCalendarRobot(),
      robot: getCalendarRobotStatus(),
      logs: getCalendarRobotLogs(),
    });
  });

  app.get("/api/brasileirao/logo/:team", async (req, res) => {
    const image = await getBrasileiraoLogoImage(req.params.team || "");
    res.setHeader("Content-Type", image.contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(image.body);
  });

  app.get("/api/brasileirao/logos/status", (_req, res) => {
    res.json({
      success: true,
      robot: getBrasileiraoLogoRobotStatus(),
      logos: getCachedBrasileiraoLogos(),
    });
  });

  app.post("/api/admin/robots/brasileirao-logos/run", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    await updateBrasileiraoLogoRobot(true);
    res.json({
      success: true,
      message: "Robô de escudos executado agora.",
      robot: getBrasileiraoLogoRobotStatus(),
      logs: getBrasileiraoLogoRobotLogs(),
      logos: getCachedBrasileiraoLogos(),
    });
  });

  app.get("/api/brasileirao-b/table", async (_req, res) => {
    const data = await updateBrasileiraoBTableRobot(false);
    res.json({
      success: true,
      updatedAt: data.updatedAt,
      fixturesUpdatedAt: data.fixturesUpdatedAt,
      source: data.source || "robo-brasileirao-serie-b",
      season: data.season,
      standings: data.standings,
      topScorers: data.topScorers,
      nextRound: data.nextRound,
      robot: getBrasileiraoBTableRobotStatus(),
    });
  });

  app.post("/api/admin/robots/brasileirao-b-table/run", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const data = await updateBrasileiraoBTableRobot(true);
      res.json({
        success: true,
        message: "Robô Brasileirão Série B executado agora.",
        robot: getBrasileiraoBTableRobotStatus(),
        totalItems: data.standings.length,
        updatedAt: data.updatedAt,
        fixturesUpdatedAt: data.fixturesUpdatedAt,
        source: data.source,
        topScorers: data.topScorers,
        nextRound: data.nextRound,
      });
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Erro ao executar Robô Brasileirão Série B.",
        });
    }
  });
  app.get("/api/brasileirao/table", async (_req, res) => {
    const master = await updateMasterSearchRobot(false);
    const data = master.brasileiraoTable;
    res.json({
      success: true,
      updatedAt: data.updatedAt,
      fixturesUpdatedAt: data.fixturesUpdatedAt,
      source: "master-search-v26-brasileirao-table",
      season: data.season,
      standings: data.standings,
      topScorers: data.topScorers,
      nextRound: data.nextRound,
      robot: getMasterSearchRobotStatus(),
    });
  });

  app.post("/api/admin/robots/brasileirao-table/run", async (req, res) => {
    if (!requireAdmin(req, res)) return;

    try {
      const data = await updateBrasileiraoTableRobot(true);
      res.json({
        success: true,
        message: "Robô Classificação Brasileirão executado agora.",
        robot: getBrasileiraoTableRobotStatus(),
        totalItems: data.standings.length,
        updatedAt: data.updatedAt,
        fixturesUpdatedAt: data.fixturesUpdatedAt,
        source: data.source,
        topScorers: data.topScorers,
        nextRound: data.nextRound,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao executar Robô Classificação Brasileirão.",
      });
    }
  });

  app.get("/api/admin/robots/brasileirao-table/cache", (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json({ success: true, data: getCachedBrasileiraoTable() });
  });

  app.post("/api/admin/robots/news/run", async (req, res) => {
    if (!requireAdmin(req, res)) return;

    try {
      const data = await updatePublicNews(true);
      res.json({
        success: true,
        message: "Robô Notícias executado agora.",
        robot: getNewsRobotStatus(),
        totalItems: data.items.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Erro ao executar robô.",
      });
    }
  });

  app.post("/api/admin/robots/games/run", async (req, res) => {
    if (!requireAdmin(req, res)) return;

    try {
      const data = await updateGameRobot(true);
      res.json({
        success: true,
        message: "Robô Jogos executado agora.",
        robot: getGameRobotStatus(),
        totalItems: data.games.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao executar Robô Jogos.",
      });
    }
  });

  app.get("/api/admin/robots/games/cache", (req, res) => {
    if (!requireAdmin(req, res)) return;

    res.json({
      success: true,
      data: getCachedGames(),
    });
  });

  app.get("/api/robot-games", async (req, res) => {
    const master = await updateMasterSearchRobot(false);
    const data = master.calendar;
    const limit = Number(req.query.limit || 30);
    const games = data.events
      .filter(event => event.status !== "finished")
      .slice(0, Number.isFinite(limit) ? limit : 30);

    res.json({
      success: true,
      updatedAt: data.updatedAt,
      source: "master-search-v26-global",
      games: games.map(game => ({
        id: game.id,
        fixtureId: game.fixtureId,
        date: game.date,
        time: game.time,
        league: game.competition,
        competition: game.competition,
        group: game.country,
        home: game.home,
        away: game.away,
        status: game.status,
        market: "Análise disponível",
        confidence: game.priority,
        odd: "-",
        source: game.source,
        homeLogo: game.homeLogo,
        awayLogo: game.awayLogo,
        venue: game.venue,
      })),
    });
  });

  app.get("/api/robot-games/today", async (req, res) => {
    const master = await updateMasterSearchRobot(false);
    const data = master.calendar;
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const games = data.events.filter(game => game.date === today);

    res.json({
      success: true,
      date: today,
      updatedAt: data.updatedAt,
      source: "master-search-v26-global",
      games: games.map(game => ({
        id: game.id,
        fixtureId: game.fixtureId || game.id,
        date: game.date,
        time: game.time,
        league: game.competition,
        competition: game.competition,
        group: (game as any).group || game.country,
        home: game.home,
        away: game.away,
        status: game.status,
        market: "Análise disponível",
        confidence: game.priority || 72,
        odd: "-",
        source: game.source,
      })),
    });
  });

  app.get("/api/robot-games/teams", async (_req, res) => {
    const master = await updateMasterSearchRobot(false);
    const data = master.calendar;
    const teams = Array.from(
      new Set(data.events.flatMap((game: any) => [game.home, game.away]))
    ).sort();

    res.json({
      success: true,
      updatedAt: data.updatedAt,
      source: "master-search-v26-global",
      teams,
    });
  });

  app.post("/api/admin/robots/world-cup/run", async (req, res) => {
    if (!requireAdmin(req, res)) return;

    try {
      const data = await updateWorldCupRobot(true);
      res.json({
        success: true,
        message: "Robô Copa executado agora.",
        robot: getWorldCupRobotStatus(),
        teamsCount: data.teams.length,
        groupsCount: data.groups.length,
        matchesCount: data.matches.length,
        groupMatchesCount: data.groupMatches.length,
        knockoutMatchesCount: data.knockoutMatches.length,
        standingsCount: data.standings.length,
        analysisCount: data.analyses.length,
        finishedMatchesCount: data.matches.filter(
          (match: any) => match.status === "finished"
        ).length,
        liveMatchesCount: data.matches.filter(
          (match: any) => match.status === "live"
        ).length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao executar Robô Copa.",
      });
    }
  });

  app.get("/api/admin/robots/world-cup/cache", (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json({ success: true, data: getCachedWorldCup() });
  });

  app.post("/api/admin/robots/world-cup/result", async (req, res) => {
    if (!requireAdmin(req, res)) return;

    try {
      const matchId = String(req.body?.matchId || "");
      const homeGoals = Number(req.body?.homeGoals);
      const awayGoals = Number(req.body?.awayGoals);
      const status = String(req.body?.status || "finished") as
        | "finished"
        | "live"
        | "scheduled";

      if (
        !matchId ||
        !Number.isFinite(homeGoals) ||
        !Number.isFinite(awayGoals)
      ) {
        res
          .status(400)
          .json({
            success: false,
            error: "Informe matchId, homeGoals e awayGoals.",
          });
        return;
      }

      const result = setWorldCupManualResult(
        matchId,
        homeGoals,
        awayGoals,
        status
      );
      const data = await updateWorldCupRobot(true);
      res.json({
        success: true,
        message: "Resultado salvo e classificação recalculada.",
        result,
        data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Erro ao salvar resultado.",
      });
    }
  });

  app.get("/api/world-cup/robot", async (_req, res) => {
    const data = await updateWorldCupRobot(false);
    res.json({
      success: true,
      updatedAt: data.updatedAt,
      groups: data.groups,
      teams: data.teams,
      matches: data.matches,
      groupMatches: data.groupMatches,
      knockoutMatches: data.knockoutMatches,
      standings: data.standings,
      analyses: data.analyses,
      master: data.master,
      robot: getWorldCupRobotStatus(),
      source: "world-cup-robot-live-cache-auto",
    });
  });

  app.get("/api/world-cup/compare", async (req, res) => {
    await updateMasterSearchRobot(false);
    const home = String(req.query.home || "");
    const away = String(req.query.away || "");
    const found = findWorldCupAnalysis(home, away);

    res.json({
      success: true,
      home,
      away,
      found,
      teams: getWorldCupTeamsForCompare(),
      source: "master-search-v31-world-cup-global",
    });
  });
  app.post("/api/admin/robots/statistics/run", async (req, res) => {
    if (!requireAdmin(req, res)) return;

    try {
      const data = await updateStatisticalRobot(true);
      res.json({
        success: true,
        message: "Robô Estatístico executado agora.",
        robot: getStatisticalRobotStatus(),
        totalItems: data.opportunities.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao executar Robô Estatístico.",
      });
    }
  });

  app.get("/api/admin/robots/statistics/cache", (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json({ success: true, data: getCachedStatistics() });
  });

  app.get("/api/statistics/robot", async (req, res) => {
    const master = await updateMasterSearchRobot(false);
    const data = master.statistics;
    const market = String(req.query.market || "all");
    let opportunities = data.opportunities;

    if (market === "corners")
      opportunities = opportunities.filter(
        item => item.corners.over85.probability >= 60
      );
    if (market === "cards")
      opportunities = opportunities.filter(
        item => item.cards.over35.probability >= 60
      );
    if (market === "goals")
      opportunities = opportunities.filter(
        item => item.goals.over15.probability >= 60
      );
    if (market === "best")
      opportunities = opportunities.filter(
        item => item.confidence >= 75 || item.risk === "Baixo"
      );

    res.json({
      success: true,
      updatedAt: data.updatedAt,
      source: "master-search-v26-statistics",
      opportunities,
    });
  });

  app.get("/api/statistics/compare", async (req, res) => {
    await updateMasterSearchRobot(false);
    const home = String(req.query.home || "");
    const away = String(req.query.away || "");
    res.json({
      success: true,
      home,
      away,
      opportunity: getStatisticalOpportunity(home, away),
      source: "master-search-v26-statistics",
    });
  });

  app.post("/api/admin/robots/corners/run", async (req, res) => {
    if (!requireAdmin(req, res)) return;

    try {
      const data = await updateCornerRobot(true);
      res.json({
        success: true,
        message: "Robô Escanteios executado agora.",
        robot: getCornerRobotStatus(),
        totalItems: data.opportunities.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao executar Robô Escanteios.",
      });
    }
  });

  app.get("/api/admin/robots/corners/cache", (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json({ success: true, data: getCachedCorners() });
  });

  app.get("/api/corners/robot", async (req, res) => {
    const master = await updateMasterSearchRobot(false);
    const data = master.corners;
    const market = String(req.query.market || "all");
    let opportunities = data.opportunities;

    if (market === "today") {
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      opportunities = opportunities.filter(item => item.date === today);
    }

    if (market === "best")
      opportunities = opportunities.filter(
        item => item.confidence >= 76 || item.risk === "Baixo"
      );
    if (market === "over75")
      opportunities = opportunities.filter(
        item => item.lines.over75.probability >= 60
      );
    if (market === "over85")
      opportunities = opportunities.filter(
        item => item.lines.over85.probability >= 60
      );
    if (market === "over95")
      opportunities = opportunities.filter(
        item => item.lines.over95.probability >= 60
      );
    if (market === "live")
      opportunities = opportunities.filter(item => item.liveAlert?.active);

    res.json({
      success: true,
      updatedAt: data.updatedAt,
      source: "master-search-v26-corners",
      opportunities,
    });
  });

  app.get("/api/corners/compare", async (req, res) => {
    await updateMasterSearchRobot(false);
    const home = String(req.query.home || "");
    const away = String(req.query.away || "");
    res.json({
      success: true,
      home,
      away,
      opportunity: getCornerOpportunity(home, away),
      source: "master-search-v26-corners",
    });
  });

  app.post("/api/admin/robots/cards/run", async (req, res) => {
    if (!requireAdmin(req, res)) return;

    try {
      const data = await updateCardRobot(true);
      res.json({
        success: true,
        message: "Robô Cartões executado agora.",
        robot: getCardRobotStatus(),
        totalItems: data.opportunities.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao executar Robô Cartões.",
      });
    }
  });

  app.get("/api/admin/robots/cards/cache", (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json({ success: true, data: getCachedCards() });
  });

  app.get("/api/cards/robot", async (req, res) => {
    const master = await updateMasterSearchRobot(false);
    const data = master.cards;
    const market = String(req.query.market || "all");
    let opportunities = data.opportunities;

    if (market === "today") {
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      opportunities = opportunities.filter(item => item.date === today);
    }

    if (market === "best")
      opportunities = opportunities.filter(
        item => item.confidence >= 76 || item.risk === "Baixo"
      );
    if (market === "over25")
      opportunities = opportunities.filter(
        item => item.lines.over25.probability >= 60
      );
    if (market === "over35")
      opportunities = opportunities.filter(
        item => item.lines.over35.probability >= 60
      );
    if (market === "over45")
      opportunities = opportunities.filter(
        item => item.lines.over45.probability >= 60
      );
    if (market === "live")
      opportunities = opportunities.filter(item => item.liveAlert?.active);

    res.json({
      success: true,
      updatedAt: data.updatedAt,
      source: "master-search-v26-cards",
      opportunities,
    });
  });

  app.get("/api/cards/compare", async (req, res) => {
    await updateMasterSearchRobot(false);
    const home = String(req.query.home || "");
    const away = String(req.query.away || "");
    res.json({
      success: true,
      home,
      away,
      opportunity: getCardOpportunity(home, away),
      source: "master-search-v26-cards",
    });
  });

  app.post("/api/admin/robots/goals/run", async (req, res) => {
    if (!requireAdmin(req, res)) return;

    try {
      const data = await updateGoalRobot(true);
      res.json({
        success: true,
        message: "Robô Gols executado agora.",
        robot: getGoalRobotStatus(),
        totalItems: data.opportunities.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao executar Robô Gols.",
      });
    }
  });

  app.get("/api/admin/robots/goals/cache", (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json({ success: true, data: getCachedGoals() });
  });

  app.get("/api/goals/robot", async (req, res) => {
    const master = await updateMasterSearchRobot(false);
    const data = master.goals;
    const market = String(req.query.market || "all");
    let opportunities = data.opportunities;

    if (market === "today") {
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      opportunities = opportunities.filter(item => item.date === today);
    }

    if (market === "best")
      opportunities = opportunities.filter(
        item => item.confidence >= 76 || item.risk === "Baixo"
      );
    if (market === "over15")
      opportunities = opportunities.filter(
        item => item.lines.over15.probability >= 60
      );
    if (market === "over25")
      opportunities = opportunities.filter(
        item => item.lines.over25.probability >= 60
      );
    if (market === "btts")
      opportunities = opportunities.filter(
        item => item.lines.btts.probability >= 60
      );
    if (market === "live")
      opportunities = opportunities.filter(item => item.liveAlert?.active);

    res.json({
      success: true,
      updatedAt: data.updatedAt,
      source: "master-search-v26-goals",
      opportunities,
    });
  });

  app.get("/api/goals/compare", async (req, res) => {
    await updateMasterSearchRobot(false);
    const home = String(req.query.home || "");
    const away = String(req.query.away || "");
    res.json({
      success: true,
      home,
      away,
      opportunity: getGoalOpportunity(home, away),
      source: "master-search-v26-goals",
    });
  });

  app.post("/api/admin/robots/live/run", async (req, res) => {
    if (!requireAdmin(req, res)) return;

    try {
      const data = await updateLiveRobot(true);
      res.json({
        success: true,
        message: "Robô Ao Vivo executado agora.",
        robot: getLiveRobotStatus(),
        totalItems: data.games.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao executar Robô Ao Vivo.",
      });
    }
  });

  app.get("/api/admin/robots/live/cache", (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json({ success: true, data: getCachedLiveRobot() });
  });

  app.get("/api/live-robot/games", async (req, res) => {
    const limit = Math.max(
      1,
      Math.min(30, Number(req.query.limit || 10) || 10)
    );
    const force = String(req.query.force || "") === "1";
    const data = await updateLiveRobot(force);

    res.json({
      success: true,
      updatedAt: data.updatedAt,
      source: "live-robot-direct-v21",
      robot: getLiveRobotStatus(),
      games: data.games.slice(0, limit),
      notice: data.games.length
        ? "Robô Ao Vivo direto: partidas reais, sem pressão inventada quando a fonte não entregar estatísticas."
        : "Nenhuma partida real ao vivo encontrada nas fontes públicas monitoradas agora.",
    });
  });

  app.post("/api/live-robot/refresh-api", async (req, res) => {
    if (!requireAdmin(req, res)) return;

    try {
      const data = await updateLiveRobot(true);
      res.json({
        success: true,
        updatedAt: data.updatedAt,
        source: "live-robot-manual-refresh",
        games: data.games.slice(0, 10),
        notice: "Atualização manual executada pelo administrador.",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Erro ao atualizar via API.",
      });
    }
  });

  app.post("/api/admin/robots/rankings/run", async (req, res) => {
    if (!requireAdmin(req, res)) return;

    try {
      const master = await updateMasterSearchRobot(true);
      const data = master.rankings;
      res.json({
        success: true,
        message: "Robô Master Global executou Rankings Inteligentes agora.",
        robot: getMasterSearchRobotStatus(),
        totalItems: data.rankings.goals.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao executar Robô Rankings.",
      });
    }
  });

  app.get("/api/admin/robots/rankings/cache", (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json({
      success: true,
      data: getCachedRankingRobot(),
      robot: getRankingRobotStatus(),
      logs: getRankingRobotLogs(),
    });
  });

  app.post("/api/admin/robots/upcoming/run", async (req, res) => {
    if (!requireAdmin(req, res)) return;

    try {
      const data = await updateUpcomingRobot(true);
      res.json({
        success: true,
        message: "Robô Próximos Jogos executado agora.",
        robot: getUpcomingRobotStatus(),
        totalItems: data.games.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao executar Robô Próximos Jogos.",
      });
    }
  });

  app.get("/api/admin/robots/upcoming/cache", (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json({ success: true, data: getCachedUpcomingRobot() });
  });

  app.get("/api/upcoming-robot/games", async (req, res) => {
    const master = await updateMasterSearchRobot(false);
    const data = master.calendar;
    const limit = Math.max(
      1,
      Math.min(30, Number(req.query.limit || 10) || 10)
    );
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const games = data.events
      .filter(event => event.status === "scheduled" && event.date >= today)
      .slice(0, limit)
      .map(event => ({
        id: event.id,
        fixtureId: event.fixtureId,
        date: event.date,
        time: event.time,
        competition: event.competition,
        league: event.league,
        group: event.country,
        home: event.home,
        away: event.away,
        status: "scheduled",
        source: "master-search-v26-global",
        importance: event.priority,
        importanceLabel: event.priorityLabel,
        reason: "Calendário Master: datas reais e prioridade por competição.",
        homeLogo: event.homeLogo,
        awayLogo: event.awayLogo,
        venue: event.venue,
      }));
    res.json({
      success: true,
      updatedAt: data.updatedAt,
      source: "master-search-v26-global",
      games,
      notice:
        "Busca Master Global V26: datas, ligas, prioridades e cache central alimentando o site todo.",
    });
  });

  app.post("/api/admin/robots/instagram/run", async (req, res) => {
    if (!requireAdmin(req, res)) return;

    try {
      const data = await updateInstagramRobot(true);
      res.json({
        success: true,
        message: "Robô Instagram executado agora.",
        robot: getInstagramRobotStatus(),
        totalItems: data.projects.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao executar Robô Instagram.",
      });
    }
  });

  app.get("/api/admin/instagram/projects", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const data = await updateInstagramRobot(false);
    res.json({ success: true, data });
  });

  app.post("/api/admin/instagram/projects/:id/status", (req, res) => {
    if (!requireAdmin(req, res)) return;
    const status = String(req.body?.status || "pending") as
      | "pending"
      | "approved"
      | "published";
    if (!["pending", "approved", "published"].includes(status)) {
      res.status(400).json({ success: false, error: "Status inválido." });
      return;
    }
    const project = updateInstagramProjectStatus(String(req.params.id), status);
    if (!project) {
      res
        .status(404)
        .json({ success: false, error: "Projeto não encontrado." });
      return;
    }
    res.json({ success: true, project });
  });

  app.get("/api/admin/instagram/projects/:id/export", (req, res) => {
    if (!requireAdmin(req, res)) return;
    const data = getCachedInstagramProjects();
    const project = data.projects.find(
      item => item.id === String(req.params.id)
    );
    if (!project) {
      res
        .status(404)
        .json({ success: false, error: "Projeto não encontrado." });
      return;
    }
    res.json({
      success: true,
      export: {
        fileName: `${project.id}.json`,
        project,
        instructions: [
          "Formato recomendado: Reels 1080x1920",
          "Duração: 30 segundos",
          "Use música sem direitos autorais ou biblioteca do Instagram",
          "Legendas devem entrar conforme tempos start/end de cada slide",
        ],
      },
    });
  });
}
