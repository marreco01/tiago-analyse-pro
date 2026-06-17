import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  CalendarDays,
  Database,
  EyeOff,
  Flag,
  Goal,
  Layers3,
  Newspaper,
  Play,
  ShieldCheck,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import { authHeaders, getCurrentUser, isAdminUser } from "@/lib/localAuth";

type RobotStatus = {
  id: string;
  name: string;
  status: "online" | "running" | "error" | "planejado";
  intervalMinutes: number;
  sources: string[];
  lastRunAt?: string;
  nextRunAt?: string;
  totalItems: number;
  lastError?: string;
};

type RobotModule = { id: string; label: string; area: string };
type RobotGroup = { id: string; title: string; description: string; modules: RobotModule[] };
type RobotArchitecture = {
  version: string;
  strategy: string;
  championships: RobotGroup[];
  analysisAreas: RobotGroup[];
};
type RobotLog = { id: string; robot: string; level: "info" | "success" | "error"; message: string; createdAt: string; totalItems?: number };

type RobotsPayload = {
  success: boolean;
  robots?: RobotStatus[];
  logs?: RobotLog[];
  architecture?: RobotArchitecture;
  error?: string;
};

function brDate(value?: string) {
  if (!value) return "Aguardando";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Aguardando";
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status?: RobotStatus["status"]) {
  if (status === "online") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  if (status === "running") return "border-yellow-400/30 bg-yellow-400/10 text-yellow-200";
  if (status === "error") return "border-red-400/30 bg-red-500/10 text-red-200";
  return "border-slate-500/30 bg-slate-500/10 text-slate-300";
}

function statusLabel(status?: RobotStatus["status"]) {
  if (status === "online") return "Online";
  if (status === "running") return "Executando";
  if (status === "error") return "Erro";
  return "Aguardando";
}

