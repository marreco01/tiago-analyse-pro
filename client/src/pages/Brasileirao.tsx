import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  MapPin,
  RefreshCcw,
  Search,
  Shield,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import AnalysisProcessLoader from "@/components/AnalysisProcessLoader";

type Tab = "classificacao" | "rodadas" | "resultados" | "ao-vivo" | "analise";

type Match = {
  fixtureId: string;
  date: string;
  time: string;
  status: string;
  elapsed: number | null;
  league: string;
  home: string;
  away: string;
  homeLogo?: string;
  awayLogo?: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
  round: string;
  stadium?: string;
  city?: string;
};

type Standing = {
  rank: number;
  team: string;
  logo?: string;
  points: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDiff: number;
  form?: string;
};

type Club = { team: string; logo?: string };
type ClubOption = { name: string; logo?: string };

type Dashboard = {
  season: number;
  title: string;
  matches: Match[];
  standings: Standing[];
  clubGrid: Club[];
  totals: { matches: number; completed: number; live: number; upcoming: number; clubs: number };
  updatedAt: string;
};

type ApiResponse = { success: boolean; dashboard?: Dashboard; error?: string };

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "rodadas", label: "Grade de jogos" },
  { id: "classificacao", label: "Classificação" },
  { id: "analise", label: "Análise de times" },
  { id: "ao-vivo", label: "Ao vivo" },
  { id: "resultados", label: "Resultados" },
];

const fallbackClubs: Club[] = [
  { team: "Flamengo", logo: "https://media.api-sports.io/football/teams/127.png" },
  { team: "Palmeiras", logo: "https://media.api-sports.io/football/teams/121.png" },
  { team: "São Paulo", logo: "https://media.api-sports.io/football/teams/126.png" },
  { team: "Corinthians", logo: "https://media.api-sports.io/football/teams/131.png" },
  { team: "Santos", logo: "https://media.api-sports.io/football/teams/128.png" },
  { team: "Vasco", logo: "https://media.api-sports.io/football/teams/133.png" },
  { team: "Botafogo", logo: "https://media.api-sports.io/football/teams/120.png" },
  { team: "Fluminense", logo: "https://media.api-sports.io/football/teams/124.png" },
  { team: "Grêmio", logo: "https://media.api-sports.io/football/teams/130.png" },
  { team: "Internacional", logo: "https://media.api-sports.io/football/teams/119.png" },
  { team: "Atlético-MG", logo: "https://media.api-sports.io/football/teams/1062.png" },
  { team: "Cruzeiro", logo: "https://media.api-sports.io/football/teams/135.png" },
  { team: "Athletico-PR", logo: "https://media.api-sports.io/football/teams/134.png" },
  { team: "Bahia", logo: "https://media.api-sports.io/football/teams/118.png" },
  { team: "Fortaleza", logo: "https://media.api-sports.io/football/teams/154.png" },
  { team: "Ceará", logo: "https://media.api-sports.io/football/teams/129.png" },
  { team: "Vitória", logo: "https://media.api-sports.io/football/teams/159.png" },
  { team: "Sport", logo: "https://media.api-sports.io/football/teams/123.png" },
  { team: "Bragantino", logo: "https://media.api-sports.io/football/teams/794.png" },
  { team: "Juventude", logo: "https://media.api-sports.io/football/teams/152.png" },
];

function normalizeClubName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getClubLogo(name: string, logo?: string) {
  if (logo) return logo;
  const normalized = normalizeClubName(name);
  const found = fallbackClubs.find((club) => {
    const item = normalizeClubName(club.team);
    return item === normalized || item.includes(normalized) || normalized.includes(item);
  });
  return found?.logo;
}

