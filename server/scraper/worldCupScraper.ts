import fs from "fs";
import path from "path";
import { getCachedCalendarRobot } from "./eventCalendarRobotScraper";
import { getCachedUpcomingRobot } from "./upcomingRobotScraper";
import { getCachedLiveRobot } from "./liveRobotScraper";

export type WorldCupTeam = {
  code: string;
  name: string;
  group: string;
  flag: string;
};

export type WorldCupMatchStage =
  | "groups"
  | "round32"
  | "round16"
  | "quarterfinal"
  | "semifinal"
  | "third_place"
  | "final";

export type WorldCupMatch = {
  id: string;
  date: string;
  time: string;
  group?: string;
  stage: WorldCupMatchStage;
  home: string;
  away: string;
  status: "scheduled" | "live" | "finished";
  competition: "Copa 2026";
  homeGoals?: number | null;
  awayGoals?: number | null;
  winner?: string;
  resultSource?: string;
  resultUpdatedAt?: string;
};

export type WorldCupStanding = {
  group: string;
  team: string;
  position: number;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

export type WorldCupAnalysis = {
  matchId: string;
  favorite: string;
  confidence: number;
  over15: number;
  over25: number;
  btts: number;
  corners: number;
  reason: string;
};

export type WorldCupTeamMasterStat = {
  team: string;
  group: string;
  flag: string;
  fifaRank: number;
  elo: number;
  power: number;
  attack: number;
  defense: number;
  form20: number;
  goalsAvg: number;
  btts: number;
  over15: number;
  over25: number;
  cornersAvg: number;
  cardsAvg: number;
  last5: Array<"W" | "D" | "L">;
};

export type WorldCupPlayerStat = {
  player: string;
  team: string;
  flag: string;
  position: string;
  goals: number;
  assists: number;
  goalParticipation: number;
  mvpScore: number;
};

export type WorldCupOpportunity = {
  matchId: string;
  home: string;
  away: string;
  date: string;
  time: string;
  market: string;
  confidence: number;
  risk: "Baixo" | "Médio" | "Alto";
  reason: string;
};

export type WorldCupChampionProjection = {
  team: string;
  flag: string;
  chance: number;
  path: string;
};

export type WorldCupMasterData = {
  updatedAt: string;
  ranking: WorldCupTeamMasterStat[];
  players: WorldCupPlayerStat[];
  simulator: WorldCupChampionProjection[];
  scanner: WorldCupOpportunity[];
  topOver15: WorldCupOpportunity[];
  topOver25: WorldCupOpportunity[];
  topBtts: WorldCupOpportunity[];
  topCorners: WorldCupOpportunity[];
  bestFavorites: WorldCupOpportunity[];
  livePriority: WorldCupMatch[];
};

export type WorldCupRobotStatus = {
  id: "copa";
  name: string;
  status: "online" | "running" | "error";
  visibleToPublic: false;
  intervalMinutes: number;
  sources: string[];
  lastRunAt?: string;
  nextRunAt?: string;
  totalItems: number;
  groupsCount: number;
  teamsCount: number;
  matchesCount: number;
  groupMatchesCount: number;
  knockoutMatchesCount: number;
  standingsCount: number;
  analysisCount: number;
  finishedMatchesCount: number;
  liveMatchesCount: number;
  lastResultSyncAt?: string;
  lastError?: string;
};

export type WorldCupRobotLogEntry = {
  id: string;
  robot: "copa";
  level: "info" | "success" | "error";
  message: string;
  createdAt: string;
  totalItems?: number;
};

type ManualResult = {
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  status: "finished" | "live" | "scheduled";
  source?: string;
  updatedAt: string;
};

const WORLD_CUP_CACHE_TIME_MS = 1000 * 60 * 1;
const SOURCES = ["Busca Master Global", "Calendário Master", "Próximos Jogos", "Ao Vivo Multifontes", "ESPN Scoreboard público", "Calendário interno Analyse Pro", "Correção manual Admin"];
const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), ".data");
const manualResultsFile = path.join(dataDir, "world-cup-manual-results.json");

const groups: Record<string, Array<{ code: string; name: string }>> = {
  "Grupo A": [{ code: "mx", name: "México" }, { code: "za", name: "África do Sul" }, { code: "kr", name: "Coreia do Sul" }, { code: "cz", name: "Chéquia" }],
  "Grupo B": [{ code: "ca", name: "Canadá" }, { code: "ba", name: "Bósnia e Herzegovina" }, { code: "qa", name: "Catar" }, { code: "ch", name: "Suíça" }],
  "Grupo C": [{ code: "br", name: "Brasil" }, { code: "ma", name: "Marrocos" }, { code: "ht", name: "Haiti" }, { code: "gb-sct", name: "Escócia" }],
  "Grupo D": [{ code: "us", name: "Estados Unidos" }, { code: "py", name: "Paraguai" }, { code: "au", name: "Austrália" }, { code: "tr", name: "Turquia" }],
  "Grupo E": [{ code: "de", name: "Alemanha" }, { code: "cw", name: "Curaçao" }, { code: "ci", name: "Costa do Marfim" }, { code: "ec", name: "Equador" }],
  "Grupo F": [{ code: "nl", name: "Países Baixos" }, { code: "jp", name: "Japão" }, { code: "se", name: "Suécia" }, { code: "tn", name: "Tunísia" }],
  "Grupo G": [{ code: "be", name: "Bélgica" }, { code: "eg", name: "Egito" }, { code: "ir", name: "Irã" }, { code: "nz", name: "Nova Zelândia" }],
  "Grupo H": [{ code: "es", name: "Espanha" }, { code: "cv", name: "Cabo Verde" }, { code: "sa", name: "Arábia Saudita" }, { code: "uy", name: "Uruguai" }],
  "Grupo I": [{ code: "fr", name: "França" }, { code: "sn", name: "Senegal" }, { code: "iq", name: "Iraque" }, { code: "no", name: "Noruega" }],
  "Grupo J": [{ code: "ar", name: "Argentina" }, { code: "dz", name: "Argélia" }, { code: "at", name: "Áustria" }, { code: "jo", name: "Jordânia" }],
  "Grupo K": [{ code: "pt", name: "Portugal" }, { code: "cd", name: "RD Congo" }, { code: "uz", name: "Uzbequistão" }, { code: "co", name: "Colômbia" }],
  "Grupo L": [{ code: "gb-eng", name: "Inglaterra" }, { code: "hr", name: "Croácia" }, { code: "gh", name: "Gana" }, { code: "pa", name: "Panamá" }],
};

