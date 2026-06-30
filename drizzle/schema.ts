import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Análises salvas pelos usuários
export const analyses = mysqlTable("analyses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  teamA: varchar("teamA", { length: 255 }).notNull(),
  teamB: varchar("teamB", { length: 255 }).notNull(),
  competition: varchar("competition", { length: 255 }).notNull(),
  matchDate: timestamp("matchDate"),
  confidence: int("confidence"),
  prediction: text("prediction"),
  aiAnalysis: text("aiAnalysis"),
  statistics: text("statistics"), // JSON string
  marketProbabilities: text("marketProbabilities"), // JSON string
  likelyScores: text("likelyScores"), // JSON string
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = typeof analyses.$inferInsert;

// Favoritos do usuário
export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  analysisId: int("analysisId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

// Cache de dados de times
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  country: varchar("country", { length: 255 }),
  logo: text("logo"),
  founded: int("founded"),
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

// Cache de dados de competições
export const competitions = mysqlTable("competitions", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  country: varchar("country", { length: 255 }),
  logo: text("logo"),
  season: int("season"),
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
});

export type Competition = typeof competitions.$inferSelect;
export type InsertCompetition = typeof competitions.$inferInsert;

// Cache de estatísticas de times
export const teamStats = mysqlTable("teamStats", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull(),
  competitionId: int("competitionId"),
  wins: int("wins").default(0),
  draws: int("draws").default(0),
  losses: int("losses").default(0),
  goalsFor: int("goalsFor").default(0),
  goalsAgainst: int("goalsAgainst").default(0),
  possession: int("possession"),
  shots: int("shots"),
  shotsOnTarget: int("shotsOnTarget"),
  passes: int("passes"),
  corners: int("corners"),
  fouls: int("fouls"),
  yellowCards: int("yellowCards"),
  redCards: int("redCards"),
  xG: int("xG"),
  xGA: int("xGA"),
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
});

export type TeamStat = typeof teamStats.$inferSelect;
export type InsertTeamStat = typeof teamStats.$inferInsert;

// Cache de notícias
export const news = mysqlTable("news", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  image: text("image"),
  source: varchar("source", { length: 255 }),
  url: text("url"),
  teamId: int("teamId"),
  competitionId: int("competitionId"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type News = typeof news.$inferSelect;
export type InsertNews = typeof news.$inferInsert;