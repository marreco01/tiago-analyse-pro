import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as sportsApi from "./sports-api";
import * as aiAnalysis from "./ai-analysis";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Análises
  analyses: router({
    // Criar nova análise
    create: protectedProcedure
      .input(
        z.object({
          teamA: z.string(),
          teamB: z.string(),
          competition: z.string(),
          matchDate: z.date().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          // Buscar times
          const teamsA = await sportsApi.searchTeamsByName(input.teamA);
          const teamsB = await sportsApi.searchTeamsByName(input.teamB);

          if (!teamsA.length || !teamsB.length) {
            throw new Error("Times não encontrados");
          }

          // Buscar estatísticas
          const statsA = await sportsApi.getTeamStats(
            teamsA[0].id,
            "39",
            2024
          );
          const statsB = await sportsApi.getTeamStats(
            teamsB[0].id,
            "39",
            2024
          );

          // Buscar confronto direto
          const h2h = await sportsApi.getHeadToHead(
            teamsA[0].id,
            teamsB[0].id,
            10
          );

          // Gerar análise com IA
          const analysis = await aiAnalysis.analyzeMatch({
            teamA: input.teamA,
            teamB: input.teamB,
            competition: input.competition,
            statsA: statsA || {},
            statsB: statsB || {},
            headToHead: h2h,
          });

          // Salvar análise no banco
          const result = await db.createAnalysis({
            userId: ctx.user.id,
            teamA: input.teamA,
            teamB: input.teamB,
            competition: input.competition,
            matchDate: input.matchDate,
            confidence: analysis.confidence,
            prediction: analysis.prediction,
            aiAnalysis: analysis.summary,
            statistics: JSON.stringify({
              teamA: statsA,
              teamB: statsB,
            }),
            marketProbabilities: JSON.stringify(analysis.marketProbabilities),
            likelyScores: JSON.stringify(analysis.likelyScores),
          });

          return {
            success: true,
            analysis,
          };
        } catch (error) {
          console.error("Erro ao criar análise:", error);
          throw error;
        }
      }),

    // Listar análises do usuário
    list: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await db.getUserAnalyses(ctx.user.id);
      } catch (error) {
        console.error("Erro ao listar análises:", error);
        return [];
      }
    }),

    // Obter análise específica
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        try {
          const analysis = await db.getAnalysisById(input.id);
          if (!analysis || analysis.userId !== ctx.user.id) {
            throw new Error("Análise não encontrada");
          }
          return analysis;
        } catch (error) {
          console.error("Erro ao obter análise:", error);
          throw error;
        }
      }),

    // Deletar análise
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        try {
          await db.deleteAnalysis(input.id, ctx.user.id);
          return { success: true };
        } catch (error) {
          console.error("Erro ao deletar análise:", error);
          throw error;
        }
      }),
  }),

  // Favoritos
  favorites: router({
    // Adicionar favorito
    add: protectedProcedure
      .input(z.object({ analysisId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        try {
          await db.addFavorite(ctx.user.id, input.analysisId);
          return { success: true };
        } catch (error) {
          console.error("Erro ao adicionar favorito:", error);
          throw error;
        }
      }),

    // Remover favorito
    remove: protectedProcedure
      .input(z.object({ analysisId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        try {
          await db.removeFavorite(ctx.user.id, input.analysisId);
          return { success: true };
        } catch (error) {
          console.error("Erro ao remover favorito:", error);
          throw error;
        }
      }),

    // Listar favoritos
    list: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await db.getUserFavorites(ctx.user.id);
      } catch (error) {
        console.error("Erro ao listar favoritos:", error);
        return [];
      }
    }),
  }),

  // Dados esportivos
  sports: router({
    // Buscar times
    searchTeams: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        try {
          return await sportsApi.searchTeamsByName(input.query);
        } catch (error) {
          console.error("Erro ao buscar times:", error);
          return [];
        }
      }),

    // Listar competições
    competitions: publicProcedure.query(async () => {
      try {
        return await sportsApi.getCompetitions();
      } catch (error) {
        console.error("Erro ao listar competições:", error);
        return [];
      }
    }),

    // Próximos jogos
    upcomingMatches: publicProcedure
      .input(z.object({ leagueId: z.string().optional() }))
      .query(async ({ input }) => {
        try {
          return await sportsApi.getUpcomingMatches(input.leagueId, 10);
        } catch (error) {
          console.error("Erro ao buscar próximos jogos:", error);
          return [];
        }
      }),

    // Notícias
    news: publicProcedure.query(async () => {
      try {
        return await db.getLatestNews(10);
      } catch (error) {
        console.error("Erro ao buscar notícias:", error);
        return [];
      }
    }),
    // Comparar times
    compareTeams: publicProcedure
      .input(
        z.object({
          teamId1: z.string(),
          teamId2: z.string(),
        })
      )
      .query(async ({ input }) => {
        try {
          const stats1 = await sportsApi.getTeamStats(input.teamId1, "39", 2024);
          const stats2 = await sportsApi.getTeamStats(input.teamId2, "39", 2024);
          const h2h = await sportsApi.getHeadToHead(
            input.teamId1,
            input.teamId2,
            10
          );

          return {
            stats1,
            stats2,
            headToHead: h2h,
          };
        } catch (error) {
          console.error("Erro ao comparar times:", error);
          throw error;
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
