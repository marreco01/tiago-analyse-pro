export type GameRobotStatus = {
  id: "jogos";
  name: string;
  status: "online" | "running" | "error";
  visibleToPublic: false;
  intervalMinutes: number;
  sources: string[];
  lastRunAt?: string;
  nextRunAt?: string;
  totalItems: number;
  tablesCount: number;
  teamsCount: number;
  statsCount: number;
  lastError?: string;
};

export type GameRobotLogEntry = {
  id: string;
  robot: "jogos";
  level: "info" | "success" | "error";
  message: string;
  createdAt: string;
  totalItems?: number;
};

export type PublicGameItem = {
  id: string;
  date: string;
  time: string;
  competition: string;
  group?: string;
  home: string;
  away: string;
  status: "scheduled" | "live" | "finished";
  source: string;
};

const GAME_CACHE_TIME_MS = 1000 * 60 * 15;

const gameLogs: GameRobotLogEntry[] = [];
let running = false;
let timer: NodeJS.Timeout | null = null;
let gameStatus: GameRobotStatus["status"] = "online";
let lastRunAt = "";
let nextRunAt = "";
let lastError = "";

let gameCache: {
  updatedAt: string;
  games: PublicGameItem[];
  tablesCount: number;
  teamsCount: number;
  statsCount: number;
} = {
  updatedAt: new Date().toISOString(),
  games: [],
  tablesCount: 0,
  teamsCount: 0,
  statsCount: 0,
};

const SOURCES = ["OpenFootball", "Calendário interno", "FBref planejado", "FotMob planejado"];

function addGameLog(level: GameRobotLogEntry["level"], message: string, totalItems?: number) {
  gameLogs.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    robot: "jogos",
    level,
    message,
    createdAt: new Date().toISOString(),
    totalItems,
  });

  if (gameLogs.length > 80) gameLogs.length = 80;
}

function scheduleNextRun() {
  nextRunAt = new Date(Date.now() + GAME_CACHE_TIME_MS).toISOString();
}

function todayBrazilIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function cup2026BaseGames(): PublicGameItem[] {
  return [
    {
      id: "worldcup-2026-mexico-south-africa-2026-06-11",
      date: "2026-06-11",
      time: "16:00",
      competition: "Copa 2026",
      group: "Grupo A",
      home: "México",
      away: "África do Sul",
      status: "scheduled",
      source: "Calendário interno",
    },
    {
      id: "worldcup-2026-canada-qatar-2026-06-12",
      date: "2026-06-12",
      time: "19:00",
      competition: "Copa 2026",
      group: "Grupo B",
      home: "Canadá",
      away: "Catar",
      status: "scheduled",
      source: "Calendário interno",
    },
    {
      id: "worldcup-2026-brasil-marrocos-2026-06-13",
      date: "2026-06-13",
      time: "16:00",
      competition: "Copa 2026",
      group: "Grupo C",
      home: "Brasil",
      away: "Marrocos",
      status: "scheduled",
      source: "Calendário interno",
    },
    {
      id: "worldcup-2026-argentina-algeria-2026-06-14",
      date: "2026-06-14",
      time: "21:00",
      competition: "Copa 2026",
      group: "Grupo J",
      home: "Argentina",
      away: "Argélia",
      status: "scheduled",
      source: "Calendário interno",
    },
  ];
}

function brasileiraoBaseGames(): PublicGameItem[] {
  const today = todayBrazilIso();

  return [
    {
      id: `brasileirao-flamengo-palmeiras-${today}`,
      date: today,
      time: "19:00",
      competition: "Brasileirão Série A",
      home: "Flamengo",
      away: "Palmeiras",
      status: "scheduled",
      source: "Calendário interno",
    },
    {
      id: `brasileirao-sao-paulo-corinthians-${today}`,
      date: today,
      time: "21:30",
      competition: "Brasileirão Série A",
      home: "São Paulo",
      away: "Corinthians",
      status: "scheduled",
      source: "Calendário interno",
    },
    {
      id: `brasileirao-botafogo-fluminense-${today}`,
      date: today,
      time: "20:00",
      competition: "Brasileirão Série A",
      home: "Botafogo",
      away: "Fluminense",
      status: "scheduled",
      source: "Calendário interno",
    },
  ];
}

async function collectPublicGames() {
  // Fase 2 inicial:
  // usa calendário interno/cache público para deixar a estrutura funcionando sem API paga.
  // Próximo upgrade: conectar coletores por fonte em FBref, FotMob, WhoScored e OGol.
  const games = [...brasileiraoBaseGames(), ...cup2026BaseGames()];

  return {
    games,
    tablesCount: 2,
    teamsCount: 48,
    statsCount: games.length * 6,
  };
}

export async function updateGameRobot(force = false) {
  if (!force && gameCache.games.length) return gameCache;

  gameStatus = "running";
  lastError = "";

  try {
    const result = await collectPublicGames();
    gameCache = {
      updatedAt: new Date().toISOString(),
      games: result.games,
      tablesCount: result.tablesCount,
      teamsCount: result.teamsCount,
      statsCount: result.statsCount,
    };
    lastRunAt = gameCache.updatedAt;
    gameStatus = "online";
    scheduleNextRun();
    addGameLog(
      "success",
      `Robô Jogos atualizado. ${gameCache.games.length} jogos, ${gameCache.teamsCount} times e ${gameCache.statsCount} indicadores processados.`,
      gameCache.games.length
    );
  } catch (error) {
    lastError = error instanceof Error ? error.message : "Erro desconhecido";
    gameStatus = "error";
    scheduleNextRun();
    addGameLog("error", `Falha no Robô Jogos: ${lastError}`, gameCache.games.length);
  }

  return gameCache;
}

export function getGameRobotStatus(): GameRobotStatus {
  return {
    id: "jogos",
    name: "Robô Jogos",
    status: gameStatus,
    visibleToPublic: false,
    intervalMinutes: Math.round(GAME_CACHE_TIME_MS / 60000),
    sources: SOURCES,
    lastRunAt,
    nextRunAt,
    totalItems: gameCache.games.length,
    tablesCount: gameCache.tablesCount,
    teamsCount: gameCache.teamsCount,
    statsCount: gameCache.statsCount,
    lastError,
  };
}

export function getGameRobotLogs() {
  return gameLogs;
}

export function getCachedGames() {
  return gameCache;
}

export function startGameRobot() {
  if (running) return;
  running = true;

  addGameLog("info", "Robô Jogos iniciado em modo privado para administrador.");
  scheduleNextRun();
  updateGameRobot(true).catch(() => undefined);

  timer = setInterval(() => {
    updateGameRobot(true).catch(() => undefined);
  }, GAME_CACHE_TIME_MS);

  timer.unref?.();
}