const aliasMap: Record<string, string> = {
  "south africa": "África do Sul",
  "mexico": "México",
  "czechia": "Chéquia",
  "czech republic": "Chéquia",
  "korea republic": "Coreia do Sul",
  "south korea": "Coreia do Sul",
  "united states": "Estados Unidos",
  "usa": "Estados Unidos",
  "netherlands": "Países Baixos",
  "cape verde": "Cabo Verde",
  "saudi arabia": "Arábia Saudita",
  "england": "Inglaterra",
  "scotland": "Escócia",
  "ivory coast": "Costa do Marfim",
  "cote d'ivoire": "Costa do Marfim",
  "côte d’ivoire": "Costa do Marfim",
  "morocco": "Marrocos",
  "germany": "Alemanha",
  "france": "França",
  "spain": "Espanha",
  "portugal": "Portugal",
  "argentina": "Argentina",
  "brazil": "Brasil",
  "uruguay": "Uruguai",
  "croatia": "Croácia",
  "colombia": "Colômbia",
  "belgium": "Bélgica",
  "japan": "Japão",
  "senegal": "Senegal",
  "ghana": "Gana",
  "canada": "Canadá",
  "qatar": "Catar",
  "switzerland": "Suíça",
  "bosnia and herzegovina": "Bósnia e Herzegovina",
  "bosnia": "Bósnia e Herzegovina",
  "denmark": "Dinamarca",
  "paraguay": "Paraguai",
  "australia": "Austrália",
  "turkey": "Turquia",
  "curacao": "Curaçao",
  "ecuador": "Equador",
  "tunisia": "Tunísia",
  "sweden": "Suécia",
  "nigeria": "Nigéria",
  "egypt": "Egito",
  "iran": "Irã",
  "new zealand": "Nova Zelândia",
  "iraq": "Iraque",
  "norway": "Noruega",
  "algeria": "Argélia",
  "austria": "Áustria",
  "jordan": "Jordânia",
  "uzbekistan": "Uzbequistão",
  "dr congo": "RD Congo",
  "congo dr": "RD Congo",
  "democratic republic of congo": "RD Congo",
  "costa rica": "Costa Rica",
  "panama": "Panamá",
  "haiti": "Haiti",
};

const strengthMap: Record<string, number> = {
  Brasil: 92, Argentina: 91, França: 90, Espanha: 89, Inglaterra: 88, Portugal: 87, Alemanha: 86,
  "Países Baixos": 84, Bélgica: 82, Croácia: 81, Uruguai: 80, Colômbia: 79, Marrocos: 78,
  México: 76, "Estados Unidos": 75, Japão: 74, Senegal: 73, "Bósnia e Herzegovina": 72, Suíça: 72, Austrália: 70, Suécia: 77, "RD Congo": 66,
};


const seededWorldCupResults: Array<{ home: string; away: string; homeGoals: number; awayGoals: number; status: WorldCupMatch["status"]; updatedAt: string }> = [
  { home: "México", away: "África do Sul", homeGoals: 2, awayGoals: 0, status: "finished", updatedAt: "2026-06-11T19:00:00.000Z" },
  { home: "Coreia do Sul", away: "Chéquia", homeGoals: 2, awayGoals: 1, status: "finished", updatedAt: "2026-06-12T02:00:00.000Z" },
  { home: "Canadá", away: "Bósnia e Herzegovina", homeGoals: 1, awayGoals: 1, status: "finished", updatedAt: "2026-06-12T19:00:00.000Z" },
  { home: "Estados Unidos", away: "Paraguai", homeGoals: 4, awayGoals: 1, status: "finished", updatedAt: "2026-06-13T01:00:00.000Z" },
  { home: "Catar", away: "Suíça", homeGoals: 1, awayGoals: 1, status: "finished", updatedAt: "2026-06-13T19:00:00.000Z" },
  { home: "Brasil", away: "Marrocos", homeGoals: 1, awayGoals: 1, status: "finished", updatedAt: "2026-06-13T22:00:00.000Z" },
  { home: "Haiti", away: "Escócia", homeGoals: 0, awayGoals: 1, status: "finished", updatedAt: "2026-06-14T01:00:00.000Z" },
  { home: "Austrália", away: "Turquia", homeGoals: 2, awayGoals: 0, status: "finished", updatedAt: "2026-06-14T04:00:00.000Z" },
  { home: "Alemanha", away: "Curaçao", homeGoals: 7, awayGoals: 1, status: "finished", updatedAt: "2026-06-14T17:00:00.000Z" },
  { home: "Países Baixos", away: "Japão", homeGoals: 2, awayGoals: 2, status: "finished", updatedAt: "2026-06-14T20:00:00.000Z" },
  { home: "Costa do Marfim", away: "Equador", homeGoals: 1, awayGoals: 0, status: "finished", updatedAt: "2026-06-14T23:00:00.000Z" },
  { home: "Suécia", away: "Tunísia", homeGoals: 5, awayGoals: 1, status: "finished", updatedAt: "2026-06-15T02:00:00.000Z" },
  { home: "Espanha", away: "Cabo Verde", homeGoals: 0, awayGoals: 0, status: "finished", updatedAt: "2026-06-15T16:00:00.000Z" },
  { home: "Bélgica", away: "Egito", homeGoals: 1, awayGoals: 1, status: "finished", updatedAt: "2026-06-15T19:00:00.000Z" },
  { home: "Arábia Saudita", away: "Uruguai", homeGoals: 1, awayGoals: 1, status: "finished", updatedAt: "2026-06-15T22:00:00.000Z" },
  { home: "Irã", away: "Nova Zelândia", homeGoals: 2, awayGoals: 2, status: "finished", updatedAt: "2026-06-16T01:00:00.000Z" },
  { home: "França", away: "Senegal", homeGoals: 3, awayGoals: 1, status: "finished", updatedAt: "2026-06-16T19:00:00.000Z" },
];

const matchTimes = ["13:00", "16:00", "19:00", "21:00"];

