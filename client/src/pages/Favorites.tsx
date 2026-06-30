import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Search, Star, Trash2 } from "lucide-react";
import { GlassCard, PremiumAppShell } from "@/components/PremiumShell";
import { authHeaders, getCurrentUser, getFavoriteAnalyses, getFavoriteUsage, removeSavedAnalysis, type SavedAnalysis } from "@/lib/localAuth";

type FavoriteFeed = { team?: { name?: string; logo?: string; league?: string }; games?: Array<{ id?: string | number; home?: string; away?: string; league?: string; date?: string; time?: string; homeLogo?: string; awayLogo?: string }> };

export default function Favorites() {
  const user = getCurrentUser();
  const [items, setItems] = useState<SavedAnalysis[]>([]);
  const [apiFavorites, setApiFavorites] = useState<SavedAnalysis[]>([]);
  const [favoriteFeed, setFavoriteFeed] = useState<FavoriteFeed[]>([]);
  const [apiNotice, setApiNotice] = useState("");
  const [query, setQuery] = useState("");
  function reload() { setItems(getFavoriteAnalyses()); }
  useEffect(() => {
    reload();
    async function loadApiFavorites() {
      setApiNotice("");
      try {
        const response = await fetch("/api/favorites", { headers: authHeaders(), cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.ok && Array.isArray(data.favorites)) {
          setApiFavorites(data.favorites.map((fav: any) => ({
            id: String(fav.id),
            teamA: fav.teamA || "Time A",
            teamB: fav.teamB || "Time B",
            createdAt: fav.createdAt || new Date().toISOString(),
            summary: fav.summary || "Favorito salvo na API.",
            isFavorite: true,
            sourceMode: "API",
          })));
        } else if (data.error) {
          setApiNotice(data.error);
        }
      } catch {
        setApiNotice("Não foi possível sincronizar favoritos com a API.");
      }
      try {
        const feedResponse = await fetch("/api/football/favorite-feed", { headers: authHeaders(), cache: "no-store" });
        const feedData = await feedResponse.json().catch(() => ({}));
        if (feedResponse.ok && feedData.success && Array.isArray(feedData.feeds)) setFavoriteFeed(feedData.feeds);
      } catch {}
    }
    loadApiFavorites();
  }, []);
  const usage = getFavoriteUsage(user);
  const allItems = useMemo(() => {
    const byId = new Map<string, SavedAnalysis>();
    [...apiFavorites, ...items].forEach(item => byId.set(item.id, item));
    return Array.from(byId.values());
  }, [apiFavorites, items]);
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return allItems.filter(item => !search || `${item.teamA} ${item.teamB}`.toLowerCase().includes(search));
  }, [allItems, query]);
  function remove(id: string) { removeSavedAnalysis(id); reload(); }
  if (!user) return <PremiumAppShell><GlassCard className="mx-auto max-w-xl p-8 text-center"><h1 className="text-3xl font-black">Faça login</h1><p className="mt-2 text-slate-400">Entre para guardar análises favoritas.</p><Link href="/login" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 font-black text-black">Entrar</Link></GlassCard></PremiumAppShell>;
  return <PremiumAppShell><div className="space-y-5">
    <GlassCard className="p-6 md:p-8"><p className="text-sm font-black uppercase tracking-[0.24em] text-yellow-400">Análises guardadas</p><div className="mt-2 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><h1 className="text-4xl font-black md:text-5xl">Favoritos</h1><p className="mt-2 text-slate-400">Confrontos marcados para rever depois.</p></div><div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-5 py-4"><p className="text-xs font-bold uppercase text-yellow-300">Limite do plano</p><p className="text-3xl font-black text-yellow-400">{filtered.length} / {usage.limit === null ? "∞" : usage.limit}</p></div></div></GlassCard>
    {apiNotice ? <GlassCard className="p-4 text-sm font-bold text-yellow-200">API: {apiNotice}</GlassCard> : null}
    {favoriteFeed.length ? <GlassCard className="p-5"><p className="text-sm font-black uppercase tracking-[0.22em] text-yellow-400">Jogos reais dos seus times favoritos</p><div className="mt-4 grid gap-3 md:grid-cols-2">{favoriteFeed.flatMap((feed) => (feed.games || []).map((game) => <div key={`${feed.team?.name}-${game.id}`} className="rounded-xl border border-white/10 bg-black/25 p-4"><p className="font-black text-white">{game.home} x {game.away}</p><p className="mt-1 text-xs text-slate-400">{game.league || feed.team?.league || "API Football"} • {game.time || "Horário API"}</p></div>))}</div></GlassCard> : null}
    <GlassCard className="p-4"><label className="relative block"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar time nos favoritos" className="w-full rounded-xl border border-white/10 bg-black/35 py-3 pl-11 pr-4 text-white outline-none focus:border-yellow-400" /></label></GlassCard>
    {filtered.length ? <div className="grid gap-4 md:grid-cols-2">{filtered.map(item => <GlassCard key={item.id} className="p-6"><div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow-400/15 text-yellow-400"><Star className="h-5 w-5 fill-current" /></div><div className="min-w-0 flex-1"><p className="text-xl font-black text-white">{item.teamA} x {item.teamB}</p><p className="mt-1 text-sm text-slate-500">{new Date(item.createdAt).toLocaleString("pt-BR")}</p><p className="mt-4 line-clamp-3 text-sm text-slate-300">{item.summary || "Análise salva."}</p><div className="mt-5 flex flex-wrap gap-3"><Link href={`/analyze?home=${encodeURIComponent(item.teamA)}&away=${encodeURIComponent(item.teamB)}`} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-2 text-sm font-black text-black">Analisar novamente <ArrowRight className="h-4 w-4" /></Link><button onClick={() => remove(item.id)} className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-black text-red-300 hover:bg-red-500/20"><Trash2 className="h-4 w-4" /> Remover</button></div></div></div></GlassCard>)}</div> : <GlassCard className="p-9 text-center"><Star className="mx-auto h-10 w-10 text-yellow-400" /><p className="mt-4 text-xl font-black text-white">{query ? "Nenhum favorito encontrado." : "Nenhum favorito salvo ainda."}</p>{!query ? <Link href="/analyze" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-7 py-3 font-black text-black">Gerar análise</Link> : null}</GlassCard>}
  </div></PremiumAppShell>;
}
