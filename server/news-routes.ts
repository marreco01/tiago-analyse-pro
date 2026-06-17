import type { Express, Request, Response } from "express";
import {
  filterNewsByCategory,
  getPublicNews,
  startPublicNewsRobot,
  type NewsCategory,
} from "./scraper";

const categories: NewsCategory[] = [
  "ultimas",
  "brasileirao",
  "mundial",
  "libertadores",
  "mercado",
  "lesoes",
];

function normalizeCategory(value: unknown): NewsCategory {
  const category = String(value || "ultimas") as NewsCategory;
  return categories.includes(category) ? category : "ultimas";
}

export function registerNewsRoutes(app: Express) {
  startPublicNewsRobot();

  async function handler(req: Request, res: Response) {
    try {
      const category = normalizeCategory(req.query.category);
      const force = req.query.refresh === "1" || req.query.refresh === "true";
      const data = await getPublicNews(force);
      const items = filterNewsByCategory(data.items, category);

      res.json({
        success: true,
        updatedAt: data.updatedAt,
        category,
        items,
        news: items,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Erro ao carregar notícias.",
      });
    }
  }

  app.get("/api/news", handler);
  app.get("/api/public/news", handler);
}
