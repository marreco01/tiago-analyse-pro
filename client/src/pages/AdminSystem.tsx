import { useEffect, useState } from "react";
import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import { authHeaders } from "@/lib/localAuth";
import { Activity, MousePointerClick, Settings, Trash2, UserPlus, Users, Wifi } from "lucide-react";

type ClickEvent = {
  id: string;
  ip: string;
  path: string;
  label?: string;
  userAgent?: string;
  referrer?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  country?: string;
  region?: string;
  city?: string;
  isp?: string;
  createdAt: string;
};

type TopIp = {
  ip: string;
  clicks: number;
  lastPath: string;
  lastClickAt: string;
  city?: string;
  region?: string;
  country?: string;
  isp?: string;
  source?: string;
};

type Analytics = {
  totalClicks: number;
  clicksToday: number;
  uniqueIps: number;
  signupsTotal: number;
  signupsToday: number;
  lastClicks: ClickEvent[];
  topIps: TopIp[];
  sources: { source: string; clicks: number }[];
  lastReset?: { createdAt: string; adminEmail?: string; ip?: string; note?: string } | null;
};

const emptyAnalytics: Analytics = {
  totalClicks: 0,
  clicksToday: 0,
  uniqueIps: 0,
  signupsTotal: 0,
  signupsToday: 0,
  lastClicks: [],
  topIps: [],
  sources: [],
  lastReset: null,
};


function formatDateTime(value?: string) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDate(value?: string) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function StatCard({ title, value, icon: Icon, subtitle }: { title: string; value: number; icon: any; subtitle: string }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{title}</p>
          <p className="mt-2 text-4xl font-black text-white">{value}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-yellow-400/25 bg-yellow-400/10 p-3 text-yellow-300">
          <Icon className="h-7 w-7" />
        </div>
      </div>
    </GlassCard>
  );
}

