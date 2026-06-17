export {
  type FootballNewsItem,
  type NewsCategory,
  filterNewsByCategory,
  getCachedPublicNews,
  getPublicNews,
  getNewsRobotLogs,
  getNewsRobotStatus,
  startPublicNewsRobot,
  updatePublicNews,
} from "./newsScraper";

export {
  getCachedGames,
  getGameRobotLogs,
  getGameRobotStatus,
  startGameRobot,
  updateGameRobot,
  type GameRobotLogEntry,
  type GameRobotStatus,
  type PublicGameItem,
} from "./gameScraper";

export {
  findWorldCupAnalysis,
  getCachedWorldCup,
  getWorldCupRobotLogs,
  getWorldCupRobotStatus,
  getWorldCupTeamsForCompare,
  startWorldCupRobot,
  updateWorldCupRobot,
  type WorldCupMatch,
  type WorldCupRobotLogEntry,
  type WorldCupRobotStatus,
  type WorldCupTeam,
} from "./worldCupScraper";

export * from "./worldCupScraper";

export * from "./statisticsScraper";

export * from "./cornersScraper";

export * from "./cardsScraper";

export * from "./goalsScraper";

export * from "./liveRobotScraper";

export * from "./upcomingRobotScraper";

export * from "./instagramRobotScraper";

export * from "./brasileiraoTableScraper";

export * from "./brasileiraoLogoBot";

export * from "./rankingRobotScraper";

export * from "./eventCalendarRobotScraper";

export * from "./masterSearchRobot";

export * from "./masterCompareRobot";

export * from "./competitionAreaMaster";

export * from "./brasileiraoBTableScraper";
