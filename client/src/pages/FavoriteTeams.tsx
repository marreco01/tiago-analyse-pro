import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellRing, CalendarDays, Check, Plus, RefreshCcw, Search, Smartphone, Star, Trash2 } from "lucide-react";
import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import { authHeaders } from "@/lib/localAuth";
import { teams, type Team } from "@/data/teams";

type SavedTeam = { id: string; teamId: number; name: string; logo?: string; league?: string };
type Preference = { enabled: boolean; gameStart: boolean; halfTime: boolean; fullTime: boolean };
type Game = { fixtureId: string; date: string; time: string; status: string; league: string; home: string; away: string; homeLogo?: string; awayLogo?: string; homeGoals?: number | null; awayGoals?: number | null };
type Feed = { team: SavedTeam; games: Game[] };

const defaultPreference: Preference = { enabled: false, gameStart: true, halfTime: true, fullTime: true };

export default function FavoriteTeams() {
  const [selected, setSelected] = useState<SavedTeam[]>([]);
  const [preferences, setPreferences] = useState<Preference>(defaultPreference);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const previousStatus = useRef<Record<string, string>>({});

  async function loadTeams() {
    const response = await fetch("/api/favorite-teams", { headers: authHeaders(), cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setSelected(data.teams || []);
      setPreferences(data.preferences || defaultPreference);
      return data.teams || [];
    }
    throw new Error(data.error || "Não foi possível carregar os times.");
  }

  async function loadFeed(notify = false) {
    const response = await fetch("/api/football/favorite-feed", { headers: authHeaders(), cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível carregar os próximos jogos.");
    const nextFeeds: Feed[] = data.feeds || [];
    if (notify && preferences.enabled && "Notification" in window && Notification.permission === "granted") {
      nextFeeds.flatMap(feed => feed.games).forEach(game => {
        const last = previousStatus.current[game.fixtureId];
        if (last && last !== game.status) sendStatusNotification(game, preferences);
        previousStatus.current[game.fixtureId] = game.status;
      });
    } else {
      nextFeeds.flatMap(feed => feed.games).forEach(game => { previousStatus.current[game.fixtureId] = game.status; });
    }
    setFeeds(nextFeeds);
  }

  async function initialise() {
    setLoading(true);
    setNotice("");
    try {
      await loadTeams();
      await loadFeed(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { initialise(); }, []);

  useEffect(() => {
    if (!preferences.enabled) return;
    const interval = window.setInterval(() => loadFeed(true).catch(() => undefined), 180000);
    return () => window.clearInterval(interval);
  }, [preferences.enabled, preferences.gameStart, preferences.halfTime, preferences.fullTime]);

  const available = useMemo(() => {
    const query = search.trim().toLowerCase();
    const savedIds = new Set(selected.map(item => item.teamId));
    return teams
      .filter(team => !savedIds.has(team.id))
      .filter(team => !query || `${team.name} ${team.league} ${team.country}`.toLowerCase().includes(query))
      .slice(0, 12);
  }, [search, selected]);

  async function addTeam(team: Team) {
    const response = await fetch("/api/favorite-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ teamId: team.id, name: team.name, logo: team.logo, league: team.league }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setNotice(data.error || "Não foi possível adicionar."); return; }
    setSelected(data.teams || []);
    setSearch("");
    await loadFeed(false);
  }

  async function removeTeam(teamId: number) {
    const response = await fetch(`/api/favorite-teams/${teamId}`, { method: "DELETE", headers: authHeaders() });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setSelected(data.teams || []);
      await loadFeed(false);
    }
  }

  async function requestAlerts() {
    setNotice("");
    if (!("Notification" in window)) {
      setNotice("Este navegador não suporta notificações.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setNotice("Permissão de notificações não autorizada.");
      return;
    }
    await savePreferences({ ...preferences, enabled: true });
    new Notification("ANALYSE PRO 2.0", { body: "Alertas dos seus times foram ativados.", icon: "/favicon.png" });
  }

  async function savePreferences(next: Preference) {
    const response = await fetch("/api/alert-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(next),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) setPreferences(data.preferences);
  }

  return (
    <PremiumAppShell>
      <div className="space-y-5">
        <GlassCard className="p-6 md:p-8">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-yellow-400">Personalização</p>
          <div className="mt-2 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-4xl font-black md:text-5xl">Meus Times</h1>
              <p className="mt-3 text-slate-400">Acompanhe os próximos jogos dos clubes escolhidos e receba alertas no app.</p>
            </div>
            <button onClick={() => loadFeed(false)} className="inline-flex items-center gap-2 rounded-xl border border-yellow-400/30 px-5 py-3 font-black text-yellow-300 hover:bg-yellow-400/10">
              <RefreshCcw className="h-4 w-4" /> Atualizar
            </button>
          </div>
        </GlassCard>

        {notice ? <GlassCard className="border-yellow-400/25 p-4 text-sm font-bold text-yellow-200">{notice}</GlassCard> : null}

        <div className="grid gap-5 xl:grid-cols-[1fr_390px]">
          <div className="space-y-5">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">Times selecionados</h2>
                <p className="text-sm font-bold text-yellow-400">{selected.length}/10</p>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {selected.length ? selected.map(team => (
                  <div key={team.teamId} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] p-3">
                    <div className="flex items-center gap-3">
                      <img src={team.logo || "/favicon.png"} className="h-10 w-10 object-contain" alt={team.name} />
                      <div><p className="font-black">{team.name}</p><p className="text-xs text-slate-400">{team.league}</p></div>
                    </div>
                    <button onClick={() => removeTeam(team.teamId)} className="rounded-lg p-2 text-red-300 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                )) : <p className="text-sm text-slate-400">Escolha pelo menos um time abaixo.</p>}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h2 className="text-xl font-black">Adicionar time</h2>
              <label className="relative mt-4 block">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar clube ou competição" className="w-full rounded-xl border border-white/10 bg-black/35 py-3 pl-11 pr-4 text-white outline-none focus:border-yellow-400" />
              </label>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {available.map(team => (
                  <button key={team.id} onClick={() => addTeam(team)} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] p-3 text-left hover:border-yellow-400/35">
                    <div className="flex items-center gap-3">
                      <img src={team.logo} className="h-9 w-9 object-contain" alt={team.name} />
                      <div><p className="font-bold">{team.name}</p><p className="text-xs text-slate-500">{team.league}</p></div>
                    </div>
                    <Plus className="h-4 w-4 text-yellow-400" />
                  </button>
                ))}
              </div>
            </GlassCard>
          </div>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3">
              <BellRing className="h-7 w-7 text-yellow-400" />
              <h2 className="text-xl font-black">Alertas</h2>
            </div>
            <p className="mt-3 text-sm text-slate-400">Receba notificações enquanto o site/app estiver aberto.</p>
            <button onClick={requestAlerts} className="mt-5 w-full rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 py-3 font-black text-black">
              {preferences.enabled ? "Alertas ativos" : "Ativar notificações"}
            </button>
            <div className="mt-5 space-y-3">
              <Toggle label="Início do jogo" checked={preferences.gameStart} onChange={value => savePreferences({ ...preferences, gameStart: value })} />
              <Toggle label="Intervalo" checked={preferences.halfTime} onChange={value => savePreferences({ ...preferences, halfTime: value })} />
              <Toggle label="Fim do jogo" checked={preferences.fullTime} onChange={value => savePreferences({ ...preferences, fullTime: value })} />
            </div>
            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-slate-400">
              <Smartphone className="mb-2 h-5 w-5 text-yellow-400" />
              Instale o site como app para acesso rápido no telemóvel.
            </div>
          </GlassCard>
        </div>

        <GlassCard className="p-6">
          <div className="flex items-center gap-3"><CalendarDays className="h-6 w-6 text-yellow-400" /><h2 className="text-xl font-black">Próximos jogos dos seus times</h2></div>
          <div className="mt-5 space-y-3">
            {feeds.flatMap(feed => feed.games).length ? feeds.flatMap(feed => feed.games).map(game => (
              <div key={game.fixtureId} className="grid items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[120px_1fr_120px]">
                <div><p className="text-xs text-slate-400">{game.league}</p><p className="font-black text-yellow-400">{game.time}</p></div>
                <p className="font-black">{game.home} <span className="mx-2 text-yellow-400">x</span> {game.away}</p>
                <span className="rounded-lg border border-white/10 px-3 py-2 text-center text-xs font-bold text-slate-300">{game.status || "Agendado"}</span>
              </div>
            )) : <p className="rounded-xl border border-white/10 p-6 text-center text-slate-400">{loading ? "Carregando..." : "Nenhum próximo jogo encontrado para os times salvos."}</p>}
          </div>
        </GlassCard>
      </div>
    </PremiumAppShell>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
      <span className="text-sm font-bold">{label}</span>
      <button type="button" onClick={() => onChange(!checked)} className={`flex h-6 w-11 items-center rounded-full p-1 transition ${checked ? "bg-yellow-400" : "bg-white/15"}`}>
        <span className={`h-4 w-4 rounded-full bg-black transition ${checked ? "translate-x-5" : ""}`} />
      </button>
    </label>
  );
}

function sendStatusNotification(game: Game, preferences: Preference) {
  const status = String(game.status || "").toUpperCase();
  const started = ["1H", "LIVE"].includes(status) && preferences.gameStart;
  const half = status === "HT" && preferences.halfTime;
  const ended = ["FT", "AET", "PEN"].includes(status) && preferences.fullTime;
  if (!started && !half && !ended) return;
  const label = ended ? "Jogo encerrado" : half ? "Intervalo" : "Jogo iniciado";
  new Notification(`${label}: ${game.home} x ${game.away}`, {
    body: game.league,
    icon: "/favicon.png",
    tag: `${game.fixtureId}-${status}`,
  });
}