const officialWorldCupGroupFixtures: Array<{ group: string; home: string; away: string; date: string; time: string }> = [
  { group: "Grupo A", home: "México", away: "África do Sul", date: "2026-06-11", time: "16:00" },
  { group: "Grupo A", home: "Coreia do Sul", away: "Chéquia", date: "2026-06-11", time: "23:00" },
  { group: "Grupo A", home: "Chéquia", away: "África do Sul", date: "2026-06-18", time: "13:00" },
  { group: "Grupo A", home: "México", away: "Coreia do Sul", date: "2026-06-18", time: "22:00" },
  { group: "Grupo A", home: "Chéquia", away: "México", date: "2026-06-24", time: "22:00" },
  { group: "Grupo A", home: "África do Sul", away: "Coreia do Sul", date: "2026-06-24", time: "22:00" },

  { group: "Grupo B", home: "Canadá", away: "Bósnia e Herzegovina", date: "2026-06-12", time: "16:00" },
  { group: "Grupo B", home: "Catar", away: "Suíça", date: "2026-06-13", time: "16:00" },
  { group: "Grupo B", home: "Suíça", away: "Bósnia e Herzegovina", date: "2026-06-18", time: "16:00" },
  { group: "Grupo B", home: "Canadá", away: "Catar", date: "2026-06-18", time: "19:00" },
  { group: "Grupo B", home: "Suíça", away: "Canadá", date: "2026-06-24", time: "16:00" },
  { group: "Grupo B", home: "Bósnia e Herzegovina", away: "Catar", date: "2026-06-24", time: "16:00" },

  { group: "Grupo C", home: "Brasil", away: "Marrocos", date: "2026-06-13", time: "19:00" },
  { group: "Grupo C", home: "Haiti", away: "Escócia", date: "2026-06-13", time: "22:00" },
  { group: "Grupo C", home: "Escócia", away: "Marrocos", date: "2026-06-19", time: "19:00" },
  { group: "Grupo C", home: "Brasil", away: "Haiti", date: "2026-06-19", time: "21:30" },
  { group: "Grupo C", home: "Escócia", away: "Brasil", date: "2026-06-24", time: "19:00" },
  { group: "Grupo C", home: "Marrocos", away: "Haiti", date: "2026-06-24", time: "19:00" },

  { group: "Grupo D", home: "Estados Unidos", away: "Paraguai", date: "2026-06-12", time: "22:00" },
  { group: "Grupo D", home: "Austrália", away: "Turquia", date: "2026-06-14", time: "01:00" },
  { group: "Grupo D", home: "Estados Unidos", away: "Austrália", date: "2026-06-19", time: "16:00" },
  { group: "Grupo D", home: "Turquia", away: "Paraguai", date: "2026-06-20", time: "00:00" },
  { group: "Grupo D", home: "Turquia", away: "Estados Unidos", date: "2026-06-25", time: "23:00" },
  { group: "Grupo D", home: "Paraguai", away: "Austrália", date: "2026-06-25", time: "23:00" },

  { group: "Grupo E", home: "Alemanha", away: "Curaçao", date: "2026-06-14", time: "14:00" },
  { group: "Grupo E", home: "Costa do Marfim", away: "Equador", date: "2026-06-14", time: "20:00" },
  { group: "Grupo E", home: "Alemanha", away: "Costa do Marfim", date: "2026-06-20", time: "17:00" },
  { group: "Grupo E", home: "Equador", away: "Curaçao", date: "2026-06-20", time: "21:00" },
  { group: "Grupo E", home: "Equador", away: "Alemanha", date: "2026-06-25", time: "17:00" },
  { group: "Grupo E", home: "Curaçao", away: "Costa do Marfim", date: "2026-06-25", time: "17:00" },

  { group: "Grupo F", home: "Países Baixos", away: "Japão", date: "2026-06-14", time: "17:00" },
  { group: "Grupo F", home: "Suécia", away: "Tunísia", date: "2026-06-14", time: "23:00" },
  { group: "Grupo F", home: "Países Baixos", away: "Suécia", date: "2026-06-20", time: "14:00" },
  { group: "Grupo F", home: "Tunísia", away: "Japão", date: "2026-06-21", time: "01:00" },
  { group: "Grupo F", home: "Tunísia", away: "Países Baixos", date: "2026-06-25", time: "20:00" },
  { group: "Grupo F", home: "Japão", away: "Suécia", date: "2026-06-25", time: "20:00" },

  { group: "Grupo G", home: "Bélgica", away: "Egito", date: "2026-06-15", time: "16:00" },
  { group: "Grupo G", home: "Irã", away: "Nova Zelândia", date: "2026-06-15", time: "22:00" },
  { group: "Grupo G", home: "Bélgica", away: "Irã", date: "2026-06-21", time: "16:00" },
  { group: "Grupo G", home: "Nova Zelândia", away: "Egito", date: "2026-06-21", time: "22:00" },
  { group: "Grupo G", home: "Nova Zelândia", away: "Bélgica", date: "2026-06-27", time: "00:00" },
  { group: "Grupo G", home: "Egito", away: "Irã", date: "2026-06-27", time: "00:00" },

  { group: "Grupo H", home: "Espanha", away: "Cabo Verde", date: "2026-06-15", time: "13:00" },
  { group: "Grupo H", home: "Arábia Saudita", away: "Uruguai", date: "2026-06-15", time: "19:00" },
  { group: "Grupo H", home: "Espanha", away: "Arábia Saudita", date: "2026-06-21", time: "13:00" },
  { group: "Grupo H", home: "Uruguai", away: "Cabo Verde", date: "2026-06-21", time: "19:00" },
  { group: "Grupo H", home: "Uruguai", away: "Espanha", date: "2026-06-26", time: "21:00" },
  { group: "Grupo H", home: "Cabo Verde", away: "Arábia Saudita", date: "2026-06-26", time: "21:00" },

  { group: "Grupo I", home: "França", away: "Senegal", date: "2026-06-16", time: "16:00" },
  { group: "Grupo I", home: "Iraque", away: "Noruega", date: "2026-06-16", time: "19:00" },
  { group: "Grupo I", home: "França", away: "Iraque", date: "2026-06-22", time: "18:00" },
  { group: "Grupo I", home: "Noruega", away: "Senegal", date: "2026-06-22", time: "21:00" },
  { group: "Grupo I", home: "Noruega", away: "França", date: "2026-06-26", time: "16:00" },
  { group: "Grupo I", home: "Senegal", away: "Iraque", date: "2026-06-26", time: "16:00" },

  { group: "Grupo J", home: "Argentina", away: "Argélia", date: "2026-06-16", time: "22:00" },
  { group: "Grupo J", home: "Áustria", away: "Jordânia", date: "2026-06-17", time: "01:00" },
  { group: "Grupo J", home: "Argentina", away: "Áustria", date: "2026-06-22", time: "14:00" },
  { group: "Grupo J", home: "Jordânia", away: "Argélia", date: "2026-06-23", time: "00:00" },
  { group: "Grupo J", home: "Jordânia", away: "Argentina", date: "2026-06-27", time: "23:00" },
  { group: "Grupo J", home: "Argélia", away: "Áustria", date: "2026-06-27", time: "23:00" },

  { group: "Grupo K", home: "Portugal", away: "RD Congo", date: "2026-06-17", time: "14:00" },
  { group: "Grupo K", home: "Uzbequistão", away: "Colômbia", date: "2026-06-17", time: "23:00" },
  { group: "Grupo K", home: "Portugal", away: "Uzbequistão", date: "2026-06-23", time: "14:00" },
  { group: "Grupo K", home: "Colômbia", away: "RD Congo", date: "2026-06-23", time: "23:00" },
  { group: "Grupo K", home: "Colômbia", away: "Portugal", date: "2026-06-27", time: "20:30" },
  { group: "Grupo K", home: "RD Congo", away: "Uzbequistão", date: "2026-06-27", time: "20:30" },

  { group: "Grupo L", home: "Inglaterra", away: "Croácia", date: "2026-06-17", time: "17:00" },
  { group: "Grupo L", home: "Gana", away: "Panamá", date: "2026-06-17", time: "20:00" },
  { group: "Grupo L", home: "Inglaterra", away: "Gana", date: "2026-06-23", time: "17:00" },
  { group: "Grupo L", home: "Panamá", away: "Croácia", date: "2026-06-23", time: "20:00" },
  { group: "Grupo L", home: "Panamá", away: "Inglaterra", date: "2026-06-27", time: "18:00" },
  { group: "Grupo L", home: "Croácia", away: "Gana", date: "2026-06-27", time: "18:00" },
];

