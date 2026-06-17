import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, CheckCircle2, CreditCard, ShieldCheck, Wallet } from "lucide-react";
import { authHeaders, getCurrentUser } from "@/lib/localAuth";
import { Brand, GlassCard, PremiumPage } from "@/components/PremiumShell";
import { toast } from "sonner";

type CheckoutPlan = "PRO" | "VIP" | "SOCIO_VIP";

function parsePlan(value: string | null): CheckoutPlan {
  const normalized = String(value || "PRO").toUpperCase();
  if (normalized === "SOCIO_VIP") return "SOCIO_VIP";
  if (normalized === "VIP") return "VIP";
  return "PRO";
}

const planDetails = {
  PRO: {
    name: "PRO",
    price: "R$ 19,90",
    period: "acesso por 30 dias",
    benefits: ["Relatórios estatísticos completos", "Estatísticas avançadas", "Favoritos", "Comunidade PRO"],
    tone: "yellow",
  },
  VIP: {
    name: "VIP",
    price: "R$ 39,90",
    period: "acesso por 30 dias",
    benefits: ["Tudo do PRO", "Relatórios premium", "Indicadores ao vivo", "Destaque na comunidade"],
    tone: "orange",
  },
  SOCIO_VIP: {
    name: "SÓCIO VIP FUNDADOR",
    price: "R$ 197,00",
    period: "acesso VIP por 12 meses",
    benefits: ["Acesso VIP por 1 ano", "Até 500 análises por dia", "Comunidade PRO", "Estatísticas premium", "Prioridade em novidades"],
    tone: "red",
  },
} as const;

