import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { authHeaders, getCurrentUser, isAdminUser } from "@/lib/localAuth";

type AdminPayment = {
  id: string;
  providerPaymentId?: string;
  userId?: string;
  customerName: string;
  customerEmail: string;
  plan: "PRO" | "VIP" | "SOCIO_VIP" | string;
  amount: number;
  status: "pending" | "approved" | "cancelled" | string;
  provider?: string;
  createdAt: string;
  approvedAt?: string;
  receiptName?: string;
  receiptData?: string;
  receiptNote?: string;
  receiptSentAt?: string;
  paymentMethodId?: string;
  providerPreferenceId?: string;
};

type Summary = {
  totalReceived: number;
  totalPending: number;
  totalCancelled: number;
  approvedCount: number;
  pendingCount: number;
  cancelledCount: number;
  subscriptionsActive: number;
};

const statusLabel: Record<string, string> = {
  pending: "Aguardando",
  approved: "Aprovado",
  cancelled: "Cancelado",
  rejected: "Recusado",
};

const statusClass: Record<string, string> = {
  pending: "border-yellow-400/30 bg-yellow-500/10 text-yellow-200",
  approved: "border-green-400/30 bg-green-500/10 text-green-200",
  cancelled: "border-red-400/30 bg-red-500/10 text-red-200",
  rejected: "border-red-400/30 bg-red-500/10 text-red-200",
};

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

