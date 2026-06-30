import { useEffect, useState, type ReactNode } from "react";
import { Activity, AlertTriangle, CheckCircle2, Database, RefreshCcw, ShieldCheck, Zap } from "lucide-react";
import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import { authHeaders } from "@/lib/localAuth";

type Endpoint = {
  endpoint: string;
  calls: number;
  cacheHits: number;
  blocked: number;
  lastCalledAt?: string;
};

type Usage = {
  utcDate: string;
  dailyLimit: number;
  safetyLimit: number;
  essentialReserve: number;
  perMinuteLimit: number;
  used: number;
  remaining: number;
  remainingForStandard: number;
  percentUsed: number;
  warningLevel: "safe" | "warning" | "danger" | "critical";
  nonEssentialPaused: boolean;
  callsSentByServer: number;
  cacheHits: number;
  blockedRequests: number;
  lastCalledAt?: string;
  lastResetAt?: string;
  lastResetReason?: string;
  resetAtBrazil?: string;
  topEndpoints: Endpoint[];
};

export default function AdminApiStatus() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStatus() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/api-usage", { headers: authHeaders(), cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.usage) throw new Error(data.error || "Não foi possível carregar o consumo da API.");
      setUsage(data.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar o painel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
    const interval = window.setInterval(loadStatus, 60000);
    return () => window.clearInterval(interval);
  }, []);

  const percent = Math.min(100, usage?.percentUsed || 0);
  const barClass = usage?.warningLevel === "critical"
    ? "from-red-500 to-red-400"
    : usage?.warningLevel === "danger"
      ? "from-orange-500 to-red-500"
      : usage?.warningLevel === "warning"
        ? "from-yellow-400 to-orange-500"
        : "from-green-400 to-yellow-400";

  return (
    <PremiumAppShell>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-yellow-400">Proteção de quota</p>
            <h1 className="mt-2 text-4xl font-black md:text-5xl">Controle da API-Football</h1>
            <p className="mt-3 max-w-3xl text-slate-400">Monitoramento diário do plano Mega, cache e reserva para jogos ao vivo.</p>
          </div>
          <button onClick={loadStatus} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-5 py-3 font-black text-yellow-300 hover:bg-yellow-400/20 disabled:opacity-50">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>

        {error ? <GlassCard className="border-red-400/25 p-5 text-red-200">{error}</GlassCard> : null}

        {usage ? (
          <>
            <GlassCard className="p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="flex items-center gap-3">
                  {usage.nonEssentialPaused ? <AlertTriangle className="h-8 w-8 text-red-400" /> : <CheckCircle2 className="h-8 w-8 text-green-400" />}
                  <div>
                    <p className="text-sm font-bold text-slate-400">Consumo diário</p>
                    <p className="text-3xl font-black">{format(usage.used)} <span className="text-base text-slate-400">/ {format(usage.dailyLimit)}</span></p>
                  </div>
                </div>
                <div className={`rounded-xl border px-4 py-3 text-sm font-black ${usage.nonEssentialPaused ? "border-red-400/25 bg-red-500/10 text-red-300" : "border-green-400/25 bg-green-500/10 text-green-300"}`}>
                  {usage.nonEssentialPaused ? "RESERVA ATIVADA — SOMENTE ESSENCIAIS" : "PROTEÇÃO ATIVA"}
                </div>
              </div>
              <div className="mt-6 h-4 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full bg-gradient-to-r ${barClass}`} style={{ width: `${percent}%` }} />
              </div>
              <div className="mt-3 flex justify-between text-sm text-slate-400">
                <span>{usage.percentUsed}% utilizado</span>
                <span>{format(usage.remaining)} chamadas restantes</span>
              </div>
            </GlassCard>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={<ShieldCheck />} title="Limite seguro" value={format(usage.safetyLimit)} note="Após isto, preserva ao vivo" />
              <StatCard icon={<Activity />} title="Reserva essencial" value={format(usage.essentialReserve)} note="Jogos ao vivo" />
              <StatCard icon={<Database />} title="Cache economizou" value={format(usage.cacheHits)} note="Chamadas evitadas" />
              <StatCard icon={<Zap />} title="Bloqueadas" value={format(usage.blockedRequests)} note="Proteção acionada" />
            </div>

            <GlassCard className="p-6">
              <h2 className="text-xl font-black">Regras de segurança aplicadas</h2>
              <div className="mt-5 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
                <Rule text={`Máximo diário configurado: ${format(usage.dailyLimit)} chamadas.`} />
                <Rule text={`Consultas comuns param ao chegar em ${format(usage.safetyLimit)}.`} />
                <Rule text={`Reserva de ${format(usage.essentialReserve)} para funções essenciais.`} />
                <Rule text={`Proteção de velocidade: ${format(usage.perMinuteLimit)} chamadas/minuto.`} />
                <Rule text={`Próximo reset automático: ${usage.resetAtBrazil || "00:00 no horário de Brasília"}.`} />
                <Rule text={`Último reset: ${usage.lastResetAt ? new Date(usage.lastResetAt).toLocaleString("pt-BR") : "ainda não registado"}.`} />
                <Rule text="Limites por utilizador: FREE 10 • PRO 80 • VIP 200 • SÓCIO VIP 500 análises/dia." />
              </div>
            </GlassCard>

            <GlassCard className="overflow-hidden p-6">
              <h2 className="text-xl font-black">Consumo por endpoint</h2>
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-slate-400">
                    <tr className="border-b border-white/10">
                      <th className="pb-3 pr-4">Endpoint</th>
                      <th className="pb-3 pr-4">Chamadas</th>
                      <th className="pb-3 pr-4">Cache</th>
                      <th className="pb-3">Bloqueios</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.topEndpoints.map((row) => (
                      <tr key={row.endpoint} className="border-b border-white/[0.06]">
                        <td className="py-3 pr-4 font-bold text-white">{row.endpoint}</td>
                        <td className="py-3 pr-4 text-yellow-400">{format(row.calls)}</td>
                        <td className="py-3 pr-4 text-green-400">{format(row.cacheHits)}</td>
                        <td className="py-3 text-red-300">{format(row.blocked)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!usage.topEndpoints.length ? <p className="py-7 text-center text-slate-400">Nenhuma chamada registada hoje.</p> : null}
              </div>
            </GlassCard>

            <p className="text-sm text-slate-500">Contagem diária com reset automático à meia-noite no horário de Brasília. Para manter o histórico após deploys, configure volume persistente no Railway usando a pasta DATA_DIR.</p>
          </>
        ) : loading ? (
          <GlassCard className="p-10 text-center text-slate-400">Carregando consumo...</GlassCard>
        ) : null}
      </div>
    </PremiumAppShell>
  );
}

function StatCard({ icon, title, value, note }: { icon: ReactNode; title: string; value: string; note: string }) {
  return (
    <GlassCard className="p-5">
      <div className="text-yellow-400">{icon}</div>
      <p className="mt-3 text-sm font-bold text-slate-400">{title}</p>
      <p className="mt-1 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </GlassCard>
  );
}

function Rule({ text }: { text: string }) {
  return <p className="rounded-xl border border-white/10 bg-white/[0.035] p-4">{text}</p>;
}

function format(value: number) {
  return Number(value || 0).toLocaleString("pt-BR");
}