const logs: WorldCupRobotLogEntry[] = [];
let running = false;
let timer: NodeJS.Timeout | null = null;
let status: WorldCupRobotStatus["status"] = "online";
let lastRunAt = "";
let nextRunAt = "";
let lastError = "";
let lastResultSyncAt = "";

let cache = {
  updatedAt: new Date().toISOString(),
  teams: [] as WorldCupTeam[],
  matches: [] as WorldCupMatch[],
  groupMatches: [] as WorldCupMatch[],
  knockoutMatches: [] as WorldCupMatch[],
  standings: [] as WorldCupStanding[],
  analyses: [] as WorldCupAnalysis[],
  master: {
    updatedAt: new Date().toISOString(),
    ranking: [] as WorldCupTeamMasterStat[],
    players: [] as WorldCupPlayerStat[],
    simulator: [] as WorldCupChampionProjection[],
    scanner: [] as WorldCupOpportunity[],
    topOver15: [] as WorldCupOpportunity[],
    topOver25: [] as WorldCupOpportunity[],
    topBtts: [] as WorldCupOpportunity[],
    topCorners: [] as WorldCupOpportunity[],
    bestFavorites: [] as WorldCupOpportunity[],
    livePriority: [] as WorldCupMatch[],
  } as WorldCupMasterData,
  groups: Object.keys(groups),
};

function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
}

function readManualResults(): ManualResult[] {
  try {
    if (!fs.existsSync(manualResultsFile)) return [];
    const parsed = JSON.parse(fs.readFileSync(manualResultsFile, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeManualResults(results: ManualResult[]) {
  ensureDataDir();
  fs.writeFileSync(manualResultsFile, JSON.stringify(results, null, 2));
}

export function setWorldCupManualResult(matchId: string, homeGoals: number, awayGoals: number, status: "finished" | "live" | "scheduled" = "finished") {
  const results = readManualResults().filter((item) => item.matchId !== matchId);
  const item: ManualResult = {
    matchId,
    homeGoals,
    awayGoals,
    status,
    source: "Admin manual",
    updatedAt: new Date().toISOString(),
  };
  results.unshift(item);
  writeManualResults(results);
  addLog("success", `Resultado manual salvo: ${matchId} ${homeGoals}x${awayGoals}.`);
  return item;
}

function slug(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
function canonicalName(value: string) {
  const clean = normalize(value);
  return aliasMap[clean] || value;
}
function flagFor(code: string) { return `https://flagcdn.com/w80/${code}.png`; }
function strength(team: string) { return strengthMap[team] || 64 + (team.length % 18); }
function addDays(base: Date, days: number) { const date = new Date(base); date.setUTCDate(date.getUTCDate() + days); return date; }
function isoDate(date: Date) { return date.toISOString().slice(0, 10); }
function scheduleNextRun() { nextRunAt = new Date(Date.now() + WORLD_CUP_CACHE_TIME_MS).toISOString(); }

function addLog(level: WorldCupRobotLogEntry["level"], message: string, totalItems?: number) {
  logs.unshift({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, robot: "copa", level, message, createdAt: new Date().toISOString(), totalItems });
  if (logs.length > 100) logs.length = 100;
}

function buildTeams(): WorldCupTeam[] {
  return Object.entries(groups).flatMap(([group, list]) => list.map((team) => ({ ...team, group, flag: flagFor(team.code) })));
}

function buildGroupMatches(): WorldCupMatch[] {
  if (officialWorldCupGroupFixtures.length) {
    return officialWorldCupGroupFixtures.map((fixture) => ({
      id: `wc-2026-${slug(fixture.group)}-${slug(fixture.home)}-${slug(fixture.away)}`,
      date: fixture.date,
      time: fixture.time,
      group: fixture.group,
      stage: "groups",
      home: fixture.home,
      away: fixture.away,
      status: "scheduled",
      competition: "Copa 2026",
      homeGoals: null,
      awayGoals: null,
    }));
  }

  const start = new Date(Date.UTC(2026, 5, 11, 12, 0, 0));
  const matches: WorldCupMatch[] = [];
  let index = 0;
  Object.entries(groups).forEach(([group, list], groupIndex) => {
    const pairings: Array<[number, number]> = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];
    pairings.forEach(([homeIndex, awayIndex]) => {
      const home = list[homeIndex].name;
      const away = list[awayIndex].name;
      const date = addDays(start, groupIndex + Math.floor(index / 4));
      matches.push({
        id: `wc-2026-${slug(group)}-${slug(home)}-${slug(away)}`,
        date: isoDate(date),
        time: matchTimes[index % matchTimes.length],
        group,
        stage: "groups",
        home,
        away,
        status: "scheduled",
        competition: "Copa 2026",
        homeGoals: null,
        awayGoals: null,
      });
      index += 1;
    });
  });
  return matches;
}

function buildKnockoutMatches(): WorldCupMatch[] {
  const start = new Date(Date.UTC(2026, 6, 15, 12, 0, 0));
  const definitions: Array<{ stage: WorldCupMatchStage; count: number; label: string; startDay: number }> = [
    { stage: "round32", count: 16, label: "16 avos", startDay: 0 },
    { stage: "round16", count: 8, label: "Oitavas", startDay: 6 },
    { stage: "quarterfinal", count: 4, label: "Quartas", startDay: 10 },
    { stage: "semifinal", count: 2, label: "Semi", startDay: 14 },
    { stage: "third_place", count: 1, label: "3º lugar", startDay: 18 },
    { stage: "final", count: 1, label: "Final", startDay: 19 },
  ];
  const matches: WorldCupMatch[] = [];
  definitions.forEach((item) => {
    for (let i = 1; i <= item.count; i += 1) {
      const date = addDays(start, item.startDay + Math.floor((i - 1) / 4));
      matches.push({
        id: `wc-2026-${item.stage}-${i}`,
        date: isoDate(date),
        time: matchTimes[(i - 1) % matchTimes.length],
        stage: item.stage,
        home: `${item.label} ${i} - Mandante`,
        away: `${item.label} ${i} - Visitante`,
        status: "scheduled",
        competition: "Copa 2026",
        homeGoals: null,
        awayGoals: null,
      });
    }
  });
  return matches;
}

async function fetchEspnResultsForDates(dates: string[]) {
  const results: Array<{ home: string; away: string; homeGoals: number; awayGoals: number; status: WorldCupMatch["status"]; updatedAt: string }> = [];
  const uniqueDates = Array.from(new Set(dates));

  for (const date of uniqueDates) {
    const compact = date.replace(/-/g, "");
    const urls = [
      `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${compact}`,
      `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world.cup/scoreboard?dates=${compact}`,
    ];

    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!response.ok) continue;
        const data: any = await response.json().catch(() => null);
        const events = Array.isArray(data?.events) ? data.events : [];
        for (const event of events) {
          const competition = event?.competitions?.[0];
          const competitors = Array.isArray(competition?.competitors) ? competition.competitors : [];
          const home = competitors.find((item: any) => item.homeAway === "home");
          const away = competitors.find((item: any) => item.homeAway === "away");
          if (!home || !away) continue;

          const homeScore = Number(home.score);
          const awayScore = Number(away.score);
          if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) continue;

          const statusType = competition?.status?.type;
          const completed = Boolean(statusType?.completed);
          const inProgress = Boolean(statusType?.state === "in" || statusType?.name === "STATUS_IN_PROGRESS");

          results.push({
            home: canonicalName(String(home.team?.displayName || home.team?.shortDisplayName || "")),
            away: canonicalName(String(away.team?.displayName || away.team?.shortDisplayName || "")),
            homeGoals: homeScore,
            awayGoals: awayScore,
            status: completed ? "finished" : inProgress ? "live" : "scheduled",
            updatedAt: new Date().toISOString(),
          });
        }
      } catch {
        continue;
      }
    }
  }

  return results;
}

