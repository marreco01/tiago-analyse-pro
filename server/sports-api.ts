/**
 * Serviço de integração com API-Football / API-Sports direta.
 * Usa somente a variável API_FOOTBALL_KEY no .env.local.
 */

import { controlledApiFootballFetch, recordApiCacheHit } from './api-usage-control';

interface TeamData {
  id: string;
  name: string;
  country: string;
  logo?: string;
  founded?: number;
}

interface CompetitionData {
  id: string;
  name: string;
  country: string;
  logo?: string;
  season?: number;
}

interface TeamStatsData {
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  possession?: number;
  shots?: number;
  shotsOnTarget?: number;
  passes?: number;
  corners?: number;
  fouls?: number;
  yellowCards?: number;
  redCards?: number;
  xG?: number;
  xGA?: number;
}

const API_BASE = 'https://v3.football.api-sports.io';
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY || '';
const apiCache = new Map<string, { expiresAt: number; data: any }>();
const CACHE_TTL_MS = 1000 * 60 * 10;

async function apiGet(path: string, params: Record<string, string | number | undefined> = {}) {
  if (!API_FOOTBALL_KEY) {
    throw new Error('API_FOOTBALL_KEY não configurada. Crie .env.local na raiz com API_FOOTBALL_KEY=sua_chave.');
  }
  const cacheKey = `${path}?${JSON.stringify(Object.entries(params).sort())}`;
  const cached = apiCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    recordApiCacheHit(`trpc:${path}`);
    return cached.data;
  }
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') url.searchParams.set(key, String(value));
  });
  const response = await controlledApiFootballFetch(url.toString(), {
    headers: { 'x-apisports-key': API_FOOTBALL_KEY, accept: 'application/json' },
  }, `trpc:${path}`, 'standard');
  const data = await response.json();
  if (!response.ok) throw new Error(`API-Football HTTP ${response.status}`);
  apiCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, data });
  return data;
}

export async function searchTeamsByName(teamName: string): Promise<TeamData[]> {
  try {
    const response = await apiGet('/teams', { search: teamName });
    return (response.response || []).map((item: any) => ({
      id: String(item.team.id),
      name: item.team.name,
      country: item.team.country || '',
      logo: item.team.logo,
      founded: item.team.founded,
    }));
  } catch (error) {
    console.error('Erro ao buscar times na API-Football:', error instanceof Error ? error.message : error);
    return [];
  }
}

export async function getCompetitions(): Promise<CompetitionData[]> {
  try {
    const response = await apiGet('/leagues');
    return (response.response || []).slice(0, 80).map((item: any) => ({
      id: String(item.league.id),
      name: item.league.name,
      country: item.country?.name || '',
      logo: item.league.logo,
      season: item.seasons?.[0]?.year,
    }));
  } catch (error) {
    console.error('Erro ao buscar competições na API-Football:', error instanceof Error ? error.message : error);
    return [];
  }
}

export async function getTeamStats(teamId: string, leagueId: string, season: number): Promise<TeamStatsData | null> {
  try {
    const response = await apiGet('/teams/statistics', { team: teamId, league: leagueId, season });
    const stats = response.response;
    if (!stats) return null;
    return {
      wins: stats.fixtures?.wins?.total || 0,
      draws: stats.fixtures?.draws?.total || 0,
      losses: stats.fixtures?.loses?.total || 0,
      goalsFor: stats.goals?.for?.total?.total || stats.goals?.for?.total || 0,
      goalsAgainst: stats.goals?.against?.total?.total || stats.goals?.against?.total || 0,
      yellowCards: stats.cards?.yellow ? Object.values(stats.cards.yellow).reduce((a: any, b: any) => a + (b?.total || 0), 0) as number : undefined,
      redCards: stats.cards?.red ? Object.values(stats.cards.red).reduce((a: any, b: any) => a + (b?.total || 0), 0) as number : undefined,
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas na API-Football:', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function getTeamMatches(teamId: string, limit: number = 10): Promise<any[]> {
  try {
    const response = await apiGet('/fixtures', { team: teamId, last: limit });
    return (response.response || []).map((match: any) => ({
      id: match.fixture.id,
      date: match.fixture.date,
      homeTeam: match.teams.home.name,
      awayTeam: match.teams.away.name,
      homeGoals: match.goals.home,
      awayGoals: match.goals.away,
      status: match.fixture.status.short,
      league: match.league?.name,
    }));
  } catch (error) {
    console.error('Erro ao buscar jogos na API-Football:', error instanceof Error ? error.message : error);
    return [];
  }
}

export async function getHeadToHead(teamAId: string, teamBId: string, limit: number = 10): Promise<any[]> {
  try {
    const response = await apiGet('/fixtures/headtohead', { h2h: `${teamAId}-${teamBId}`, last: limit });
    return (response.response || []).map((match: any) => ({
      id: match.fixture.id,
      date: match.fixture.date,
      homeTeam: match.teams.home.name,
      awayTeam: match.teams.away.name,
      homeGoals: match.goals.home,
      awayGoals: match.goals.away,
      status: match.fixture.status.short,
      league: match.league?.name,
    }));
  } catch (error) {
    console.error('Erro ao buscar confronto direto na API-Football:', error instanceof Error ? error.message : error);
    return [];
  }
}

export async function getUpcomingMatches(leagueId?: string, limit: number = 10): Promise<any[]> {
  try {
    const params: Record<string, string | number | undefined> = { next: limit };
    if (leagueId) params.league = leagueId;
    const response = await apiGet('/fixtures', params);
    return response.response || [];
  } catch (error) {
    console.error('Erro ao buscar próximos jogos na API-Football:', error instanceof Error ? error.message : error);
    return [];
  }
}
