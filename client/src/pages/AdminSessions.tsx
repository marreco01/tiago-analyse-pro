import { useEffect, useState } from "react";
import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import { authHeaders } from "@/lib/localAuth";
import { Button } from "@/components/ui/button";
import { MonitorSmartphone, RefreshCw, ShieldAlert, LogOut } from "lucide-react";

type SessionRow = {
  token: string;
  userId: string;
  userName: string;
  email: string;
  role: "user" | "admin";
  plan: string;
  ip: string;
  device: string;
  browser: string;
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
};

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

export default function AdminSessions() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/sessions", { headers: authHeaders(), cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      setSessions(data.sessions || []);
      setUpdatedAt(data.updatedAt || new Date().toISOString());
    } finally {
      setLoading(false);
    }
  }

  async function forceLogout(token: string, email: string) {
    const ok = window.confirm(`Encerrar a sessão de ${email}?`);
    if (!ok) return;
    const response = await fetch("/api/admin/sessions/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ token }),
    });
    const data = await response.json().catch(() => ({}));
    setSessions(data.sessions || []);
    setUpdatedAt(data.updatedAt || new Date().toISOString());
    setStatus(data.ok ? "Sessão encerrada com sucesso." : "Sessão não encontrada ou já encerrada.");
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const userSessions = sessions.filter((item) => item.role !== "admin");
  const adminSessions = sessions.filter((item) => item.role === "admin");

  return (
    <PremiumAppShell>
      <div className="space-y-5">
        <GlassCard className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-400">Administração</p>
              <h1 className="mt-2 text-4xl font-black text-white md:text-5xl">Sessões ativas</h1>
              <p className="mt-2 text-slate-400">Controle profissional: 1 conta = 1 dispositivo ativo. Admin sem limite.</p>
              <p className="mt-2 text-xs text-slate-500">Última atualização: {updatedAt ? formatDate(updatedAt) : "-"}</p>
            </div>
            <Button onClick={load} disabled={loading} className="bg-yellow-400 font-black text-black hover:bg-yellow-300">
              <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
            </Button>
          </div>
          {status ? <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm font-bold text-green-300">{status}</div> : null}
        </GlassCard>

        <div className="grid gap-4 md:grid-cols-3">
          <GlassCard className="p-5"><MonitorSmartphone className="mb-3 h-7 w-7 text-yellow-400" /><p className="text-sm text-slate-400">Sessões de usuários</p><p className="text-3xl font-black text-white">{userSessions.length}</p></GlassCard>
          <GlassCard className="p-5"><ShieldAlert className="mb-3 h-7 w-7 text-green-400" /><p className="text-sm text-slate-400">Sessões admin</p><p className="text-3xl font-black text-white">{adminSessions.length}</p></GlassCard>
          <GlassCard className="p-5"><LogOut className="mb-3 h-7 w-7 text-red-400" /><p className="text-sm text-slate-400">Regra ativa</p><p className="text-3xl font-black text-white">1 por conta</p></GlassCard>
        </div>

        <GlassCard className="overflow-hidden p-0">
          <div className="border-b border-white/10 p-5">
            <h2 className="text-xl font-black text-white">Dispositivos conectados</h2>
            <p className="text-sm text-slate-400">Quando o mesmo usuário entra noutro dispositivo, a sessão antiga é derrubada automaticamente.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="p-4">Usuário</th>
                  <th className="p-4">Plano</th>
                  <th className="p-4">IP</th>
                  <th className="p-4">Dispositivo</th>
                  <th className="p-4">Navegador</th>
                  <th className="p-4">Última atividade</th>
                  <th className="p-4">Ação</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.token} className="border-t border-white/10 text-slate-200">
                    <td className="p-4"><div className="font-black text-white">{session.userName}</div><div className="text-xs text-slate-500">{session.email}</div></td>
                    <td className="p-4"><span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-black text-yellow-300">{session.role === "admin" ? "ADMIN" : session.plan}</span></td>
                    <td className="p-4 font-mono text-xs">{session.ip || "-"}</td>
                    <td className="p-4">{session.device || "-"}</td>
                    <td className="p-4">{session.browser || "-"}</td>
                    <td className="p-4">{formatDate(session.lastActivity)}</td>
                    <td className="p-4">
                      <Button onClick={() => forceLogout(session.token, session.email)} variant="destructive" size="sm" disabled={session.role === "admin"}>
                        Encerrar
                      </Button>
                    </td>
                  </tr>
                ))}
                {!sessions.length ? <tr><td colSpan={7} className="p-8 text-center text-slate-400">Nenhuma sessão ativa agora.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </PremiumAppShell>
  );
}
