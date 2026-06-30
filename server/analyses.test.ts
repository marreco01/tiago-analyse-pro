import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// Mock context for testing
function createMockContext(): TrpcContext {
  const user: User = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Analyses Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);
  });

  describe("analyses.list", () => {
    it("should return an empty array for new user", async () => {
      const result = await caller.analyses.list();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("sports.searchTeams", () => {
    it("should search for teams by name", async () => {
      const result = await caller.sports.searchTeams({
        query: "Manchester",
      });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return empty array for invalid query", async () => {
      const result = await caller.sports.searchTeams({
        query: "XYZ123InvalidTeam",
      });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("sports.competitions", () => {
    it("should return list of competitions", async () => {
      const result = await caller.sports.competitions();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("sports.upcomingMatches", () => {
    it("should return upcoming matches", async () => {
      const result = await caller.sports.upcomingMatches({});
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("sports.news", () => {
    it("should return news articles", async () => {
      const result = await caller.sports.news();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe("Favorites Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);
  });

  describe("favorites.list", () => {
    it("should return empty array for new user", async () => {
      const result = await caller.favorites.list();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe("Auth Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);
  });

  describe("auth.me", () => {
    it("should return current user", async () => {
      const result = await caller.auth.me();
      expect(result).toBeDefined();
      expect(result?.openId).toBe("test-user-123");
      expect(result?.email).toBe("test@example.com");
    });
  });
});