function mergeResults(matches: WorldCupMatch[], externalResults: Awaited<ReturnType<typeof fetchEspnResultsForDates>>, manualResults: ManualResult[]) {
  const merged = matches.map((match) => ({ ...match }));

  function applyByTeams(home: string, away: string, homeGoals: number, awayGoals: number, status: WorldCupMatch["status"], source: string, updatedAt: string) {
    const h = normalize(home);
    const a = normalize(away);
    const found = merged.find((match) => {
      const mh = normalize(match.home);
      const ma = normalize(match.away);
      return (mh === h && ma === a) || (mh === a && ma === h);
    });
    if (!found) return false;

    const sameDirection = normalize(found.home) === h && normalize(found.away) === a;
    found.homeGoals = sameDirection ? homeGoals : awayGoals;
    found.awayGoals = sameDirection ? awayGoals : homeGoals;
    found.status = status;
    found.resultSource = source;
    found.resultUpdatedAt = updatedAt;
    found.winner =
      status === "finished" && typeof found.homeGoals === "number" && typeof found.awayGoals === "number"
        ? found.homeGoals > found.awayGoals ? found.home : found.homeGoals < found.awayGoals ? found.away : "Empate"
        : undefined;
    return true;
  }

  for (const result of externalResults) {
    applyByTeams(result.home, result.away, result.homeGoals, result.awayGoals, result.status, "ESPN público", result.updatedAt);
  }

  for (const manual of manualResults) {
    const found = merged.find((match) => match.id === manual.matchId);
    if (found) {
      found.homeGoals = manual.homeGoals;
      found.awayGoals = manual.awayGoals;
      found.status = manual.status;
      found.resultSource = manual.source || "Admin manual";
      found.resultUpdatedAt = manual.updatedAt;
      found.winner =
        manual.status === "finished"
          ? manual.homeGoals > manual.awayGoals ? found.home : manual.homeGoals < manual.awayGoals ? found.away : "Empate"
          : undefined;
    }
  }

  return merged;
}

function initialStandings(): WorldCupStanding[] {
  return Object.entries(groups).flatMap(([group, list]) =>
    list.map((team, index) => ({
      group, team: team.name, position: index + 1, points: 0, played: 0, wins: 0, draws: 0, losses: 0,
      goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
    }))
  );
}

function applyStandings(groupMatches: WorldCupMatch[]) {
  const base = initialStandings();
  const map = new Map(base.map((row) => [`${row.group}:${row.team}`, { ...row }]));

  for (const match of groupMatches) {
    if (match.stage !== "groups" || match.status !== "finished" || !match.group) continue;
    if (typeof match.homeGoals !== "number" || typeof match.awayGoals !== "number") continue;

    const home = map.get(`${match.group}:${match.home}`);
    const away = map.get(`${match.group}:${match.away}`);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.homeGoals;
    home.goalsAgainst += match.awayGoals;
    away.goalsFor += match.awayGoals;
    away.goalsAgainst += match.homeGoals;

    if (match.homeGoals > match.awayGoals) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (match.homeGoals < match.awayGoals) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }

    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;
    map.set(`${match.group}:${match.home}`, home);
    map.set(`${match.group}:${match.away}`, away);
  }

  return Object.keys(groups).flatMap((group) => {
    const list = Array.from(map.values())
      .filter((row) => row.group === group)
      .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || strength(b.team) - strength(a.team));

    return list.map((row, index) => ({ ...row, position: index + 1 }));
  });
}

