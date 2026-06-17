import { updateBrasileiraoLogoRobot } from "./brasileiraoLogoBot";
import { updateBrasileiraoTableRobot } from "./brasileiraoTableScraper";
import { updateCalendarRobot } from "./eventCalendarRobotScraper";
import { updateCardRobot } from "./cardsScraper";
import { updateCornerRobot } from "./cornersScraper";
import { updateGameRobot } from "./gameScraper";
import { updateGoalRobot } from "./goalsScraper";
import { updateLiveRobot } from "./liveRobotScraper";
import { updateMasterSearchRobot } from "./masterSearchRobot";
import { updatePublicNews } from "./newsScraper";
import { updateRankingRobot } from "./rankingRobotScraper";
import { updateStatisticalRobot } from "./statisticsScraper";
import { updateUpcomingRobot } from "./upcomingRobotScraper";
import { updateWorldCupRobot } from "./worldCupScraper";

export type MasterRobotId =
  | "master"
  | "calendario"
  | "noticias"
  | "jogos"
  | "copa"
  | "brasileirao-classificacao"
  | "brasileirao-escudos"
  | "estatisticas"
  | "gols"
  | "escanteios"
  | "cartoes"
  | "ao-vivo"
  | "proximos"
  | "rankings";

type RobotRunner = (force?: boolean) => Promise<unknown>;

type RobotModule = {
  id: MasterRobotId;
  label: string;
  area: string;
  runner: RobotRunner;
};

const ROBOT_MODULES: Record<MasterRobotId, RobotModule> = {
  master: { id: "master", label: "Busca Master Global", area: "Base", runner: updateMasterSearchRobot },
  calendario: { id: "calendario", label: "Calendário Master", area: "Calendário", runner: updateCalendarRobot },
  noticias: { id: "noticias", label: "Notícias", area: "Conteúdo", runner: updatePublicNews },
  jogos: { id: "jogos", label: "Jogos", area: "Calendário", runner: updateGameRobot },
  copa: { id: "copa", label: "Copa do Mundo", area: "Campeonato", runner: updateWorldCupRobot },
  "brasileirao-classificacao": { id: "brasileirao-classificacao", label: "Classificação Brasileirão", area: "Campeonato", runner: updateBrasileiraoTableRobot },
  "brasileirao-escudos": { id: "brasileirao-escudos", label: "Escudos Brasileirão", area: "Identidade", runner: updateBrasileiraoLogoRobot },
  estatisticas: { id: "estatisticas", label: "Estatísticas", area: "Análise", runner: updateStatisticalRobot },
  gols: { id: "gols", label: "Gols", area: "Análise", runner: updateGoalRobot },
  escanteios: { id: "escanteios", label: "Escanteios", area: "Análise", runner: updateCornerRobot },
  cartoes: { id: "cartoes", label: "Cartões", area: "Análise", runner: updateCardRobot },
  "ao-vivo": { id: "ao-vivo", label: "Ao Vivo", area: "Tempo real", runner: updateLiveRobot },
  proximos: { id: "proximos", label: "Próximos Jogos", area: "Calendário", runner: updateUpcomingRobot },
  rankings: { id: "rankings", label: "Rankings Inteligentes", area: "Análise", runner: updateRankingRobot },
};

export const CHAMPIONSHIP_ROBOT_GROUPS = [
  {
    id: "brasileirao",
    title: "Brasileirão Série A",
    description: "Tudo do Brasileirão passa por uma trilha única: calendário, classificação, escudos, forma, análise e ao vivo.",
    modules: ["master", "calendario", "brasileirao-classificacao", "brasileirao-escudos", "proximos", "ao-vivo", "estatisticas", "gols", "escanteios", "cartoes", "rankings"],
  },
  {
    id: "copa",
    title: "Copa do Mundo",
    description: "Copa com calendário, grupos, seleções, forma recente, análise, rankings e ao vivo alimentados pela Busca Master.",
    modules: ["master", "calendario", "copa", "proximos", "ao-vivo", "estatisticas", "gols", "escanteios", "cartoes", "rankings"],
  },
  {
    id: "mundial",
    title: "Mundial de Clubes",
    description: "Agenda, próximos jogos, ao vivo e mercados estatísticos para jogos do Mundial.",
    modules: ["master", "calendario", "proximos", "ao-vivo", "estatisticas", "gols", "escanteios", "cartoes", "rankings"],
  },
  {
    id: "champions",
    title: "Champions League",
    description: "Pipeline de busca, calendário, análise e oportunidades para Champions.",
    modules: ["master", "calendario", "proximos", "ao-vivo", "estatisticas", "gols", "escanteios", "cartoes", "rankings"],
  },
  {
    id: "libertadores",
    title: "Libertadores",
    description: "Pipeline de busca, calendário, análise e oportunidades para Libertadores.",
    modules: ["master", "calendario", "proximos", "ao-vivo", "estatisticas", "gols", "escanteios", "cartoes", "rankings"],
  },
  {
    id: "ligas-europa",
    title: "Principais Ligas Europeias",
    description: "Premier League, La Liga, Serie A Itália, Bundesliga e Ligue 1 usando a mesma camada Master.",
    modules: ["master", "calendario", "proximos", "ao-vivo", "estatisticas", "gols", "escanteios", "cartoes", "rankings"],
  },
] as const;

