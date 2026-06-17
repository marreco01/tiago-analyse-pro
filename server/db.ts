import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, analyses, favorites, teams, competitions, teamStats, news } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Análises
export async function createAnalysis(data: typeof analyses.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(analyses).values(data);
  return result;
}

export async function getUserAnalyses(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(analyses).where(eq(analyses.userId, userId));
}

export async function getAnalysisById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(analyses).where(eq(analyses.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function deleteAnalysis(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.delete(analyses).where(and(eq(analyses.id, id), eq(analyses.userId, userId)));
}

// Favoritos
export async function addFavorite(userId: number, analysisId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(favorites).values({ userId, analysisId });
}

export async function removeFavorite(userId: number, analysisId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.analysisId, analysisId)));
}

export async function getUserFavorites(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const favs = await db.select().from(favorites).where(eq(favorites.userId, userId));
  const analysisIds = favs.map(f => f.analysisId);
  
  if (analysisIds.length === 0) return [];
  
  return db.select().from(analyses).where(
    eq(analyses.userId, userId)
  );
}

// Times
export async function upsertTeam(data: typeof teams.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(teams).where(eq(teams.externalId, data.externalId)).limit(1);
  
  if (existing.length > 0) {
    return db.update(teams).set(data).where(eq(teams.externalId, data.externalId));
  }
  
  return db.insert(teams).values(data);
}

export async function searchTeams(query: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Simples busca por nome (pode ser melhorada com LIKE no futuro)
  return db.select().from(teams).limit(10);
}

// Competições
export async function upsertCompetition(data: typeof competitions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(competitions).where(eq(competitions.externalId, data.externalId)).limit(1);
  
  if (existing.length > 0) {
    return db.update(competitions).set(data).where(eq(competitions.externalId, data.externalId));
  }
  
  return db.insert(competitions).values(data);
}

export async function getCompetitions() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(competitions);
}

// Notícias
export async function getLatestNews(limit: number = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(news).limit(limit);
}

export async function upsertNews(data: typeof news.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(news).where(eq(news.externalId, data.externalId)).limit(1);
  
  if (existing.length > 0) {
    return db.update(news).set(data).where(eq(news.externalId, data.externalId));
  }
  
  return db.insert(news).values(data);
}