function buildAnalyses(matches: WorldCupMatch[]): WorldCupAnalysis[] {
  return matches.map((match) => {
    const homeStrength = strength(match.home);
    const awayStrength = strength(match.away);
    const diff = homeStrength - awayStrength;
    const favorite = Math.abs(diff) <= 3 ? "Equilíbrio" : diff > 0 ? match.home : match.away;
    const confidence = Math.min(91, Math.max(55, 62 + Math.abs(diff)));
    const over15 = Math.min(89, Math.max(58, 70 + Math.floor((homeStrength + awayStrength - 130) / 6)));
    const over25 = Math.min(78, Math.max(42, over15 - 16));
    const btts = Math.min(76, Math.max(38, 54 + Math.floor((Math.min(homeStrength, awayStrength) - 65) / 2)));
    const corners = Math.min(12, Math.max(7, 8 + Math.round((homeStrength + awayStrength - 130) / 18)));
    return {
      matchId: match.id, favorite, confidence, over15, over25, btts, corners,
      reason: match.stage === "groups"
        ? "Robô Copa: grupo, força estimada, ranking interno e calendário."
        : "Robô Copa: projeção inicial de mata-mata até os classificados serem definidos.",
    };
  });
}


function deterministicNumber(seed: string, min: number, max: number) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return min + (hash % (max - min + 1));
}

function buildLast5(team: string): Array<"W" | "D" | "L"> {
  const base = strength(team);
  const values: Array<"W" | "D" | "L"> = [];
  for (let i = 0; i < 5; i += 1) {
    const n = deterministicNumber(`${team}-${i}-form`, 1, 100);
    if (n <= Math.max(36, Math.min(72, base - 18))) values.push("W");
    else if (n <= Math.max(55, Math.min(85, base + 6))) values.push("D");
    else values.push("L");
  }
  return values;
}

function buildTeamMasterStats(teams: WorldCupTeam[], matches: WorldCupMatch[]): WorldCupTeamMasterStat[] {
  const groupMatchCount = new Map<string, { gf: number; ga: number; played: number; wins: number; draws: number; losses: number }>();
  for (const team of teams) groupMatchCount.set(team.name, { gf: 0, ga: 0, played: 0, wins: 0, draws: 0, losses: 0 });
  for (const match of matches) {
    if (match.status !== "finished" || typeof match.homeGoals !== "number" || typeof match.awayGoals !== "number") continue;
    const home = groupMatchCount.get(match.home);
    const away = groupMatchCount.get(match.away);
    if (!home || !away) continue;
    home.gf += match.homeGoals; home.ga += match.awayGoals; home.played += 1;
    away.gf += match.awayGoals; away.ga += match.homeGoals; away.played += 1;
    if (match.homeGoals > match.awayGoals) { home.wins += 1; away.losses += 1; }
    else if (match.homeGoals < match.awayGoals) { away.wins += 1; home.losses += 1; }
    else { home.draws += 1; away.draws += 1; }
  }

  return teams.map((team) => {
    const s = strength(team.name);
    const real = groupMatchCount.get(team.name)!;
    const played = Math.max(1, real.played);
    const attack = Math.min(98, Math.max(48, s + deterministicNumber(`${team.name}-atk`, -6, 8)));
    const defense = Math.min(98, Math.max(44, s + deterministicNumber(`${team.name}-def`, -8, 6)));
    const goalsAvg = real.played ? Number((real.gf / played).toFixed(2)) : Number((1.1 + (attack - 60) / 40).toFixed(2));
    const concededAvg = real.played ? real.ga / played : 1.05 + (85 - defense) / 55;
    return {
      team: team.name,
      group: team.group,
      flag: team.flag,
      fifaRank: Math.max(1, 105 - s + deterministicNumber(`${team.name}-rank`, -3, 6)),
      elo: 1300 + s * 9 + deterministicNumber(`${team.name}-elo`, -28, 32),
      power: s,
      attack,
      defense,
      form20: Math.min(96, Math.max(42, s + deterministicNumber(`${team.name}-20`, -10, 10))),
      goalsAvg,
      btts: Math.min(83, Math.max(35, Math.round(49 + (goalsAvg + concededAvg - 2) * 16))),
      over15: Math.min(94, Math.max(50, Math.round(65 + (goalsAvg + concededAvg - 2) * 18))),
      over25: Math.min(86, Math.max(32, Math.round(48 + (goalsAvg + concededAvg - 2.2) * 18))),
      cornersAvg: Number((7.2 + (attack - 60) / 16).toFixed(1)),
      cardsAvg: Number((2.1 + deterministicNumber(`${team.name}-cards`, 0, 16) / 10).toFixed(1)),
      last5: buildLast5(team.name),
    };
  }).sort((a, b) => b.power - a.power || a.fifaRank - b.fifaRank);
}

function buildWorldCupPlayers(teams: WorldCupTeam[]): WorldCupPlayerStat[] {
  const starNames: Record<string, string[]> = {
    Brasil: ["Vini Jr", "Rodrygo", "Endrick"], Argentina: ["Messi", "Lautaro Martínez", "Julián Álvarez"], França: ["Mbappé", "Griezmann", "Dembélé"],
    Inglaterra: ["Harry Kane", "Bellingham", "Saka"], Portugal: ["Cristiano Ronaldo", "Bruno Fernandes", "Rafael Leão"], Espanha: ["Lamine Yamal", "Pedri", "Morata"],
    Alemanha: ["Musiala", "Wirtz", "Havertz"], Uruguai: ["Darwin Núñez", "Valverde", "Arrascaeta"], Marrocos: ["Hakimi", "Ziyech", "En-Nesyri"],
  };
  return teams.flatMap((team) => {
    const names = starNames[team.name] || [`Craque ${team.name}`, `Meia ${team.name}`, `Atacante ${team.name}`];
    return names.map((player, index) => ({
      player,
      team: team.name,
      flag: team.flag,
      position: index === 0 ? "ATA" : index === 1 ? "MEI" : "ATA",
      goals: Math.max(0, Math.round((strength(team.name) - 60) / 10) + deterministicNumber(`${player}-g`, 0, 3) - index),
      assists: Math.max(0, Math.round((strength(team.name) - 62) / 14) + deterministicNumber(`${player}-a`, 0, 3) - Math.floor(index / 2)),
      goalParticipation: Math.min(92, Math.max(28, strength(team.name) - index * 6 + deterministicNumber(`${player}-p`, -8, 9))),
      mvpScore: Math.min(99, Math.max(45, strength(team.name) + deterministicNumber(`${player}-mvp`, -5, 12) - index * 3)),
    }));
  }).sort((a, b) => b.mvpScore - a.mvpScore).slice(0, 40);
}

function buildChampionSimulator(teams: WorldCupTeam[]): WorldCupChampionProjection[] {
  const total = teams.reduce((sum, team) => sum + Math.pow(strength(team.name), 2.5), 0);
  return teams.map((team) => {
    const chance = Number(((Math.pow(strength(team.name), 2.5) / total) * 100).toFixed(1));
    return { team: team.name, flag: team.flag, chance, path: `Projeção Master: força ${strength(team.name)}, grupo ${team.group}, ataque/defesa e forma recente.` };
  }).sort((a, b) => b.chance - a.chance).slice(0, 24);
}

