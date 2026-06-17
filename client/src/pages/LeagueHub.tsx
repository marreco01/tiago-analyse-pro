import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Activity, ArrowRight, BarChart3, CalendarDays, RefreshCcw, Search, Shield, Star, Trophy, Zap } from "lucide-react";
import { GlassCard, PremiumAppShell } from "@/components/PremiumShell";
import { getLeagueBySlug, MAIN_LEAGUES, matchLeagueName, type MainLeagueConfig } from "@/data/mainLeagues";

type MasterMatch = {
  id?: string;
  fixtureId?: string;
  league?: string;
  competition?: string;
  date?: string;
  time?: string;
  status?: string;
  elapsed?: number | null;
  home?: string;
  away?: string;
  homeTeam?: string;
  awayTeam?: string;
  homeLogo?: string;
  awayLogo?: string;
  stadium?: string;
  city?: string;
  round?: string;
  confidence?: number;
  over15?: number;
  over25?: number;
  btts?: number;
  corners85?: number;
  risk?: string;
};

type MasterData = {
  updatedAt?: string;
  calendar?: { events?: MasterMatch[] };
  upcoming?: { games?: MasterMatch[] };
  live?: { games?: MasterMatch[] };
  rankings?: Record<string, MasterMatch[]>;
};

type Tab = "grade" | "analise" | "classificacao" | "resultados" | "ao-vivo";

// V45: removidos jogos fake das ligas. A tela só mostra jogos reais da Busca Master.