function iconForGroup(id: string) {
  if (id.includes("brasileirao")) return Trophy;
  if (id.includes("copa")) return Flag;
  if (id.includes("calendario")) return CalendarDays;
  if (id.includes("mercados")) return Target;
  if (id.includes("tempo")) return Zap;
  if (id.includes("identidade")) return ShieldCheck;
  if (id.includes("conteudo")) return Newspaper;
  return Layers3;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

export default function AdminRobots() {
  const admin = isAdminUser(getCurrentUser());
  const [robots, setRobots] = useState<RobotStatus[]>([]);
  const [logs, setLogs] = useState<RobotLog[]>([]);
  const [architecture, setArchitecture] = useState<RobotArchitecture | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const robotById = useMemo(() => {
    const map = new Map<string, RobotStatus>();
    for (const robot of robots) map.set(robot.id, robot);
    map.set("master", robots.find((r) => r.id === "master-search") || ({} as RobotStatus));
    map.set("calendario", robots.find((r) => r.id === "calendar-master") || ({} as RobotStatus));
    map.set("proximos", robots.find((r) => r.id === "proximos") || ({} as RobotStatus));
    map.set("ao-vivo", robots.find((r) => r.id === "ao-vivo") || ({} as RobotStatus));
    map.set("brasileirao-classificacao", robots.find((r) => r.id === "brasileirao-table") || ({} as RobotStatus));
    map.set("brasileirao-escudos", robots.find((r) => r.id === "brasileirao-logos") || ({} as RobotStatus));
    map.set("copa", robots.find((r) => r.id === "copa") || ({} as RobotStatus));
    return map;
  }, [robots]);

  const activeCount = robots.filter((robot) => robot.status !== "planejado").length;
  const errorCount = robots.filter((robot) => robot.status === "error").length;
  const totalItems = robots.reduce((sum, robot) => sum + (robot.totalItems || 0), 0);

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const [robotsResponse, architectureResponse] = await Promise.all([
        fetch("/api/admin/robots", { headers: authHeaders(), cache: "no-store" }),
        fetch("/api/admin/robots/architecture", { headers: authHeaders(), cache: "no-store" }),
      ]);
      const robotsData: RobotsPayload = await robotsResponse.json().catch(() => ({ success: false }));
      const architectureData: RobotsPayload = await architectureResponse.json().catch(() => ({ success: false }));
      if (!robotsResponse.ok || !robotsData.success) throw new Error(robotsData.error || "Erro ao carregar robôs.");
      setRobots(robotsData.robots || []);
      setLogs(robotsData.logs || []);
      setArchitecture(architectureData.architecture || null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao carregar robôs.");
    } finally {
      setLoading(false);
    }
  }

  async function runGroup(kind: "championship" | "analysis-area", group: RobotGroup) {
    setMessage(`Executando ${group.title}...`);
    const response = await fetch(`/api/admin/robots/${kind}/${group.id}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      setMessage(data.error || `Erro ao executar ${group.title}.`);
      return;
    }
    const failed = data.data?.modules?.filter((item: any) => !item.success)?.length || 0;
    setMessage(failed ? `${group.title} executado com ${failed} falha(s).` : data.message || `${group.title} executado.`);
    await load();
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, []);

  if (!admin) {
    return (
      <PremiumAppShell>
        <GlassCard className="p-8 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-red-300" />
          <h1 className="mt-4 text-3xl font-black text-white">Acesso restrito</h1>
          <p className="mt-2 text-slate-400">Esta central é exclusiva do administrador.</p>
        </GlassCard>
      </PremiumAppShell>
    );
  }

  return (
    <PremiumAppShell>
      <div className="space-y-5">
        <GlassCard className="p-6 md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-yellow-300">
                <EyeOff className="h-4 w-4" /> Privado Admin • V42
              </div>
              <h1 className="mt-4 text-3xl font-black text-white md:text-5xl">Robôs por Campeonato e Área</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
                Os robôs soltos foram reorganizados em pipelines. Agora cada campeonato e cada área de análise executa a busca master certa, sem ficar misturando fonte de um módulo com outro.
              </p>
            </div>
            <button onClick={load} className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-white hover:border-yellow-400/40">
              Atualizar painel
            </button>
          </div>
        </GlassCard>

        {message ? <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm font-bold text-yellow-100">{message}</div> : null}

        <section className="grid gap-4 md:grid-cols-4">
          <GlassCard className="p-5"><Bot className="h-7 w-7 text-yellow-400" /><p className="mt-3 text-sm font-bold text-slate-400">Pipelines ativos</p><p className="mt-1 text-4xl font-black text-white">{activeCount}</p></GlassCard>
          <GlassCard className="p-5"><Database className="h-7 w-7 text-emerald-300" /><p className="mt-3 text-sm font-bold text-slate-400">Itens em cache</p><p className="mt-1 text-4xl font-black text-white">{totalItems}</p></GlassCard>
          <GlassCard className="p-5"><Activity className="h-7 w-7 text-cyan-300" /><p className="mt-3 text-sm font-bold text-slate-400">Arquitetura</p><p className="mt-1 text-4xl font-black text-white">{architecture?.version || "--"}</p></GlassCard>
          <GlassCard className="p-5"><ShieldCheck className="h-7 w-7 text-red-300" /><p className="mt-3 text-sm font-bold text-slate-400">Falhas</p><p className="mt-1 text-4xl font-black text-white">{errorCount}</p></GlassCard>
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-300">Campeonatos</p>
            <h2 className="mt-1 text-2xl font-black text-white">Pipelines por campeonato</h2>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {(architecture?.championships || []).map((group) => (
              <GroupCard key={group.id} group={group} robotById={robotById} onRun={() => runGroup("championship", group)} />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-300">Áreas de análise</p>
            <h2 className="mt-1 text-2xl font-black text-white">Pipelines por função</h2>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {(architecture?.analysisAreas || []).map((group) => (
              <GroupCard key={group.id} group={group} robotById={robotById} onRun={() => runGroup("analysis-area", group)} />
            ))}
          </div>
        </section>

        <GlassCard className="p-5">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-yellow-300" />
            <h2 className="text-xl font-black text-white">Últimos logs</h2>
          </div>
          <div className="mt-4 space-y-3">
            {logs.slice(0, 8).map((log) => (
              <div key={log.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black text-white">{log.robot}</p>
                  <p className="text-xs font-bold text-slate-500">{brDate(log.createdAt)}</p>
                </div>
                <p className="mt-1 text-sm font-bold text-slate-300">{log.message}</p>
              </div>
            ))}
            {!logs.length && !loading ? <p className="text-sm font-bold text-slate-400">Nenhum log encontrado.</p> : null}
          </div>
        </GlassCard>
      </div>
    </PremiumAppShell>
  );
}

function GroupCard({ group, robotById, onRun }: { group: RobotGroup; robotById: Map<string, RobotStatus>; onRun: () => void }) {
  const Icon = iconForGroup(group.id);
  const modulesWithStatus = group.modules.map((module) => ({ module, status: robotById.get(module.id) }));
  const lastRun = modulesWithStatus
    .map((item) => item.status?.lastRunAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  const totalItems = modulesWithStatus.reduce((sum, item) => sum + (item.status?.totalItems || 0), 0);
  const hasError = modulesWithStatus.some((item) => item.status?.status === "error");

  return (
    <GlassCard className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10">
            <Icon className="h-6 w-6 text-yellow-300" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">{group.title}</h3>
            <p className="mt-1 text-sm font-bold leading-relaxed text-slate-400">{group.description}</p>
          </div>
        </div>
        <button onClick={onRun} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-black text-black hover:bg-yellow-300">
          <Play className="h-4 w-4" /> Executar pipeline
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Módulos" value={group.modules.length} />
        <Metric label="Última busca" value={brDate(lastRun)} />
        <Metric label="Itens" value={totalItems} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {modulesWithStatus.map(({ module, status }) => (
          <span key={module.id} className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase ${statusClass(status?.status)}`}>
            {module.label} • {statusLabel(status?.status)}
          </span>
        ))}
      </div>

      {hasError ? <p className="mt-3 text-sm font-bold text-red-200">Existe módulo com erro neste pipeline. Execute e verifique os logs.</p> : null}
    </GlassCard>
  );
}