function riskByConfidence(confidence: number): WorldCupOpportunity["risk"] {
  if (confidence >= 78) return "Baixo";
  if (confidence >= 66) return "Médio";
  return "Alto";
}

function buildWorldCupScanner(matches: WorldCupMatch[], analyses: WorldCupAnalysis[]): WorldCupMasterData {
  const analysisMap = new Map(analyses.map((item) => [item.matchId, item]));
  const scheduled = matches.filter((match) => match.status !== "finished").slice(0, 96);
  const opportunities: WorldCupOpportunity[] = [];

  for (const match of scheduled) {
    const analysis = analysisMap.get(match.id);
    if (!analysis) continue;
    const baseReason = `${match.home} x ${match.away}: força das seleções, fase, calendário e forma recente pela Busca Master Copa.`;
    opportunities.push({ matchId: match.id, home: match.home, away: match.away, date: match.date, time: match.time, market: "Over 1.5 gols", confidence: analysis.over15, risk: riskByConfidence(analysis.over15), reason: baseReason });
    opportunities.push({ matchId: match.id, home: match.home, away: match.away, date: match.date, time: match.time, market: "Over 2.5 gols", confidence: analysis.over25, risk: riskByConfidence(analysis.over25), reason: baseReason });
    opportunities.push({ matchId: match.id, home: match.home, away: match.away, date: match.date, time: match.time, market: "Ambas Marcam", confidence: analysis.btts, risk: riskByConfidence(analysis.btts), reason: baseReason });
    opportunities.push({ matchId: match.id, home: match.home, away: match.away, date: match.date, time: match.time, market: `Escanteios +${analysis.corners - 1}.5`, confidence: Math.min(88, 55 + analysis.corners * 3), risk: riskByConfidence(55 + analysis.corners * 3), reason: baseReason });
    opportunities.push({ matchId: match.id, home: match.home, away: match.away, date: match.date, time: match.time, market: `Favorito: ${analysis.favorite}`, confidence: analysis.confidence, risk: riskByConfidence(analysis.confidence), reason: baseReason });
  }

  const sortByConfidence = (items: WorldCupOpportunity[]) => items.sort((a, b) => b.confidence - a.confidence).slice(0, 12);
  const updatedAt = new Date().toISOString();
  return {
    updatedAt,
    ranking: [],
    players: [],
    simulator: [],
    scanner: sortByConfidence([...opportunities]).slice(0, 30),
    topOver15: sortByConfidence(opportunities.filter((item) => item.market === "Over 1.5 gols")),
    topOver25: sortByConfidence(opportunities.filter((item) => item.market === "Over 2.5 gols")),
    topBtts: sortByConfidence(opportunities.filter((item) => item.market === "Ambas Marcam")),
    topCorners: sortByConfidence(opportunities.filter((item) => item.market.includes("Escanteios"))),
    bestFavorites: sortByConfidence(opportunities.filter((item) => item.market.startsWith("Favorito"))),
    livePriority: matches.filter((match) => match.status === "live").slice(0, 10),
  };
}

function buildWorldCupMasterData(teams: WorldCupTeam[], matches: WorldCupMatch[], analyses: WorldCupAnalysis[]): WorldCupMasterData {
  const scanner = buildWorldCupScanner(matches, analyses);
  return {
    ...scanner,
    updatedAt: new Date().toISOString(),
    ranking: buildTeamMasterStats(teams, matches),
    players: buildWorldCupPlayers(teams),
    simulator: buildChampionSimulator(teams),
  };
}


function allWorldCupTeamNames() {
  return new Set(buildTeams().map((team) => normalize(team.name)));
}

function groupForTeam(name: string) {
  const clean = normalize(canonicalName(name));
  for (const [group, list] of Object.entries(groups)) {
    if (list.some((team) => normalize(team.name) === clean)) return group;
  }
  return undefined;
}

function isWorldCupCompetition(value: unknown) {
  const text = normalize(String(value || ""));
  if (!text) return false;
  if (text.includes("club") || text.includes("clubes")) return false;
  return text.includes("copa do mundo") || text.includes("world cup") || text.includes("fifa world") || text.includes("mundial fifa");
}

function toDateTimeParts(item: any) {
  const rawTimestamp = item?.timestamp || item?.dateTime || item?.startTime || item?.utcDate;
  if (rawTimestamp) {
    const date = new Date(rawTimestamp);
    if (!Number.isNaN(date.getTime())) {
      const br = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
      const time = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
      return { date: br, time };
    }
  }
  return { date: String(item?.date || ""), time: String(item?.time || "00:00") };
}

function normalizeMasterStatus(status: unknown): WorldCupMatch["status"] {
  const text = normalize(String(status || ""));
  if (text.includes("live") || text.includes("ao vivo") || text.includes("progress") || text.includes("in")) return "live";
  if (text.includes("finished") || text.includes("final") || text.includes("encerr") || text.includes("ft")) return "finished";
  return "scheduled";
}

function readGoals(item: any) {
  const homeGoals = item?.homeGoals ?? item?.homeScore ?? item?.score?.home ?? item?.goals?.home ?? null;
  const awayGoals = item?.awayGoals ?? item?.awayScore ?? item?.score?.away ?? item?.goals?.away ?? null;
  const h = Number(homeGoals);
  const a = Number(awayGoals);
  return {
    homeGoals: Number.isFinite(h) ? h : null,
    awayGoals: Number.isFinite(a) ? a : null,
  };
}

function masterEventToWorldCupMatch(item: any, source: string): WorldCupMatch | null {
  const competition = item?.competition || item?.league || item?.tournament || item?.name;
  if (!isWorldCupCompetition(competition)) return null;

  const home = canonicalName(String(item?.home || item?.homeTeam || item?.teamA || "")).trim();
  const away = canonicalName(String(item?.away || item?.awayTeam || item?.teamB || "")).trim();
  if (!home || !away) return null;

  const validTeams = allWorldCupTeamNames();
  if (!validTeams.has(normalize(home)) || !validTeams.has(normalize(away))) return null;

  const { date, time } = toDateTimeParts(item);
  if (!date) return null;

  const homeGroup = groupForTeam(home);
  const awayGroup = groupForTeam(away);
  const group = homeGroup && homeGroup === awayGroup ? homeGroup : homeGroup || awayGroup;
  const { homeGoals, awayGoals } = readGoals(item);
  const status = normalizeMasterStatus(item?.status || item?.statusLabel || item?.state);
  const slugId = slug(`${source}-${item?.fixtureId || item?.id || `${home}-${away}-${date}`}`);

  return {
    id: `wc-master-${slugId}`,
    date,
    time,
    group,
    stage: "groups",
    home,
    away,
    status,
    competition: "Copa 2026",
    homeGoals,
    awayGoals,
    winner: status === "finished" && typeof homeGoals === "number" && typeof awayGoals === "number"
      ? homeGoals > awayGoals ? home : homeGoals < awayGoals ? away : "Empate"
      : undefined,
    resultSource: source,
    resultUpdatedAt: new Date().toISOString(),
  };
}

