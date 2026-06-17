import fs from "fs";
import path from "path";

export type WorldCupLastGame = {
  date: string;
  opponent: string;
  homeAway: "home" | "away" | "neutral";
  goalsFor: number;
  goalsAgainst: number;
  result: "W" | "D" | "L";
  competition: string;
};

export type WorldCupTeamHistory = {
  group: string;
  team: string;
  code: string;
  flag: string;
  last10: WorldCupLastGame[];
  stats: {
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDiff: number;
    avgGoalsFor: number;
    avgGoalsAgainst: number;
    form: string;
  };
};

export type WorldCupHistoryDatabase = {
  updatedAt: string;
  sourceNote: string;
  teams: WorldCupTeamHistory[];
};

const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), "server/data");
const historyFile = path.join(dataDir, "worldcup-history.json");

function safeNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function calculateWorldCupStats(last10: WorldCupLastGame[]) {
  const games = last10.slice(0, 10);
  const wins = games.filter((game) => game.result === "W").length;
  const draws = games.filter((game) => game.result === "D").length;
  const losses = games.filter((game) => game.result === "L").length;
  const goalsFor = games.reduce((sum, game) => sum + safeNumber(game.goalsFor), 0);
  const goalsAgainst = games.reduce((sum, game) => sum + safeNumber(game.goalsAgainst), 0);
  const played = games.length;
  return {
    played,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDiff: goalsFor - goalsAgainst,
    avgGoalsFor: played ? Number((goalsFor / played).toFixed(2)) : 0,
    avgGoalsAgainst: played ? Number((goalsAgainst / played).toFixed(2)) : 0,
    form: games.map((game) => game.result).join(""),
  };
}

export function normalizeWorldCupHistory(db: WorldCupHistoryDatabase): WorldCupHistoryDatabase {
  return {
    ...db,
    teams: (db.teams || []).map((team) => {
      const last10 = Array.isArray(team.last10) ? team.last10.slice(0, 10) : [];
      return { ...team, last10, stats: calculateWorldCupStats(last10) };
    }),
  };
}

export function loadWorldCupHistory(): WorldCupHistoryDatabase {
  if (!fs.existsSync(historyFile)) {
    return { updatedAt: new Date().toISOString(), sourceNote: "Banco ainda não encontrado.", teams: [] };
  }
  const raw = fs.readFileSync(historyFile, "utf8");
  return normalizeWorldCupHistory(JSON.parse(raw) as WorldCupHistoryDatabase);
}

export function saveWorldCupHistory(db: WorldCupHistoryDatabase) {
  fs.mkdirSync(path.dirname(historyFile), { recursive: true });
  const normalized = normalizeWorldCupHistory({ ...db, updatedAt: new Date().toISOString() });
  fs.writeFileSync(historyFile, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

function teamScore(team?: WorldCupTeamHistory) {
  if (!team || !team.stats.played) return 50;
  const s = team.stats;
  const points = s.wins * 3 + s.draws;
  const maxPoints = Math.max(1, s.played * 3);
  const pointsScore = (points / maxPoints) * 55;
  const attackScore = Math.min(20, s.avgGoalsFor * 8);
  const defenseScore = Math.max(0, 20 - s.avgGoalsAgainst * 8);
  const balanceScore = Math.max(-5, Math.min(5, s.goalDiff));
  return Math.max(5, Math.min(95, pointsScore + attackScore + defenseScore + balanceScore));
}

export function analyzeWorldCupTeams(homeName: string, awayName: string) {
  const db = loadWorldCupHistory();
  const home = db.teams.find((team) => team.team.toLowerCase() === homeName.toLowerCase());
  const away = db.teams.find((team) => team.team.toLowerCase() === awayName.toLowerCase());
  if (!home || !away) {
    return { success: false, error: "Seleção não encontrada no banco da Copa.", homeFound: Boolean(home), awayFound: Boolean(away) };
  }

  const h = teamScore(home);
  const a = teamScore(away);
  const drawBase = 24 + Math.max(0, 12 - Math.abs(h - a) / 2);
  const remaining = 100 - drawBase;
  const homeWin = Math.round((h / (h + a)) * remaining);
  const awayWin = Math.round(remaining - homeWin);
  const draw = Math.round(100 - homeWin - awayWin);
  const avgGoals = (home.stats.avgGoalsFor + away.stats.avgGoalsFor + home.stats.avgGoalsAgainst + away.stats.avgGoalsAgainst) / 2;

  return {
    success: true,
    updatedAt: db.updatedAt,
    home,
    away,
    probabilities: {
      homeWin,
      draw,
      awayWin,
      over15Goals: Math.max(35, Math.min(88, Math.round(48 + avgGoals * 12))),
      over25Goals: Math.max(22, Math.min(76, Math.round(28 + avgGoals * 11))),
      bothTeamsToScore: Math.max(25, Math.min(75, Math.round(35 + avgGoals * 9))),
    },
    note: "Probabilidade esportiva estimada com base somente nos últimos jogos cadastrados no banco local.",
  };
}