export const ANALYSIS_AREA_ROBOT_GROUPS = [
  {
    id: "calendario",
    title: "Calendário / Datas",
    description: "Datas, horários, timezone Brasil, jogos de hoje e próximos jogos.",
    modules: ["master", "calendario", "jogos", "proximos"],
  },
  {
    id: "classificacao",
    title: "Classificações",
    description: "Tabelas por campeonato, zonas de classificação e consistência de clubes.",
    modules: ["master", "brasileirao-classificacao", "copa"],
  },
  {
    id: "identidade",
    title: "Escudos / Bandeiras",
    description: "Escudos, bandeiras, aliases e cache visual local.",
    modules: ["master", "brasileirao-escudos", "copa"],
  },
  {
    id: "mercados",
    title: "Mercados de Análise",
    description: "Gols, BTTS, escanteios, cartões e estatística geral.",
    modules: ["master", "estatisticas", "gols", "escanteios", "cartoes", "rankings"],
  },
  {
    id: "tempo-real",
    title: "Ao Vivo / Pressão",
    description: "Placar, tempo, pressão, alertas, chutes, cantos, cartões e posse.",
    modules: ["master", "ao-vivo", "proximos"],
  },
  {
    id: "conteudo",
    title: "Notícias / Conteúdo",
    description: "Notícias e conteúdo do site separados dos robôs de dados esportivos.",
    modules: ["noticias"],
  },
] as const;

function resolveModules(moduleIds: readonly string[]) {
  return moduleIds
    .map((id) => ROBOT_MODULES[id as MasterRobotId])
    .filter(Boolean);
}

export function getCompetitionAreaRobotArchitecture() {
  const normalizeGroup = (group: any) => ({
    ...group,
    modules: resolveModules(group.modules).map((module) => ({
      id: module.id,
      label: module.label,
      area: module.area,
    })),
  });

  return {
    version: "V42",
    strategy: "Robôs organizados por campeonato e por área de análise. A interface deixa de tratar robôs como peças soltas.",
    championships: CHAMPIONSHIP_ROBOT_GROUPS.map(normalizeGroup),
    analysisAreas: ANALYSIS_AREA_ROBOT_GROUPS.map(normalizeGroup),
  };
}

export async function runRobotModules(moduleIds: readonly string[], force = true) {
  const modules = resolveModules(moduleIds);
  const startedAt = Date.now();
  const results = [];

  for (const module of modules) {
    const moduleStartedAt = Date.now();
    try {
      const data = await module.runner(force);
      results.push({
        id: module.id,
        label: module.label,
        area: module.area,
        success: true,
        executionMs: Date.now() - moduleStartedAt,
        data,
      });
    } catch (error) {
      results.push({
        id: module.id,
        label: module.label,
        area: module.area,
        success: false,
        executionMs: Date.now() - moduleStartedAt,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }

  return {
    success: results.every((result) => result.success),
    executionMs: Date.now() - startedAt,
    modules: results,
  };
}

export async function runChampionshipRobotGroup(groupId: string, force = true) {
  const group = CHAMPIONSHIP_ROBOT_GROUPS.find((item) => item.id === groupId);
  if (!group) throw new Error("Campeonato não encontrado na arquitetura de robôs.");
  return {
    group: { id: group.id, title: group.title, description: group.description },
    ...(await runRobotModules(group.modules, force)),
  };
}

export async function runAnalysisAreaRobotGroup(groupId: string, force = true) {
  const group = ANALYSIS_AREA_ROBOT_GROUPS.find((item) => item.id === groupId);
  if (!group) throw new Error("Área de análise não encontrada na arquitetura de robôs.");
  return {
    group: { id: group.id, title: group.title, description: group.description },
    ...(await runRobotModules(group.modules, force)),
  };
}