function enrichClubGrid(source?: Club[]) {
  const base = source?.length ? source : fallbackClubs;
  const merged = base.map((club) => ({ ...club, logo: getClubLogo(club.team, club.logo) }));
  const seen = new Set<string>();
  const unique = [...merged, ...fallbackClubs].filter((club) => {
    const key = normalizeClubName(club.team);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.slice(0, 20);
}

export default function Brasileirao() {
  const [tab, setTab] = useState<Tab>("rodadas");
  const [data, setData] = useState<Dashboard | null>(null);
  const [query, setQuery] = useState("");
  const [round, setRound] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedClubA, setSelectedClubA] = useState<ClubOption | null>(null);
  const [selectedClubB, setSelectedClubB] = useState<ClubOption | null>(null);

  function selectClubForTest(club: ClubOption) {
    setTab("analise");
    setQuery("");
    if (!selectedClubA || (selectedClubA.name && selectedClubB)) {
      setSelectedClubA(club);
      setSelectedClubB(null);
      return;
    }
    if (selectedClubA.name === club.name) return;
    setSelectedClubB(club);
  }

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/football/brasileirao", { cache: "no-store" });
      const json = (await response.json()) as ApiResponse;
      if (!response.ok || !json.success || !json.dashboard) throw new Error(json.error || "Não foi possível carregar o Brasileirão.");
      setData(json.dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar Brasileirão.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const clubs = useMemo(() => enrichClubGrid(data?.clubGrid), [data]);
  const leader = data?.standings?.[0];
  const z4 = data?.standings?.slice(-4).map((row) => row.team).join(", ") || "A definir";
  const nextMatch = (data?.matches || []).find((match) => !["FT", "AET", "PEN"].includes(match.status));

  const rounds = useMemo(() => {
    const set = new Set((data?.matches || []).map((match) => match.round).filter(Boolean));
    return Array.from(set).slice(0, 38);
  }, [data]);

  const filteredMatches = useMemo(() => {
    const source = tab === "resultados"
      ? (data?.matches || []).filter((match) => ["FT", "AET", "PEN"].includes(match.status))
      : tab === "ao-vivo"
        ? (data?.matches || []).filter((match) => ["1H", "2H", "HT", "LIVE", "ET"].includes(match.status))
        : (data?.matches || []);

    const q = query.trim().toLowerCase();
    return source.filter((match) => {
      const text = `${match.home} ${match.away} ${match.round} ${match.city || ""}`.toLowerCase();
      return (!q || text.includes(q)) && (round === "all" || match.round === round);
    });
  }, [data, tab, query, round]);

  const groupedByRound = useMemo(() => {
    return filteredMatches.reduce<Record<string, Match[]>>((acc, match) => {
      const key = match.round || "Rodada";
      acc[key] = acc[key] || [];
      acc[key].push(match);
      return acc;
    }, {});
  }, [filteredMatches]);

  return (
    <PremiumAppShell>
      {loading ? <AnalysisProcessLoader title="Carregando Brasileirão..." message="Buscando clubes, rodadas e classificação." /> : null}

      <div className="space-y-5">
        <section className="relative overflow-hidden rounded-[1.35rem] border border-emerald-400/30 bg-[#030907] p-3 shadow-[0_0_70px_rgba(16,185,129,0.12)] sm:p-4 md:rounded-[2rem] md:p-9">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_86%_18%,rgba(250,204,21,0.20),transparent_28%),radial-gradient(circle_at_12%_90%,rgba(16,185,129,0.18),transparent_33%),linear-gradient(120deg,#020805,#061510,#020506)]" />
          <div className="absolute -right-8 top-8 h-48 w-48 rounded-full border border-yellow-400/15 bg-yellow-400/[0.035]" />
          <div className="absolute right-10 top-20 h-28 w-28 rounded-full border border-white/10" />

          <div className="relative z-10 grid gap-4 md:gap-7 xl:grid-cols-[1fr_minmax(360px,520px)_340px] xl:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-yellow-300">
                <Trophy className="h-4 w-4" /> Brasileirão 2026
              </p>
              <h1 className="mt-3 text-2xl font-black text-white sm:mt-5 sm:text-5xl md:text-6xl">
                BRASILEIRÃO <span className="text-yellow-400">SÉRIE A</span>
              </h1>
              <p className="mt-2 max-w-xl text-sm text-slate-300 sm:mt-3 sm:text-base">
                Classificação, G4, Z4, rodadas, jogos ao vivo e resultados dos clubes brasileiros.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wide sm:mt-7 sm:gap-3 sm:text-xs">
                <span className="rounded-full bg-emerald-600 px-3 py-1.5 sm:px-4 sm:py-2 text-white">Brasil</span>
                <span className="rounded-full bg-white px-3 py-1.5 sm:px-4 sm:py-2 text-slate-900">20 clubes</span>
                <span className="rounded-full bg-yellow-400 px-3 py-1.5 sm:px-4 sm:py-2 text-black">38 rodadas</span>
              </div>

              {nextMatch ? (
                <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs sm:mt-6 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm font-bold text-slate-200">
                  <CalendarDays className="h-4 w-4 text-yellow-300" />
                  Próximo jogo: <span className="truncate text-white">{nextMatch.home} x {nextMatch.away}</span>
                </div>
              ) : null}
            </div>

            <ClubStrip clubs={clubs} selectedA={selectedClubA?.name} selectedB={selectedClubB?.name} onSelect={selectClubForTest} />

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <HeroStat label="Jogos" value={String(data?.totals.matches || "--")} icon={<CalendarDays />} />
              <HeroStat label="Ao vivo" value={String(data?.totals.live ?? "--")} icon={<Activity />} />
              <HeroStat label="Finalizados" value={String(data?.totals.completed ?? "--")} icon={<Trophy />} />
              <HeroStat label="Clubes" value={String(data?.totals.clubs || clubs.length)} icon={<Shield />} />
            </div>
          </div>
        </section>

        {error ? (
          <GlassCard className="border-red-400/30 bg-red-500/10 p-5 text-sm font-bold text-red-200">{error}</GlassCard>
        ) : null}

        <GlassCard className="overflow-hidden p-0">
          <div className="sticky top-0 z-20 flex flex-col justify-between gap-3 border-b border-white/10 bg-[#050b08]/95 p-3 backdrop-blur md:flex-row md:items-center md:p-5">
            <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black transition sm:px-4 sm:py-3 sm:text-sm ${
                    tab === item.id
                      ? "bg-gradient-to-r from-green-500 to-yellow-400 text-black"
                      : "border border-white/10 text-slate-200 hover:border-green-400/35"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={loadData} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-black sm:px-5 sm:py-3 sm:text-sm text-emerald-300 hover:bg-emerald-500/20">
              <RefreshCcw className="h-4 w-4" /> Atualizar
            </button>
          </div>

          {tab === "classificacao" ? (
            <StandingsTable rows={data?.standings || []} clubs={clubs} />
          ) : tab === "analise" ? (
            <BrasileiraoAnalysisTest clubs={clubs} selectedA={selectedClubA} selectedB={selectedClubB} onSelect={selectClubForTest} />
          ) : (
            <div className="p-4 md:p-6">
              <div className="mb-5 flex flex-col gap-3 md:flex-row">
                <label className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar clube, estádio ou cidade"
                    className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 text-white outline-none focus:border-emerald-400"
                  />
                </label>
                <select value={round} onChange={(event) => setRound(event.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-bold text-white outline-none focus:border-emerald-400">
                  <option value="all">Todas as rodadas</option>
                  {rounds.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>

              <div className="space-y-4">
                {Object.entries(groupedByRound).map(([roundName, games]) => (
                  <div key={roundName}>
                    <p className="mb-3 text-xs font-black uppercase tracking-[0.23em] text-green-400">{roundName}</p>
                    <div className="space-y-3">
                      {games.map((match) => <MatchRow key={match.fixtureId} match={match} />)}
                    </div>
                  </div>
                ))}
                {!filteredMatches.length ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center text-slate-400">
                    Nenhum jogo disponível nesta seleção.
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </PremiumAppShell>
  );
}

function ClubStrip({ clubs, selectedA, selectedB, onSelect }: { clubs: Club[]; selectedA?: string; selectedB?: string; onSelect: (club: ClubOption) => void }) {
  const visibleClubs = enrichClubGrid(clubs);

  return (
    <div className="rounded-2xl border border-emerald-400/20 bg-black/25 p-3 backdrop-blur sm:rounded-3xl sm:p-4">
      <div className="mb-3 flex items-center gap-2 sm:mb-4">
        <Shield className="h-4 w-4 text-yellow-400" />
        <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400">Todos os clubes</p>
        <div className="h-px flex-1 bg-gradient-to-r from-yellow-400/30 to-transparent" />
      </div>

      <div className="grid max-h-[168px] grid-cols-4 gap-1.5 overflow-hidden sm:max-h-[220px] sm:grid-cols-8 sm:gap-2 xl:grid-cols-8 2xl:grid-cols-10">
        {visibleClubs.map((club) => {
          const selected = selectedA === club.team || selectedB === club.team;
          return (
            <button
              key={club.team}
              type="button"
              title={club.team}
              onClick={() => onSelect({ name: club.team, logo: club.logo })}
              className={`group relative flex aspect-[1.45] items-center justify-center overflow-hidden rounded-md border bg-white shadow-[0_0_12px_rgba(0,0,0,0.20)] transition hover:scale-105 hover:border-yellow-400 ${selected ? "border-yellow-400 ring-2 ring-yellow-400/50" : "border-white/10"}`}
            >
              {club.logo ? (
                <img
                  src={club.logo}
                  alt={club.team}
                  className="h-full w-full object-contain p-1 sm:p-1.5"
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                    event.currentTarget.parentElement?.classList.add("bg-slate-200");
                  }}
                />
              ) : (
                <span className="px-1 text-center text-[9px] font-black text-slate-800">{club.team.slice(0, 3).toUpperCase()}</span>
              )}
              <span className="pointer-events-none absolute inset-0 z-30 hidden items-center justify-center rounded-md border border-yellow-400/40 bg-black/85 px-1 text-center text-[10px] font-black leading-tight text-white shadow-xl group-hover:flex">{club.team}</span>
            </button>
          );
        })}
      </div>

      <button type="button" onClick={() => visibleClubs[0] && onSelect({ name: visibleClubs[0].team, logo: visibleClubs[0].logo })} className="mt-3 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs sm:mt-5 sm:px-4 sm:py-3 sm:text-sm font-black text-slate-200 hover:border-yellow-400/30">
        <span><span className="text-yellow-400">{visibleClubs.length}</span> clubes rumo ao título</span>
        <span className="text-yellow-400">›</span>
      </button>
    </div>
  );
}


function BrasileiraoAnalysisTest({ clubs, selectedA, selectedB, onSelect }: { clubs: Club[]; selectedA: ClubOption | null; selectedB: ClubOption | null; onSelect: (club: ClubOption) => void }) {
  const ready = selectedA && selectedB;
  const seed = ready ? selectedA.name.length * 9 + selectedB.name.length * 4 : 0;
  const confidence = Math.min(88, 60 + (seed % 24));

  return (
    <div className="p-3 md:p-4">
      <div className="mb-5 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.04] p-4">
        <div className="mb-3 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">Modo teste: análise de times do Brasileirão</p>
            <p className="mt-1 text-sm font-bold text-slate-400">Clique nos escudos para escolher Time A e Time B. Passe o mouse para ver o nome do clube.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-black">
            <span className="rounded-xl border border-green-400/25 bg-green-500/10 px-3 py-2 text-green-300">A: {selectedA?.name || "Selecionar"}</span>
            <span className="rounded-xl border border-yellow-400/25 bg-yellow-400/10 px-3 py-2 text-yellow-300">B: {selectedB?.name || "Selecionar"}</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 sm:gap-2 md:grid-cols-8 lg:grid-cols-10">
          {clubs.map((club) => {
            const selected = selectedA?.name === club.team || selectedB?.name === club.team;
            return (
              <button
                key={club.team}
                type="button"
                title={club.team}
                onClick={() => onSelect({ name: club.team, logo: club.logo })}
                className={`group relative flex aspect-square items-center justify-center rounded-lg border bg-black/35 p-1.5 transition sm:rounded-xl sm:p-2 hover:-translate-y-0.5 hover:border-yellow-400 ${selected ? "border-yellow-400 ring-2 ring-yellow-400/50" : "border-white/10"}`}
              >
                <TeamLogo src={club.logo} name={club.team} />
                <span className="pointer-events-none absolute inset-0 z-30 hidden items-center justify-center rounded-xl border border-yellow-400/40 bg-black/85 px-2 text-center text-[11px] font-black leading-tight text-white shadow-xl group-hover:flex">{club.team}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-green-400/20 bg-black/30 p-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-green-300">Resultado da análise teste</p>
        {ready ? (
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center"><TeamLogo src={selectedA.logo} name={selectedA.name} /><p className="mt-2 font-black text-white">{selectedA.name}</p></div>
            <div className="text-center text-2xl font-black text-yellow-400">VS</div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center"><TeamLogo src={selectedB.logo} name={selectedB.name} /><p className="mt-2 font-black text-white">{selectedB.name}</p></div>
            <div className="md:col-span-3 grid gap-3 md:grid-cols-4">
              <MiniStat label="Favorito teste" value={seed % 2 === 0 ? selectedA.name : selectedB.name} />
              <MiniStat label="Confiança" value={`${confidence}%`} />
              <MiniStat label="Over 1.5" value={`${Math.min(92, confidence + 8)}%`} />
              <MiniStat label="Ambas marcam" value={`${Math.max(44, confidence - 10)}%`} />
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm font-bold text-slate-400">Selecione Time A e Time B para testar a análise sem depender da API.</p>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
      <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-yellow-400">{value}</p>
    </div>
  );
}

function HeroStat({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/35 p-3 backdrop-blur sm:rounded-2xl sm:p-4">
      <div className="text-yellow-400">{icon}</div>
      <p className="mt-2 text-[10px] font-bold uppercase text-slate-400 sm:mt-3 sm:text-xs">{label}</p>
      <p className="mt-1 text-xl font-black text-white sm:text-3xl" title={value}>{value}</p>
    </div>
  );
}

function openMatchChat(match: Match) {
  const fixture = String(match.fixtureId || `${match.home}-${match.away}`).replace(/[^a-zA-Z0-9_-]/g, "-");
  window.dispatchEvent(new CustomEvent("tap-open-live-chat", {
    detail: {
      roomId: `match:${fixture}`,
      roomLabel: `Sala ${match.home} x ${match.away}`,
      matchLabel: `${match.elapsed ? `${match.elapsed}' • ` : ""}${match.home} ${match.homeGoals == null || match.awayGoals == null ? "x" : `${match.homeGoals} x ${match.awayGoals}`} ${match.away}`,
      fixtureId: fixture,
    },
  }));
}

function MatchRow({ match }: { match: Match }) {
  const live = ["1H", "2H", "HT", "LIVE", "ET"].includes(match.status);
  const done = ["FT", "AET", "PEN"].includes(match.status);
  const score = match.homeGoals == null || match.awayGoals == null ? "x" : `${match.homeGoals} x ${match.awayGoals}`;
  const query = `/match-center?fixture=${encodeURIComponent(match.fixtureId)}&home=${encodeURIComponent(match.home)}&away=${encodeURIComponent(match.away)}`;

  return (
    <div className="grid items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-3 transition hover:border-green-400/30 md:grid-cols-[125px_1fr_120px]">
      <div>
        <p className="text-xs font-bold uppercase text-slate-500">{match.round}</p>
        <p className="mt-1 font-black text-green-400">{match.time}</p>
        {match.city ? <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{match.city}</p> : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 text-center text-sm font-black text-white">
        <TeamLogo src={match.homeLogo} name={match.home} small />
        <span>{match.home}</span>
        <span className={`rounded-md px-2.5 py-1.5 text-base ${live ? "bg-red-500/15 text-red-400" : done ? "bg-green-500/15 text-green-300" : "bg-yellow-400/10 text-yellow-400"}`}>{score}</span>
        <span>{match.away}</span>
        <TeamLogo src={match.awayLogo} name={match.away} small />
      </div>
      <div className="flex flex-col gap-2">
        <Status status={match.status} elapsed={match.elapsed} />
        <button
          type="button"
          onClick={(event) => { event.preventDefault(); event.stopPropagation(); openMatchChat(match); }}
          data-chat-room-id={`match:${String(match.fixtureId || `${match.home}-${match.away}`).replace(/[^a-zA-Z0-9_-]/g, "-")}`}
          data-chat-room-label={`Sala ${match.home} x ${match.away}`}
          data-chat-match-label={`${match.home} ${score} ${match.away}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-yellow-400/25 px-2.5 py-1.5 text-xs font-black text-yellow-300 hover:bg-yellow-400/10"
        >
          💬 Ativar chat
        </button>
        <Link href={query} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-green-400/25 px-2.5 py-1.5 text-xs font-black text-green-300 hover:bg-green-400/10">
          Abrir jogo <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function StandingsTable({ rows, clubs }: { rows: Standing[]; clubs: Club[] }) {
  const fallbackRows: Standing[] = clubs.map((club, index) => ({
    rank: index + 1,
    team: club.team,
    logo: club.logo,
    points: 0,
    played: 0,
    win: 0,
    draw: 0,
    lose: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalsDiff: 0,
  }));
  const source = rows.length ? rows : fallbackRows;

  return (
    <div className="overflow-x-auto p-3 md:p-4">
      {!rows.length ? (
        <div className="mb-3 rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-3 text-sm font-bold text-yellow-100">
          A API ainda não retornou a classificação 2026. Escudos e clubes ficam preparados até a tabela oficial carregar.
        </div>
      ) : null}
      <table className="w-full min-w-[820px] text-sm">
        <thead className="text-xs uppercase text-slate-500">
          <tr>
            <th className="pb-3 text-left">Posição / Clube</th>
            <th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>PTS</th>
          </tr>
        </thead>
        <tbody>
          {source.map((row) => (
            <tr key={row.team} className="border-t border-white/[0.06]">
              <td className="py-3">
                <span className="flex items-center gap-3 font-bold text-white">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-black ${row.rank <= 4 ? "bg-green-500 text-white" : row.rank >= 17 ? "bg-red-500 text-white" : "bg-white/10 text-slate-300"}`}>{row.rank}</span>
                  <TeamLogo src={row.logo} name={row.team} small />
                  {row.team}
                </span>
              </td>
              <td className="text-center text-slate-300">{row.played}</td>
              <td className="text-center text-slate-300">{row.win}</td>
              <td className="text-center text-slate-300">{row.draw}</td>
              <td className="text-center text-slate-300">{row.lose}</td>
              <td className="text-center text-slate-300">{row.goalsFor}</td>
              <td className="text-center text-slate-300">{row.goalsAgainst}</td>
              <td className="text-center text-slate-300">{row.goalsDiff > 0 ? `+${row.goalsDiff}` : row.goalsDiff}</td>
              <td className="text-center font-black text-yellow-400">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-slate-400">
        <span className="rounded-full bg-green-500/15 px-3 py-2 text-green-300">G4 / Libertadores</span>
        <span className="rounded-full bg-blue-500/15 px-3 py-2 text-blue-300">Sul-Americana / meio</span>
        <span className="rounded-full bg-red-500/15 px-3 py-2 text-red-300">Z4 / Rebaixamento</span>
      </div>
    </div>
  );
}

function TeamLogo({ src, name, small = false }: { src?: string; name: string; small?: boolean }) {
  const [failed, setFailed] = useState(!src);
  const initials = name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "BR";

  if (failed) {
    return (
      <div className={`${small ? "h-7 w-7 text-[10px]" : "h-11 w-11 text-xs"} flex shrink-0 items-center justify-center rounded-full border border-green-400/25 bg-gradient-to-br from-green-500 via-yellow-300 to-blue-600 p-1 font-black text-black`}>
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className={`${small ? "h-7 w-7" : "h-11 w-11"} shrink-0 rounded-full bg-white object-contain p-1`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function Status({ status, elapsed }: { status: string; elapsed: number | null }) {
  if (["1H", "2H", "HT", "LIVE", "ET"].includes(status)) {
    return <p className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-center text-xs font-black text-red-300">{elapsed ? `${elapsed}' • AO VIVO` : "AO VIVO"}</p>;
  }
  if (["FT", "AET", "PEN"].includes(status)) {
    return <p className="rounded-lg border border-green-400/20 bg-green-500/10 px-3 py-2 text-center text-xs font-black text-green-300">FINALIZADO</p>;
  }
  return <p className="rounded-lg border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-center text-xs font-black text-yellow-300">AGENDADO</p>;
}