export default function AdminSystem() {
  const [analytics, setAnalytics] = useState<Analytics>(emptyAnalytics);
  const [status, setStatus] = useState("Carregando contadores...");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [resetting, setResetting] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/analytics", { headers: authHeaders(), cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(data.error || "Erro ao carregar contadores.");
      return;
    }
    const now = data.serverUpdatedAt || new Date().toISOString();
    setAnalytics({ ...emptyAnalytics, ...(data.analytics || {}) });
    setLastUpdatedAt(now);
    setStatus(`Última atualização: ${formatDateTime(now)}`);
  }


  async function resetCounters() {
    const confirmed = window.confirm("ATENÇÃO! Deseja realmente zerar o contador de cliques? Esta ação apaga somente as estatísticas de acessos e não apaga usuários, pagamentos ou análises.");
    if (!confirmed) return;
    setResetting(true);
    setStatus("Zerando contador...");
    try {
      const response = await fetch("/api/admin/analytics/reset", { method: "POST", headers: authHeaders(), cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(data.error || "Erro ao zerar contador.");
        return;
      }
      const now = data.serverUpdatedAt || new Date().toISOString();
      setAnalytics({ ...emptyAnalytics, ...(data.analytics || {}) });
      setLastUpdatedAt(now);
      setStatus(`Contador zerado com sucesso. Última atualização: ${formatDateTime(now)}`);
    } catch {
      setStatus("Erro ao zerar contador.");
    } finally {
      setResetting(false);
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <PremiumAppShell>
      <div className="space-y-5">
        <GlassCard className="p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-400">Sistema</p>
              <h1 className="mt-2 text-4xl font-black md:text-5xl">Contador de cliques e inscrições</h1>
              <p className="mt-3 max-w-3xl text-slate-400">Acompanhe cliques reais do site, origem do tráfego, cidade aproximada por IP e novos cadastros. A área ADM não entra na contagem.</p>
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <div className="flex flex-wrap gap-2 md:justify-end">
                <button onClick={load} className="rounded-xl bg-yellow-400 px-5 py-3 font-black text-black hover:bg-yellow-300">
                  <Activity className="mr-2 inline h-4 w-4" /> Atualizar
                </button>
                <button onClick={resetCounters} disabled={resetting} className="rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-3 font-black text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60">
                  <Trash2 className="mr-2 inline h-4 w-4" /> {resetting ? "Zerando..." : "Zerar contador"}
                </button>
              </div>
              {lastUpdatedAt ? <span className="text-xs font-bold text-slate-500">Última atualização: {formatDateTime(lastUpdatedAt)}</span> : null}
              {analytics.lastReset?.createdAt ? <span className="text-xs font-bold text-red-300/80">Último reset: {formatDateTime(analytics.lastReset.createdAt)}</span> : null}
            </div>
          </div>
          {status ? <p className="mt-4 text-sm font-bold text-slate-400">{status}</p> : null}
        </GlassCard>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Cliques totais" value={analytics.totalClicks} icon={MousePointerClick} subtitle="Todos os cliques capturados" />
          <StatCard title="Cliques hoje" value={analytics.clicksToday} icon={Activity} subtitle="Contagem do dia atual" />
          <StatCard title="IPs únicos" value={analytics.uniqueIps} icon={Wifi} subtitle="Visitantes por IP" />
          <StatCard title="Inscrições" value={analytics.signupsTotal} icon={Users} subtitle="Cadastros totais" />
          <StatCard title="Inscrições hoje" value={analytics.signupsToday} icon={UserPlus} subtitle="Novos cadastros do dia" />
        </div>

        <GlassCard className="overflow-hidden">
          <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
            <h2 className="text-xl font-black text-white"><Activity className="mr-2 inline h-5 w-5 text-yellow-400" />Origem dos cliques</h2>
          </div>
          <div className="grid gap-3 p-5 md:grid-cols-3 xl:grid-cols-6">
            {(analytics.sources || []).length ? analytics.sources.map((item) => (
              <div key={item.source} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="truncate text-xs font-black uppercase tracking-[0.18em] text-slate-400">{item.source}</p>
                <p className="mt-2 text-3xl font-black text-yellow-400">{item.clicks}</p>
              </div>
            )) : <p className="text-sm text-slate-400">Ainda sem origem registrada.</p>}
          </div>
        </GlassCard>

        <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
          <GlassCard className="overflow-hidden">
            <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
              <h2 className="text-xl font-black text-white"><Wifi className="mr-2 inline h-5 w-5 text-yellow-400" />IPs com mais cliques</h2>
            </div>
            <div className="divide-y divide-white/10">
              {analytics.topIps.length ? analytics.topIps.map((item) => (
                <div key={item.ip} className="grid grid-cols-[1fr_80px] gap-3 px-5 py-4 text-sm">
                  <div>
                    <p className="font-black text-white">{item.ip}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{item.city || "Cidade não detectada"}{item.region ? ` / ${item.region}` : ""}{item.country ? ` - ${item.country}` : ""}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">Origem: {item.source || "Direto"} | Provedor: {item.isp || "-"}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">Última página: {item.lastPath}</p>
                    <p className="mt-1 text-xs text-slate-500">Último clique: {formatDate(item.lastClickAt)}</p>
                  </div>
                  <p className="text-right text-2xl font-black text-yellow-400">{item.clicks}</p>
                </div>
              )) : <p className="p-5 text-sm text-slate-400">Ainda não há cliques registrados.</p>}
            </div>
          </GlassCard>

          <GlassCard className="overflow-hidden">
            <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
              <h2 className="text-xl font-black text-white"><Settings className="mr-2 inline h-5 w-5 text-yellow-400" />Últimos cliques</h2>
            </div>
            <div className="divide-y divide-white/10">
              {analytics.lastClicks.length ? analytics.lastClicks.map((click) => (
                <div key={click.id} className="grid gap-2 px-5 py-4 text-sm md:grid-cols-[130px_1fr_170px]">
                  <span className="font-black text-yellow-400">{click.ip}</span>
                  <span className="min-w-0 truncate text-slate-300">{click.label || "clique"} — {click.path} | {click.source || "Direto"}{click.city ? ` | ${click.city}` : ""}</span>
                  <span className="text-right text-slate-500">{formatDate(click.createdAt)}</span>
                </div>
              )) : <p className="p-5 text-sm text-slate-400">Nenhum clique ainda.</p>}
            </div>
          </GlassCard>
        </div>
      </div>
    </PremiumAppShell>
  );
}
