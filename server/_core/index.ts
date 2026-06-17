import dotenv from "dotenv";
import path from "path";

// Carrega variáveis da raiz do projeto de forma explícita no Windows/VS Code.
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerPublicWebAnalyze } from "../public-web-analyze";
import { registerLiveChat } from "../chat";
import { registerAuthAndPayments } from "../auth-payments";
import { registerFootballLive } from "../football-live";
import { resetExpiredPlans } from "../app-data";
import { registerApiUsageControl } from "../api-usage-control";
import { registerNewsRoutes } from "../news-routes";
import { registerAdminRobotRoutes } from "../admin-robots";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  console.log("API_FOOTBALL_KEY:", process.env.API_FOOTBALL_KEY ? "OK" : "NÃO CONFIGURADA");
  console.log("TAVILY_API_KEY:", process.env.TAVILY_API_KEY ? "OK" : "opcional/não configurada");
  console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "OK" : "opcional/não configurada");
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerApiUsageControl(app);
  registerPublicWebAnalyze(app);
  registerFootballLive(app);
  registerNewsRoutes(app);
  registerAdminRobotRoutes(app);
  registerLiveChat(app);
  registerAuthAndPayments(app);
  resetExpiredPlans();
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Em desenvolvimento local, use Vite mesmo quando NODE_ENV não estiver definido.
  // Isso evita erro no Windows quando o cross-env não está instalado.
  const isDevelopment = process.env.NODE_ENV !== "production";
  if (isDevelopment) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
