import { useEffect, useState } from "react";
import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import { authHeaders } from "@/lib/localAuth";
import { Shield, UserCheck, UserCog } from "lucide-react";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  plan: "FREE" | "PRO" | "VIP" | "Grátis";
  membership?: "FREE" | "PRO" | "VIP" | "SOCIO_VIP";
  role?: "user" | "admin";
  status?: string;
  planExpiresAt?: string;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [status, setStatus] = useState("");

  async function load() {
    const response = await fetch("/api/admin/overview", { headers: authHeaders() });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(data.error || "Erro ao carregar usuários.");
      return;
    }
    setUsers(Array.isArray(data.users) ? data.users : []);
  }

  async function changePlan(id: string, plan: "FREE" | "PRO" | "VIP" | "SOCIO_VIP") {
    setStatus("");
    const response = await fetch(`/api/admin/users/${id}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ plan }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(data.error || "Erro ao alterar plano.");
      return;
    }
    setStatus(`Plano atualizado para ${plan}.`);
    load();
  }

  useEffect(() => { load(); }, []);

  return (
    <PremiumAppShell>
      <div className="space-y-5">
        <GlassCard className="p-6 md:p-8">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-400">Administração</p>
          <h1 className="mt-2 text-4xl font-black md:text-5xl">Usuários e acessos</h1>
          <p className="mt-3 max-w-3xl text-slate-400">Aprove, altere ou rebaixe planos manualmente. Quando um pagamento for aprovado, o usuário também é liberado automaticamente.</p>
        </GlassCard>

        {status ? <div className="rounded-2xl border border-yellow-400/25 bg-yellow-400/10 p-4 font-bold text-yellow-200">{status}</div> : null}

        <GlassCard className="overflow-hidden">
          <div className="grid grid-cols-[1.2fr_1.6fr_100px_100px_230px] gap-4 border-b border-white/10 bg-white/[0.03] px-5 py-4 text-xs font-black uppercase text-slate-400">
            <span>Nome</span><span>Email</span><span>Plano</span><span>Perfil</span><span>Ações</span>
          </div>
          {users.map((user) => (
            <div key={user.id} className="grid grid-cols-[1.2fr_1.6fr_100px_100px_230px] gap-4 border-b border-white/10 px-5 py-4 text-sm">
              <span className="font-black text-white"><UserCog className="mr-2 inline h-4 w-4 text-yellow-400" />{user.name}</span>
              <span className="text-slate-300">{user.email}</span>
              <span className="font-black text-yellow-400">{user.membership === "SOCIO_VIP" ? "SÓCIO VIP" : String(user.plan).replace("Grátis", "FREE")}</span>
              <span className="text-slate-300">{user.role === "admin" ? <><Shield className="mr-1 inline h-4 w-4 text-yellow-400" />Admin</> : "Cliente"}</span>
              <div className="flex flex-wrap gap-2">
                {(["FREE", "PRO", "VIP", "SOCIO_VIP"] as const).map((plan) => (
                  <button key={plan} onClick={() => changePlan(user.id, plan)} className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-black text-white hover:border-yellow-400/40 hover:text-yellow-300">
                    <UserCheck className="mr-1 inline h-3 w-3" />{plan === "SOCIO_VIP" ? "SÓCIO" : plan}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </GlassCard>
      </div>
    </PremiumAppShell>
  );
}
