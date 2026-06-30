import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Crown,
  Lock,
  MessageCircle,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Wallet,
  XCircle,
} from "lucide-react";
import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import { authHeaders, getCurrentUser, hasChatAccess, refreshCurrentUser, type LocalUser } from "@/lib/localAuth";

type Payment = {
  id: string;
  plan: "PRO" | "VIP" | "SOCIO_VIP";
  amount: number;
  status: "pending" | "approved" | "cancelled";
  createdAt: string;
  approvedAt?: string;
  paymentMethodId?: string;
  provider?: string;
};

type Usage = {
  accessLabel: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  percentUsed: number;
  utcDate: string;
  resetAtUtc: string;
};

export default function Account() {
  const [user, setUser] = useState<LocalUser | null>(() => getCurrentUser());
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadAccount() {
    setLoading(true);
    setMessage("");
    try {
      const freshUser = await refreshCurrentUser();
      setUser(freshUser);
      if (!freshUser) {
        setLoading(false);
        return;
      }
      const [paymentResponse, usageResponse, subscriptionResponse] = await Promise.all([
        fetch("/api/payments/me", { headers: authHeaders(), cache: "no-store" }),
        fetch("/api/account/analysis-usage", { headers: authHeaders(), cache: "no-store" }),
        fetch("/api/subscriptions/me", { headers: authHeaders(), cache: "no-store" }),
      ]);
      const paymentData = await paymentResponse.json().catch(() => ({}));
      const usageData = await usageResponse.json().catch(() => ({}));
      const subscriptionData = await subscriptionResponse.json().catch(() => ({}));
      if (paymentResponse.ok) setPayments(Array.isArray(paymentData.payments) ? paymentData.payments : []);
      if (usageResponse.ok) setUsage(usageData.usage || null);
      if (subscriptionResponse.ok) setSubscriptions(Array.isArray(subscriptionData.subscriptions) ? subscriptionData.subscriptions : []);
    } catch {
      setMessage("Não foi possível carregar os dados da assinatura.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccount();
  }, []);

  const activeLabel = planLabel(user);
  const paid = user?.role === "admin" || user?.plan === "PRO" || user?.plan === "VIP";
  const expiry = user?.planExpiresAt ? new Date(user.planExpiresAt) : null;
  const expired = Boolean(expiry && expiry.getTime() < Date.now());
  const daysRemaining = expiry ? Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / 86400000)) : null;
  const approvedPayment = useMemo(() => payments.find((payment) => payment.status === "approved"), [payments]);
  const chatEnabled = hasChatAccess(user) && !expired;

  if (!user && !loading) {
    return (
      <PremiumAppShell>
        <GlassCard className="mx-auto max-w-xl p-9 text-center">
          <Lock className="mx-auto h-12 w-12 text-yellow-400" />
          <h1 className="mt-4 text-3xl font-black">Entre na sua conta</h1>
          <p className="mt-3 text-slate-400">Faça login para consultar seu plano e pagamentos.</p>
          <Link href="/login" className="mt-7 inline-flex rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-7 py-4 font-black text-black">
            Entrar
          </Link>
        </GlassCard>
      </PremiumAppShell>
    );
  }

  return (
    <PremiumAppShell>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-400">Área do Assinante</p>
            <h1 className="mt-2 text-4xl font-black md:text-5xl">Minha assinatura</h1>
            <p className="mt-3 text-slate-400">Plano, consumo diário e histórico de pagamentos.</p>
          </div>
          <button onClick={loadAccount} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-5 py-3 font-black text-yellow-300 hover:bg-yellow-400/20 disabled:opacity-50">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>

        {message ? <GlassCard className="border-red-400/25 p-4 text-red-200">{message}</GlassCard> : null}

        <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <GlassCard className={`relative overflow-hidden p-6 md:p-7 ${activeLabel === "SÓCIO VIP FUNDADOR" ? "border-red-400/40" : paid ? "border-yellow-400/30" : ""}`}>
            <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-yellow-400/10 blur-3xl" />
            <div className="relative">
              <div className="flex flex-col justify-between gap-5 sm:flex-row">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Plano atual</p>
                  <div className="mt-3 flex items-center gap-3">
                    {activeLabel === "SÓCIO VIP FUNDADOR" ? <Crown className="h-9 w-9 text-red-400" /> : <Wallet className="h-9 w-9 text-yellow-400" />}
                    <h2 className={`text-3xl font-black ${activeLabel === "SÓCIO VIP FUNDADOR" ? "text-red-400" : "text-yellow-400"}`}>{activeLabel}</h2>
                  </div>
                </div>
                <StatusBadge active={!expired && Boolean(user?.status !== "blocked")} paid={paid} />
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                <AccountInfo label="Início" value={approvedPayment?.approvedAt ? formatDate(approvedPayment.approvedAt) : paid ? "Acesso liberado" : "Plano gratuito"} icon={<CheckCircle2 />} />
                <AccountInfo label="Vencimento" value={expiry ? formatDate(expiry.toISOString()) : paid ? "Sem vencimento" : "-"} icon={<CalendarDays />} />
                <AccountInfo label="Dias restantes" value={daysRemaining == null ? "-" : String(daysRemaining)} icon={<Clock3 />} />
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                {activeLabel === "FREE" ? (
                  <Link href="/plans" className="rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 font-black text-black">Escolher plano</Link>
                ) : (
                  <>
                    <Link href={renewalUrl(user)} className="rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 font-black text-black">Renovar acesso</Link>
                    {activeLabel !== "SÓCIO VIP FUNDADOR" ? <Link href="/plans" className="rounded-xl border border-white/15 px-6 py-3 font-black text-white hover:bg-white/10">Ver upgrade</Link> : null}
                  </>
                )}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6 md:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Análises hoje</p>
                <p className="mt-2 text-3xl font-black text-white">
                  {usage ? usage.used : "--"}
                  <span className="ml-2 text-base text-slate-400">/ {usage?.limit == null ? "Ilimitado" : usage.limit}</span>
                </p>
              </div>
              <Sparkles className="h-9 w-9 text-yellow-400" />
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500" style={{ width: `${Math.min(100, usage?.percentUsed || 0)}%` }} />
            </div>
            <p className="mt-3 text-sm text-slate-400">
              {usage?.remaining == null ? "Acesso administrativo sem limite individual." : `${usage.remaining} análises disponíveis até a renovação diária.`}
            </p>
            <p className="mt-3 text-xs text-slate-500">O contador reinicia diariamente.</p>
          </GlassCard>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <GlassCard className="p-6">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-7 w-7 text-yellow-400" />
              <h2 className="text-xl font-black">Chat PRO</h2>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              {chatEnabled ? "Seu plano possui acesso à comunidade exclusiva." : "Disponível para clientes PRO, VIP e SÓCIO VIP ativos."}
            </p>
            {chatEnabled ? (
              <Link href="/live" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-yellow-400/30 px-5 py-3 font-black text-yellow-300 hover:bg-yellow-400/10">
                Abrir jogos ao vivo <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link href="/plans" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 font-black text-white hover:bg-white/10">
                Ver planos <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-7 w-7 text-green-400" />
              <h2 className="text-xl font-black">Pagamento seguro</h2>
            </div>
            <p className="mt-4 text-sm text-slate-400">Pagamentos processados pelo Mercado Pago e liberação automática após confirmação.</p>
            <Link href="/payments" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-yellow-400/30 px-5 py-3 font-black text-yellow-300 hover:bg-yellow-400/10">
              Ir para pagamento <CreditCard className="h-4 w-4" />
            </Link>
          </GlassCard>
        </div>

        {subscriptions.length ? (
          <GlassCard className="p-6">
            <h2 className="text-xl font-black">Assinaturas automáticas</h2>
            <div className="mt-4 space-y-3">
              {subscriptions.map((subscription: any) => (
                <div key={subscription.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] p-4">
                  <div>
                    <p className="font-black text-white">{subscription.plan} mensal</p>
                    <p className="text-xs text-slate-400">Mercado Pago • renovação automática</p>
                  </div>
                  <span className="rounded-full border border-yellow-400/25 bg-yellow-400/10 px-3 py-2 text-xs font-black text-yellow-300">{subscription.status}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        ) : null}

        <GlassCard className="overflow-hidden p-6">
          <h2 className="text-xl font-black">Histórico de pagamentos</h2>
          <div className="mt-5 space-y-3">
            {payments.length ? payments.map((payment) => (
              <div key={payment.id} className="grid items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4 text-sm md:grid-cols-[1fr_150px_150px_145px]">
                <div>
                  <p className="font-black text-white">{payment.plan === "SOCIO_VIP" ? "SÓCIO VIP FUNDADOR" : payment.plan}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDateTime(payment.createdAt)} • Mercado Pago</p>
                </div>
                <p className="font-black text-yellow-400">{brl(payment.amount)}</p>
                <PaymentBadge status={payment.status} />
                <p className="text-xs text-slate-400">{payment.paymentMethodId || "Método no checkout"}</p>
              </div>
            )) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-6 text-center text-slate-400">
                Nenhum pagamento realizado ainda.
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </PremiumAppShell>
  );
}

function planLabel(user: LocalUser | null) {
  if (!user || user.plan === "FREE" || user.plan === "Grátis") return "FREE";
  if (user.membership === "SOCIO_VIP") return "SÓCIO VIP FUNDADOR";
  return user.plan;
}

function renewalUrl(user: LocalUser | null) {
  if (user?.membership === "SOCIO_VIP") return "/payments?plan=SOCIO_VIP";
  return `/payments?plan=${user?.plan === "VIP" ? "VIP" : "PRO"}`;
}

function StatusBadge({ active, paid }: { active: boolean; paid: boolean }) {
  if (!active) return <span className="h-fit rounded-full border border-red-400/30 bg-red-500/10 px-4 py-2 text-xs font-black text-red-300">ACESSO INATIVO</span>;
  return <span className="h-fit rounded-full border border-green-400/30 bg-green-500/10 px-4 py-2 text-xs font-black text-green-300">{paid ? "ATIVO" : "GRATUITO"}</span>;
}

function PaymentBadge({ status }: { status: Payment["status"] }) {
  const content = status === "approved"
    ? { label: "Aprovado", icon: <CheckCircle2 className="h-4 w-4" />, style: "border-green-400/25 bg-green-500/10 text-green-300" }
    : status === "cancelled"
      ? { label: "Recusado/Cancelado", icon: <XCircle className="h-4 w-4" />, style: "border-red-400/25 bg-red-500/10 text-red-300" }
      : { label: "Pendente", icon: <Clock3 className="h-4 w-4" />, style: "border-yellow-400/25 bg-yellow-500/10 text-yellow-300" };
  return <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-black ${content.style}`}>{content.icon}{content.label}</span>;
}

function AccountInfo({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center gap-2 text-yellow-400">{icon}<span className="text-xs font-bold uppercase text-slate-400">{label}</span></div>
      <p className="mt-2 font-black text-white">{value}</p>
    </div>
  );
}

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}