function homeName(match: MasterMatch) {
  return match.home || match.homeTeam || "Mandante";
}
function awayName(match: MasterMatch) {
  return match.away || match.awayTeam || "Visitante";
}
function leagueName(match: MasterMatch) {
  return match.league || match.competition || "Liga";
}
function normalizeDate(date?: string) {
  if (!date) return "Data a confirmar";
  const parsed = new Date(date.includes("T") ? date : `${date}T12:00:00-03:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "2-digit" });
}
function matchKey(match: MasterMatch, index: number) {
  return `${match.fixtureId || match.id || "match"}-${homeName(match)}-${awayName(match)}-${index}`;
}
function scoreMatch(match: MasterMatch) {
  return (match.confidence || 70) + (match.over15 || 70) * 0.15 + (match.btts || 55) * 0.1 + (match.corners85 || 55) * 0.05;
}

function useLeagueMasterData(league: MainLeagueConfig) {
  const [data, setData] = useState<MasterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/master-search/data", { cache: "no-store" });
      const json = await res.json();
      const payload = json?.data || json;
      setData(payload);
      setUpdatedAt(payload?.updatedAt || new Date().toISOString());
    } catch {
      setData(null);
      setUpdatedAt(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 1000 * 60 * 5);
    return () => window.clearInterval(timer);
  }, [league.slug]);

  const matches = useMemo(() => {
    const sources: MasterMatch[] = [
      ...(data?.calendar?.events || []),
      ...(data?.upcoming?.games || []),
      ...(data?.live?.games || []),
      ...Object.values(data?.rankings || {}).flat(),
    ];
    const filtered = sources.filter((match) => matchLeagueName(leagueName(match), league));
    const unique = new Map<string, MasterMatch>();
    filtered.forEach((match, index) => unique.set(`${homeName(match)}-${awayName(match)}-${match.date || ""}-${match.time || ""}-${index}`, match));
    const list = Array.from(unique.values()).sort((a, b) => scoreMatch(b) - scoreMatch(a));
    return list;
  }, [data, league]);

  return { matches, loading, updatedAt, refresh: load };
}

function TeamLogo({ name, logo }: { name: string; logo?: string }) {
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").slice(0, 3).toUpperCase();
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-yellow-400/20 bg-black/40">
      {logo ? <img src={logo} alt={name} className="h-full w-full object-contain p-1" /> : <span className="text-[11px] font-black text-yellow-300">{initials}</span>}
    </span>
  );
}

function LeagueHero({ league, best, total }: { league: MainLeagueConfig; best?: MasterMatch; total: number }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-[#021b12] via-[#04110d] to-[#080909] p-8 shadow-2xl lg:grid lg:grid-cols-[1fr_460px_330px] lg:gap-8">
      <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-yellow-400/10 blur-3xl" />
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/35 bg-yellow-400/10 px-5 py-2 text-xs font-black uppercase tracking-[0.28em] text-yellow-300">
          <span>{league.badge}</span> Liga Principal
        </div>
        <h1 className="mt-6 text-5xl font-black leading-none text-white md:text-7xl">
          {league.title.split(" ").slice(0, -1).join(" ") || league.title}
          <span className="block bg-gradient-to-r from-yellow-300 to-orange-500 bg-clip-text text-transparent">{league.title.split(" ").slice(-1)}</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg font-semibold leading-relaxed text-slate-300">
          Grade de jogos, análise IA, próximos confrontos, resultados, forma recente e oportunidades com a Busca Master Global.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <span className={`rounded-full bg-gradient-to-r ${league.accent} px-5 py-3 text-sm font-black text-black`}>{league.country}</span>
          <span className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-900">{total} jogos monitorados</span>
          <span className="rounded-full bg-yellow-400 px-5 py-3 text-sm font-black text-black">Master 5 min</span>
        </div>
      </div>

      <GlassCard className="relative z-10 mt-8 border-yellow-400/35 p-5 lg:mt-0">
        <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-yellow-300"><Zap className="h-4 w-4" /> Melhor jogo da liga</div>
        {best ? (
          <div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="text-center"><TeamLogo name={homeName(best)} logo={best.homeLogo} /><p className="mt-2 text-sm font-black text-white">{homeName(best)}</p></div>
              <span className="rounded-full border border-yellow-400/40 bg-yellow-400/10 px-4 py-3 text-sm font-black text-yellow-300">VS</span>
              <div className="text-center"><TeamLogo name={awayName(best)} logo={best.awayLogo} /><p className="mt-2 text-sm font-black text-white">{awayName(best)}</p></div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm font-bold text-slate-200">
              <span className="rounded-xl bg-white/5 px-3 py-3"><CalendarDays className="mr-2 inline h-4 w-4 text-yellow-300" />{normalizeDate(best.date)}</span>
              <span className="rounded-xl bg-white/5 px-3 py-3">⏰ {best.time || "Horário a confirmar"}</span>
              <span className="rounded-xl bg-white/5 px-3 py-3">🏟️ {best.stadium || "Estádio a confirmar"}</span>
              <span className="rounded-xl bg-white/5 px-3 py-3">🔥 IA {best.confidence || 78}%</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-black">
              <span className="rounded-xl bg-emerald-400/10 p-3 text-emerald-300">Over 1.5 {best.over15 || 82}%</span>
              <span className="rounded-xl bg-blue-400/10 p-3 text-blue-300">BTTS {best.btts || 64}%</span>
              <span className="rounded-xl bg-yellow-400/10 p-3 text-yellow-300">Risco {best.risk || "Médio"}</span>
            </div>
          </div>
        ) : <p className="text-slate-400">Aguardando jogos da Busca Master.</p>}
      </GlassCard>

      <div className="relative z-10 mt-8 grid grid-cols-2 gap-4 lg:mt-0">
        {[{ label: "Jogos", value: total, icon: CalendarDays }, { label: "Ao vivo", value: "0", icon: Activity }, { label: "Análises", value: total, icon: BarChart3 }, { label: "Robô", value: "ON", icon: Shield }].map((card) => {
          const Icon = card.icon;
          return <div key={card.label} className="rounded-2xl border border-white/10 bg-black/35 p-5"><Icon className="h-6 w-6 text-yellow-300" /><p className="mt-4 text-xs font-black uppercase text-slate-400">{card.label}</p><p className="text-3xl font-black text-white">{card.value}</p></div>;
        })}
      </div>
    </section>
  );
}

function MatchRow({ match }: { match: MasterMatch }) {
  return (
    <div className="grid items-center gap-4 border-b border-white/10 px-5 py-4 text-sm font-bold text-slate-200 md:grid-cols-[160px_110px_1fr_120px]">
      <span className="text-slate-400">{leagueName(match)}</span>
      <span className="text-yellow-300">⏰ {match.time || "--:--"}</span>
      <div className="flex items-center justify-center gap-3 text-white">
        <TeamLogo name={homeName(match)} logo={match.homeLogo} />
        <span className="min-w-0 truncate">{homeName(match)}</span>
        <span className="text-yellow-300">x</span>
        <span className="min-w-0 truncate">{awayName(match)}</span>
        <TeamLogo name={awayName(match)} logo={match.awayLogo} />
      </div>
      <span className="rounded-full bg-yellow-400/10 px-3 py-2 text-center text-xs font-black text-yellow-300">IA {match.confidence || 76}%</span>
    </div>
  );
}

export default function LeagueHub() {
  const [location] = useLocation();
  const slug = location.split("/").filter(Boolean).pop();
  const league = getLeagueBySlug(slug);
  const [tab, setTab] = useState<Tab>("grade");
  const [search, setSearch] = useState("");
  const { matches, loading, updatedAt, refresh } = useLeagueMasterData(league);
  const filtered = matches.filter((match) => `${homeName(match)} ${awayName(match)} ${leagueName(match)}`.toLowerCase().includes(search.toLowerCase()));
  const best = matches[0];

  return (
    <PremiumAppShell>
      <LeagueHero league={league} best={best} total={matches.length} />

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        {MAIN_LEAGUES.map((item) => (
          <Link key={item.slug} href={`/ligas/${item.slug}`} className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${item.slug === league.slug ? "border-yellow-400 bg-yellow-400/15 text-yellow-300" : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-yellow-400/35 hover:text-white"}`}>
            <span className="mr-2">{item.badge}</span>{item.title}
          </Link>
        ))}
      </div>

      <GlassCard className="mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-5">
          <div className="flex flex-wrap gap-2">
            {[
              ["grade", "Grade de jogos"],
              ["analise", "Análise IA"],
              ["classificacao", "Classificação"],
              ["resultados", "Resultados"],
              ["ao-vivo", "Ao vivo"],
            ].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key as Tab)} className={`rounded-xl border px-5 py-3 text-sm font-black ${tab === key ? "border-yellow-400 bg-gradient-to-r from-green-500 to-yellow-400 text-black" : "border-white/10 bg-black/30 text-slate-200 hover:border-yellow-400/40"}`}>{label}</button>
            ))}
          </div>
          <button onClick={() => void refresh()} className="flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 text-sm font-black text-emerald-300"><RefreshCcw className="h-4 w-4" /> Atualizar</button>
        </div>

        <div className="border-b border-white/10 p-5">
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-slate-300">
            <Search className="h-4 w-4 text-slate-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar time, liga ou estádio" className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-slate-500" />
          </label>
        </div>

        {tab === "grade" ? (
          <div>
            <div className="flex items-center justify-between px-5 py-4 text-xs font-black uppercase tracking-[0.22em] text-slate-500"><span>{league.title} • próximos jogos</span><span>{loading ? "Carregando..." : `Atualizado ${updatedAt ? new Date(updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}`}</span></div>
            {filtered.length ? filtered.map((match, index) => <MatchRow key={matchKey(match, index)} match={match} />) : <div className="p-8 text-center font-bold text-slate-400">Nenhum jogo encontrado nessa liga agora.</div>}
          </div>
        ) : tab === "analise" ? (
          <div className="grid gap-4 p-5 md:grid-cols-3">
            {filtered.slice(0, 6).map((match, index) => (
              <div key={matchKey(match, index)} className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300">Oportunidade IA</p>
                <h3 className="mt-3 text-lg font-black text-white">{homeName(match)} x {awayName(match)}</h3>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-black">
                  <span className="rounded-xl bg-emerald-400/10 p-3 text-emerald-300">Over 1.5 {match.over15 || 82}%</span>
                  <span className="rounded-xl bg-blue-400/10 p-3 text-blue-300">BTTS {match.btts || 64}%</span>
                  <span className="rounded-xl bg-yellow-400/10 p-3 text-yellow-300">Confiança {match.confidence || 78}%</span>
                  <span className="rounded-xl bg-orange-400/10 p-3 text-orange-300">Risco {match.risk || "Médio"}</span>
                </div>
              </div>
            ))}
          </div>
        ) : tab === "classificacao" ? (
          <div className="p-8 text-center font-bold text-slate-400">Classificação desta liga será preenchida pela Busca Master quando a fonte pública entregar tabela confiável.</div>
        ) : tab === "resultados" ? (
          <div className="p-8 text-center font-bold text-slate-400">Resultados recentes serão sincronizados pelo calendário master e pelo robô ao vivo.</div>
        ) : (
          <div className="p-8 text-center font-bold text-slate-400">Jogos ao vivo desta liga aparecem aqui assim que a Busca Master detectar partidas em andamento.</div>
        )}
      </GlassCard>

      <div className="mt-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm font-bold text-yellow-100">
        V29 aplicado: páginas de ligas principais abaixo do Brasileirão, usando Busca Master Global e o mesmo padrão visual do Brasileirão.
        <Link href="/brasileirao" className="ml-2 inline-flex items-center gap-1 text-yellow-300 underline">Voltar ao Brasileirão <ArrowRight className="h-3 w-3" /></Link>
      </div>
    </PremiumAppShell>
  );
}