function datePt(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

export default function AdminPayments() {
  const currentUser = getCurrentUser();
  const isAdmin = isAdminUser(currentUser);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<AdminPayment | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadPayments() {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/payments", { headers: authHeaders() });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar pagamentos.");
      setPayments(Array.isArray(data.payments) ? data.payments : []);
      setSummary(data.summary || null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao carregar pagamentos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
    const timer = setInterval(loadPayments, 10000);
    return () => clearInterval(timer);
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return payments.filter((payment) => {
      const okStatus = status === "all" || payment.status === status;
      const okPlan = plan === "all" || payment.plan === plan;
      const okSearch = !term || [payment.customerName, payment.customerEmail, payment.id, payment.providerPaymentId].some((item) => String(item || "").toLowerCase().includes(term));
      return okStatus && okPlan && okSearch;
    });
  }, [payments, status, plan, search]);

  async function approvePayment(id: string) {
    const response = await fetch("/api/payments/admin/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ paymentId: id }),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Pagamento aprovado e assinatura liberada." : data.error || "Erro ao aprovar pagamento.");
    loadPayments();
  }

  async function cancelPayment(id: string) {
    const response = await fetch("/api/payments/admin/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ paymentId: id }),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Pagamento cancelado." : data.error || "Erro ao cancelar pagamento.");
    loadPayments();
  }

  async function deletePayment(id: string) {
    const confirmed = window.confirm("Tem certeza que deseja excluir este pagamento? Esta ação remove o registro da lista.");
    if (!confirmed) return;
    const response = await fetch("/api/payments/admin/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ paymentId: id }),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Pagamento excluído." : data.error || "Erro ao excluir pagamento.");
    loadPayments();
  }

  async function clearCancelledPayments() {
    const confirmed = window.confirm("Deseja limpar todos os pagamentos cancelados da lista?");
    if (!confirmed) return;
    const response = await fetch("/api/payments/admin/clear-cancelled", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
    });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? `${data.count || 0} pagamento(s) cancelado(s) removido(s).` : data.error || "Erro ao limpar cancelados.");
    loadPayments();
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#02060d] p-6 text-white">
        <div className="max-w-md rounded-3xl border border-red-400/30 bg-[#07111f] p-8 text-center">
          <h1 className="text-3xl font-black">Acesso restrito</h1>
          <p className="mt-3 text-slate-300">Esta página é exclusiva do administrador.</p>
          <a href="/login" className="mt-6 inline-block rounded-xl bg-green-500 px-6 py-3 font-black text-white">Entrar como admin</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#02060d] px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/chat" className="font-bold text-green-400">← Painel do Chat</Link>
          <Link href="/analyze" className="font-bold text-slate-300 hover:text-green-400">Voltar para Análise</Link>
        </div>

        <div className="mt-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black text-green-400">ADMIN</p>
            <h1 className="text-4xl font-black md:text-5xl">Pagamentos e Assinaturas</h1>
            <p className="mt-2 text-slate-400">Controle de compras, PIX, status e liberação de planos PRO, VIP e SÓCIO VIP.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={loadPayments} className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-black text-white hover:bg-white/10">
              {loading ? "Atualizando..." : "Atualizar"}
            </button>
            <button onClick={clearCancelledPayments} className="rounded-xl border border-red-400/25 bg-red-500/10 px-5 py-3 font-black text-red-200 hover:bg-red-500/20">
              Limpar cancelados
            </button>
          </div>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <Metric label="Recebido" value={brl(summary?.totalReceived || 0)} tone="green" />
          <Metric label="Pendente" value={brl(summary?.totalPending || 0)} tone="yellow" />
          <Metric label="Cancelado/recusado" value={brl(summary?.totalCancelled || 0)} tone="red" />
          <Metric label="Assinaturas ativas" value={String(summary?.subscriptionsActive || 0)} tone="blue" />
        </section>

        {message ? <p className="mt-5 rounded-xl border border-yellow-400/25 bg-yellow-500/10 p-3 text-sm font-bold text-yellow-200">{message}</p> : null}

        <section className="mt-8 rounded-3xl border border-white/10 bg-[#07111f]/90 p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente, email ou ID do pagamento" className="h-12 rounded-xl border border-white/10 bg-slate-950 px-4 text-white outline-none focus:border-green-400" />
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-12 rounded-xl border border-white/10 bg-slate-950 px-4 text-white outline-none focus:border-green-400">
              <option value="all">Todos status</option>
              <option value="pending">Aguardando</option>
              <option value="approved">Aprovado</option>
              <option value="cancelled">Cancelado</option>
              <option value="rejected">Recusado</option>
            </select>
            <select value={plan} onChange={(event) => setPlan(event.target.value)} className="h-12 rounded-xl border border-white/10 bg-slate-950 px-4 text-white outline-none focus:border-green-400">
              <option value="all">Todos planos</option>
              <option value="PRO">PRO</option>
              <option value="VIP">VIP</option>
              <option value="SOCIO_VIP">SÓCIO VIP FUNDADOR</option>
            </select>
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-[1260px] w-full border-collapse text-left text-sm">
              <thead className="bg-black/45 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Plano</th>
                  <th className="p-4">Valor</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Data</th>
                  <th className="p-4">ID do pagamento</th>
                  <th className="p-4">Integração</th>
                  <th className="p-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="p-8 text-center text-slate-400">Nenhum pagamento encontrado.</td></tr>
                ) : null}
                {filtered.map((payment) => (
                  <tr key={payment.id} className="border-t border-white/10 hover:bg-white/[0.03]">
                    <td className="p-4 font-bold text-white">{payment.customerName}</td>
                    <td className="p-4 text-slate-300">{payment.customerEmail}</td>
                    <td className="p-4"><span className={`rounded-lg border px-3 py-1 font-black ${payment.plan === "SOCIO_VIP" ? "border-red-400/30 bg-red-500/10 text-red-300" : payment.plan === "VIP" ? "border-orange-400/30 bg-orange-500/10 text-orange-300" : "border-yellow-400/30 bg-yellow-500/10 text-yellow-200"}`}>{payment.plan === "SOCIO_VIP" ? "SÓCIO VIP" : payment.plan}</span></td>
                    <td className="p-4 font-bold">{brl(payment.amount)}</td>
                    <td className="p-4"><span className={`rounded-lg border px-3 py-1 text-xs font-black ${statusClass[payment.status] || statusClass.pending}`}>{statusLabel[payment.status] || payment.status}</span></td>
                    <td className="p-4 text-slate-300">{datePt(payment.createdAt)}</td>
                    <td className="p-4"><code className="block max-w-[220px] truncate rounded bg-black/40 px-2 py-1 text-xs text-slate-200" title={payment.providerPaymentId || payment.id}>{payment.providerPaymentId || payment.id}</code></td>
                    <td className="p-4">
                      <div>
                        <span className="block rounded-lg border border-blue-400/25 bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-200">Mercado Pago</span>
                        <span className="mt-2 block text-xs text-slate-400">{payment.paymentMethodId || "Aguardando escolha"}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setSelectedPayment(payment)} className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-200 hover:bg-blue-500/20">Ver</button>
                        {payment.status === "pending" ? <button onClick={() => approvePayment(payment.id)} className="rounded-lg bg-green-500 px-3 py-2 text-xs font-black text-white hover:bg-green-400">Aprovar</button> : null}
                        {payment.status === "pending" ? <button onClick={() => cancelPayment(payment.id)} className="rounded-lg bg-red-500 px-3 py-2 text-xs font-black text-white hover:bg-red-400">Cancelar</button> : null}
                        <button onClick={() => deletePayment(payment.id)} className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-200 hover:bg-red-500/20">Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selectedPayment ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#07111f] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-green-400">Detalhes do pagamento</p>
                <h2 className="mt-2 text-2xl font-black">{selectedPayment.customerName}</h2>
                <p className="mt-1 text-slate-400">{selectedPayment.customerEmail}</p>
              </div>
              <button onClick={() => setSelectedPayment(null)} className="rounded-xl border border-white/10 px-4 py-2 font-black text-slate-300 hover:bg-white/10">Fechar</button>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <Detail label="Plano" value={selectedPayment.plan === "SOCIO_VIP" ? "SÓCIO VIP" : selectedPayment.plan} />
              <Detail label="Valor" value={brl(selectedPayment.amount)} />
              <Detail label="Status" value={statusLabel[selectedPayment.status] || selectedPayment.status} />
              <Detail label="Método" value={selectedPayment.paymentMethodId || "Aguardando escolha"} />
              <Detail label="ID local" value={selectedPayment.id} />
              <Detail label="ID Mercado Pago" value={selectedPayment.providerPaymentId || "-"} />
              <Detail label="Preferência" value={selectedPayment.providerPreferenceId || "-"} />
              <Detail label="Data" value={datePt(selectedPayment.createdAt)} />
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              {selectedPayment.status === "pending" ? <button onClick={() => approvePayment(selectedPayment.id)} className="rounded-xl bg-green-500 px-5 py-3 font-black text-white">Aprovar manual</button> : null}
              {selectedPayment.status === "pending" ? <button onClick={() => cancelPayment(selectedPayment.id)} className="rounded-xl bg-red-500 px-5 py-3 font-black text-white">Cancelar</button> : null}
              <button onClick={() => { deletePayment(selectedPayment.id); setSelectedPayment(null); }} className="rounded-xl border border-red-400/30 bg-red-500/10 px-5 py-3 font-black text-red-200">Excluir</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 break-all text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "green" | "yellow" | "red" | "blue" }) {
  const tones = {
    green: "border-green-400/25 bg-green-500/10 text-green-300",
    yellow: "border-yellow-400/25 bg-yellow-500/10 text-yellow-200",
    red: "border-red-400/25 bg-red-500/10 text-red-200",
    blue: "border-blue-400/25 bg-blue-500/10 text-blue-200",
  };
  return <div className={`rounded-2xl border p-5 ${tones[tone]}`}><p className="text-sm font-bold opacity-80">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>;
}