function collectMasterWorldCupMatches(): WorldCupMatch[] {
  const calendar = getCachedCalendarRobot();
  const upcoming = getCachedUpcomingRobot();
  const live = getCachedLiveRobot();

  const candidates = [
    ...((calendar as any)?.events || []),
    ...((upcoming as any)?.games || []),
    ...((live as any)?.games || []),
  ];

  const matches = candidates
    .map((item) => masterEventToWorldCupMatch(item, "Busca Master"))
    .filter(Boolean) as WorldCupMatch[];

  const dedup = new Map<string, WorldCupMatch>();
  for (const match of matches) {
    const key = [normalize(match.home), normalize(match.away), match.date].sort().join(":");
    const current = dedup.get(key);
    if (!current || current.status === "scheduled" && match.status !== "scheduled") dedup.set(key, match);
  }

  return Array.from(dedup.values()).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function mergeMasterMatches(baseGroupMatches: WorldCupMatch[], masterMatches: WorldCupMatch[]) {
  if (!masterMatches.length) return baseGroupMatches;

  const byPair = new Map<string, WorldCupMatch>();
  function keyFor(match: WorldCupMatch) {
    return [normalize(match.home), normalize(match.away)].sort().join(":");
  }

  for (const match of baseGroupMatches) byPair.set(keyFor(match), match);
  for (const match of masterMatches) byPair.set(keyFor(match), { ...byPair.get(keyFor(match)), ...match, id: byPair.get(keyFor(match))?.id || match.id });

  return Array.from(byPair.values()).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

async function collectWorldCupData() {
  const teams = buildTeams();
  const baseGroupMatches = buildGroupMatches();
  const masterMatches = collectMasterWorldCupMatches();
  const masterMergedGroupMatches = mergeMasterMatches(baseGroupMatches, masterMatches);
  const knockoutMatches = buildKnockoutMatches();
  const datesToCheck = Array.from(new Set([...masterMergedGroupMatches.map((match) => match.date), ...masterMatches.map((match) => match.date)]));
  const externalResults = await fetchEspnResultsForDates(datesToCheck);
  const publicResults = [...seededWorldCupResults, ...externalResults];
  const manualResults = readManualResults();

  const groupMatches = mergeResults(masterMergedGroupMatches, publicResults, manualResults);
  const matches = [...groupMatches, ...knockoutMatches];
  const standings = applyStandings(groupMatches);
  const analyses = buildAnalyses(matches);
  const master = buildWorldCupMasterData(teams, matches, analyses);

  lastResultSyncAt = new Date().toISOString();
  if (masterMatches.length) {
    addLog("success", `Busca Master Copa: ${masterMatches.length} jogos reais capturados do Calendário/Ao Vivo/Próximos Jogos.`, masterMatches.length);
  }
  if (publicResults.length) {
    addLog("success", `Resultados Copa sincronizados: ${publicResults.length} eventos públicos/pré-carregados aplicados.`, publicResults.length);
  }

  return { teams, matches, groupMatches, knockoutMatches, standings, analyses, master, groups: Object.keys(groups) };
}

export async function updateWorldCupRobot(force = false) {
  const age = Date.now() - new Date(cache.updatedAt).getTime();
  if (!force && cache.teams.length && age < WORLD_CUP_CACHE_TIME_MS) return cache;
  status = "running";
  lastError = "";
  try {
    const data = await collectWorldCupData();
    cache = { updatedAt: new Date().toISOString(), ...data };
    lastRunAt = cache.updatedAt;
    status = "online";
    scheduleNextRun();
    addLog("success", `Robô Copa atualizado: ${cache.teams.length} seleções, ${cache.groups.length} grupos, ${cache.groupMatches.length} jogos de grupo, ${cache.knockoutMatches.length} mata-mata, ${cache.groupMatches.filter((m) => m.status === "finished").length} finalizados.`, cache.teams.length);
  } catch (error) {
    lastError = error instanceof Error ? error.message : "Erro desconhecido";
    status = "error";
    scheduleNextRun();
    addLog("error", `Falha no Robô Copa: ${lastError}`, cache.teams.length);
  }
  return cache;
}

export function getWorldCupRobotStatus(): WorldCupRobotStatus {
  const finishedMatchesCount = cache.matches.filter((match) => match.status === "finished").length;
  const liveMatchesCount = cache.matches.filter((match) => match.status === "live").length;
  return {
    id: "copa", name: "Robô Copa 2026", status, visibleToPublic: false,
    intervalMinutes: Math.round(WORLD_CUP_CACHE_TIME_MS / 60000),
    sources: SOURCES, lastRunAt, nextRunAt, totalItems: cache.teams.length,
    groupsCount: cache.groups.length, teamsCount: cache.teams.length, matchesCount: cache.matches.length,
    groupMatchesCount: cache.groupMatches.length, knockoutMatchesCount: cache.knockoutMatches.length,
    standingsCount: cache.standings.length, analysisCount: cache.analyses.length,
    finishedMatchesCount, liveMatchesCount, lastResultSyncAt, lastError,
  };
}
export function getWorldCupRobotLogs() { return logs; }
export function getCachedWorldCup() { return cache; }
export function getWorldCupTeamsForCompare() { return cache.teams.map((team) => team.name); }

export function findWorldCupAnalysis(home: string, away: string) {
  const h = normalize(home);
  const a = normalize(away);
  const match = cache.matches.find((item) => {
    const ih = normalize(item.home);
    const ia = normalize(item.away);
    return (ih === h && ia === a) || (ih === a && ia === h);
  });
  if (!match) return null;
  return { match, analysis: cache.analyses.find((item) => item.matchId === match.id) || null };
}

export function startWorldCupRobot() {
  if (running) return;
  running = true;
  addLog("info", "Robô Copa Master iniciado: consome Busca Master, Calendário, Ao Vivo, Próximos Jogos, resultados e classificação.");
  scheduleNextRun();
  updateWorldCupRobot(true).catch(() => undefined);
  timer = setInterval(() => updateWorldCupRobot(true).catch(() => undefined), WORLD_CUP_CACHE_TIME_MS);
  timer.unref?.();
}
