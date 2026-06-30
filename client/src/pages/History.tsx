import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Clock, RefreshCcw, Search, Star, Trash2, Trophy } from "lucide-react";
import { GlassCard, PremiumAppShell } from "@/components/PremiumShell";
import { getSavedAnalyses, removeSavedAnalysis, toggleFavoriteWithLimit, type SavedAnalysis } from "@/lib/localAuth";
import { fetchTodayGames } from "@/lib/footballLive";

export default function History() {
  const [items, setItems] = useState<SavedAnalysis[]>([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"all" | "favorites">("all");
  const [notice, setNotice] = useState("");
  const [apiGames, setApiGames] = useState<any[]>([]);
  const [apiUpdatedAt, setApiUpdatedAt] = useState("");
  const [apiError, setApiError] = useState("");
  useEffect(() => {
    setItems(getSavedAnalyses());
    loadApiGames();
  }, []);
  async function loadApiGames() {
    setApiError("");
    try {
      const games = await fetchTodayGames(6);
      setApiGames(games);
      setApiUpdatedAt(new Date().toISOString());
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Erro ao consultar API Football.");
    }
  }
  const filtered = useMemo(() => { const search=query.trim().toLowerCase(); return items.filter(item => (!search || `${item.teamA} ${item.teamB} ${item.summary || ""}`.toLowerCase().includes(search)) && (view === "all" || Boolean(item.isFavorite))); }, [items,query,view]);
  function favorite(id: string) { setNotice(""); try { setItems(toggleFavoriteWithLimit(id).items); } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível guardar o favorito."); } }
  function remove(id: string) { setItems(removeSavedAnalysis(id)); }
  return <PremiumAppShell><div className="space-y-5">
    <GlassCard className="p-6 md:p-8"><p className="text-sm font-black uppercase tracking-[0.24em] text-yellow-400">Análises realizadas</p><div className="mt-2 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><h1 className="text-4xl font-black md:text-5xl">Histórico</h1><p className="mt-2 text-slate-400">Reabra, favorite ou remova análises anteriores.</p></div><div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-5 py-4 text-yellow-300"><p className="text-xs font-bold uppercase">Total salvo</p><p className="text-3xl font-black">{items.length}</p></div></div></GlassCard>
    {apiError ? <GlassCard className="p-4 text-sm font-bold text-red-200">API Football: {apiError}</GlassCard> : null}
    <GlassCard className="p-5"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><p className="text-sm font-black uppercase tracking-[0.22em] text-yellow-400">Consulta real da API</p><p className="mt-1 text-slate-400">Jogos de hoje disponíveis para gerar nova análise a partir do histórico.</p>{apiUpdatedAt ? <p className="mt-1 text-xs text-slate-500">Última consulta: {new Date(apiUpdatedAt).toLocaleString("pt-BR")}</p> : null}</div><button onClick={loadApiGames} className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-3 text-sm font-black text-black"><RefreshCcw className="h-4 w-4" />Atualizar API</button></div>{apiGames.length ? <div className="mt-4 grid gap-3 md:grid-cols-3">{apiGames.map((game: any) => <Link key={game.id} href={`/analyze?home=${encodeURIComponent(game.home)}&away=${encodeURIComponent(game.away)}`} className="rounded-xl border border-white/10 bg-black/25 p-4 hover:border-yellow-400/50"><p className="font-black text-white">{game.home} x {game.away}</p><p className="mt-1 text-xs text-slate-400">{game.league || "API Football"} • {game.time || "Hoje"}</p></Link>)}</div> : null}</GlassCard>
    <GlassCard className="p-4"><div className="flex flex-col gap-3 md:flex-row"><label className="relative flex-1"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por equipa ou resumo" className="w-full rounded-xl border border-white/10 bg-black/35 py-3 pl-11 pr-4 text-white outline-none focus:border-yellow-400" /></label><div className="flex gap-2"><button onClick={() => setView("all")} className={`rounded-xl px-5 py-3 text-sm font-black ${view === "all" ? "bg-yellow-400 text-black" : "border border-white/10 text-white"}`}>Todas</button><button onClick={() => setView("favorites")} className={`rounded-xl px-5 py-3 text-sm font-black ${view === "favorites" ? "bg-yellow-400 text-black" : "border border-white/10 text-white"}`}>Favoritos</button></div></div>{notice ? <p className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm font-bold text-red-200">{notice}</p> : null}</GlassCard>
    {filtered.length ? <div className="space-y-4">{filtered.map(item => <GlassCard key={item.id} className="p-6"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-black"><Trophy className="h-5 w-5" /></div><div><p className="text-2xl font-black text-white">{item.teamA} x {item.teamB}</p><p className="mt-1 flex items-center gap-2 text-sm text-slate-500"><Clock className="h-4 w-4" /> {new Date(item.createdAt).toLocaleString("pt-BR")} • {item.sourceMode || "API"}</p></div></div><div className="flex flex-wrap gap-3"><button onClick={() => favorite(item.id)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black ${item.isFavorite ? "bg-yellow-400 text-black" : "border border-yellow-400/30 text-yellow-300 hover:bg-yellow-400/10"}`}><Star className={`h-4 w-4 ${item.isFavorite ? "fill-current" : ""}`} />{item.isFavorite ? "Favorito" : "Favoritar"}</button><button onClick={() => remove(item.id)} className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300"><Trash2 className="h-4 w-4" />Apagar</button></div></div><p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4 leading-relaxed text-slate-300">{item.summary || "Análise salva."}</p><div className="mt-4 flex flex-wrap items-center justify-between gap-3">{typeof item.confidence === "number" ? <div className="inline-flex rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-sm font-black text-yellow-300">Qualidade dos dados: {item.confidence}%</div> : <span />}<Link href={`/analyze?home=${encodeURIComponent(item.teamA)}&away=${encodeURIComponent(item.teamB)}`} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-5 py-3 text-sm font-black text-black">Analisar novamente <ArrowRight className="h-4 w-4" /></Link></div></GlassCard>)}</div> : <GlassCard className="p-8 text-center"><p className="text-xl font-black text-white">Nenhuma análise encontrada.</p><Link href="/analyze" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-7 py-3 font-black text-black">Ir para Análise</Link></GlassCard>}
  </div></PremiumAppShell>;
}