export default function Payments() {
  const [location] = useLocation();
  const query = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const [plan, setPlan] = useState<CheckoutPlan>(parsePlan(query.get("plan")));
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [billingMode, setBillingMode] = useState<"recurring" | "single">("recurring");
  const user = getCurrentUser();
  const selected = planDetails[plan];

  useEffect(() => {
    if (!user) {
      setStatus("Faça login antes de escolher um plano.");
      return;
    }
    loadPayments();
  }, [location, user?.id]);

  async function loadPayments() {
    try {
      const response = await fetch("/api/payments/me", { headers: authHeaders() });
      const data = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(data.payments)) setPayments(data.payments);
    } catch {}
  }

  async function goToCheckout() {
    if (!user) {
      setStatus("Faça login antes de continuar para o pagamento.");
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      const endpoint = plan !== "SOCIO_VIP" && billingMode === "recurring" ? "/api/subscriptions/create" : "/api/payments/checkout";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ plan }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data.error || "Não foi possível abrir o pagamento.");
      }
      toast.success("Redirecionando para o Mercado Pago.");
      window.location.href = data.checkoutUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível abrir o pagamento.";
      setStatus(message);
      toast.error(message);
      setLoading(false);
    }
  }

  const border = useMemo(() => plan === "SOCIO_VIP" ? "border-red-400/40 bg-red-500/10" : plan === "VIP" ? "border-orange-400/40 bg-orange-500/10" : "border-yellow-400/40 bg-yellow-400/10", [plan]);

  return (
    <PremiumPage>
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-4 py-5 md:flex-row md:items-center">
          <Brand />
          <div className="flex gap-3">
            <Link href="/plans" className="rounded-xl border border-white/15 bg-white px-5 py-3 text-sm font-black text-black hover:bg-slate-100">Voltar aos planos</Link>
            <Link href="/account" className="rounded-xl border border-yellow-400/35 bg-black/40 px-5 py-3 text-sm font-black text-yellow-300 hover:bg-yellow-400/10">Minha conta</Link>
          </div>
        </header>

        <section className="mt-5 grid gap-6 lg:grid-cols-[1fr_420px]">
          <GlassCard className="overflow-hidden">
            <div className="border-b border-white/10 bg-white p-6 text-black md:p-8">
              <p className="text-sm font-black uppercase tracking-wide text-orange-600">Checkout Mercado Pago</p>
              <h1 className="mt-2 text-4xl font-black">Pagamento seguro</h1>
              <p className="mt-2 max-w-2xl text-slate-700">
                Escolha seu acesso e pague no ambiente seguro do Mercado Pago. Pix, cartão, boleto e parcelamento aparecem no checkout conforme as opções disponíveis na sua conta Mercado Pago.
              </p>
            </div>

            <div className="p-6 md:p-8">
              <div className="grid gap-4 md:grid-cols-3">
                <PlanButton active={plan === "PRO"} name="PRO" price="R$ 19,90" note="30 dias" color="yellow" onClick={() => setPlan("PRO")} />
                <PlanButton active={plan === "VIP"} name="VIP" price="R$ 39,90" note="30 dias" color="orange" onClick={() => setPlan("VIP")} />
                <PlanButton active={plan === "SOCIO_VIP"} name="SÓCIO VIP" price="R$ 197,00" note="12 meses" color="red" onClick={() => setPlan("SOCIO_VIP")} />
              </div>

              {plan !== "SOCIO_VIP" ? (
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => setBillingMode("recurring")} className={`rounded-2xl border p-4 text-left ${billingMode === "recurring" ? "border-yellow-400 bg-yellow-400/10" : "border-white/10 bg-black/25"}`}>
                    <p className="font-black text-white">Assinatura automática</p>
                    <p className="mt-1 text-sm text-slate-400">Cobrança mensal autorizada no Mercado Pago.</p>
                  </button>
                  <button type="button" onClick={() => setBillingMode("single")} className={`rounded-2xl border p-4 text-left ${billingMode === "single" ? "border-yellow-400 bg-yellow-400/10" : "border-white/10 bg-black/25"}`}>
                    <p className="font-black text-white">Pagamento único</p>
                    <p className="mt-1 text-sm text-slate-400">Acesso por 30 dias via Pix, cartão ou boleto.</p>
                  </button>
                </div>
              ) : null}

              <div className={`mt-7 rounded-3xl border p-6 ${border}`}>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
                    <Wallet className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">{selected.name}</h2>
                    <p className="text-sm text-slate-300">{selected.period}</p>
                  </div>
                </div>
                <p className="mt-5 text-4xl font-black text-white">{selected.price}</p>
                <ul className="mt-6 space-y-3 text-sm text-slate-200">
                  {selected.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-yellow-400" /> {benefit}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={goToCheckout}
                  disabled={loading}
                  className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 py-4 font-black text-black hover:from-yellow-300 hover:to-orange-400 disabled:opacity-60"
                >
                  <CreditCard className="h-5 w-5" />
                  {loading ? "ABRINDO CHECKOUT..." : plan !== "SOCIO_VIP" && billingMode === "recurring" ? "ASSINAR MENSALMENTE" : "ESCOLHER FORMA DE PAGAMENTO"}
                  {!loading ? <ArrowRight className="h-5 w-5" /> : null}
                </button>

                {status ? <p className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm font-bold text-red-200">{status}</p> : null}
              </div>
            </div>
          </GlassCard>

          <aside className="space-y-5">
            <GlassCard className="p-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-7 w-7 text-yellow-400" />
                <h3 className="text-xl font-black">Liberação automática</h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">
                Após a confirmação do pagamento pelo Mercado Pago, seu acesso é liberado automaticamente. Retornar ao site não substitui a confirmação do pagamento.
              </p>
              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                <p className="font-black text-white">Formas disponíveis no checkout</p>
                <p className="mt-2">Pix • cartão de crédito • boleto • parcelamento em até 12x, quando habilitado pelo Mercado Pago.</p>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="text-xl font-black">Meus pagamentos</h3>
              <div className="mt-4 space-y-3">
                {payments.length ? payments.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="font-black text-white">{item.plan === "SOCIO_VIP" ? "SÓCIO VIP" : item.plan}</span>
                      <span className="font-black text-yellow-400">R$ {Number(item.amount || 0).toFixed(2).replace(".", ",")}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Status: <span className="font-black text-white">{item.status === "approved" ? "Aprovado" : item.status === "cancelled" ? "Cancelado" : "Aguardando confirmação"}</span></p>
                  </div>
                )) : <p className="text-sm text-slate-400">Nenhum pagamento iniciado ainda.</p>}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <p className="text-sm leading-relaxed text-slate-400">
                O Analyse Pro oferece dados, estatísticas e comparações de futebol para fins informativos. Acompanhe futebol com responsabilidade.
              </p>
            </GlassCard>
          </aside>
        </section>
      </div>
    </PremiumPage>
  );
}

function PlanButton({ active, name, price, note, color, onClick }: { active: boolean; name: string; price: string; note: string; color: "yellow" | "orange" | "red"; onClick: () => void }) {
  const activeClass = color === "red"
    ? "border-red-400 bg-red-500/10 text-red-300"
    : color === "orange"
      ? "border-orange-400 bg-orange-500/10 text-orange-300"
      : "border-yellow-400 bg-yellow-400/10 text-yellow-300";
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left transition ${active ? activeClass : "border-white/10 bg-black/35 text-white hover:border-white/25"}`}>
      <span className="block text-sm font-black">{name}</span>
      <span className="mt-2 block text-2xl font-black">{price}</span>
      <span className="mt-1 block text-xs text-slate-400">{note}</span>
    </button>
  );
}
