import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { authHeaders, refreshCurrentUser } from "@/lib/localAuth";
import { Brand, GlassCard, PremiumPage } from "@/components/PremiumShell";

type Status = "pending" | "approved" | "cancelled" | "failure";

export default function PaymentResult() {
  const params = new URLSearchParams(window.location.search);
  const order = params.get("order") || "";
  const initial = params.get("status") === "failure" ? "failure" : params.get("status") === "success" ? "pending" : "pending";
  const [status, setStatus] = useState<Status>(initial);
  const [checking, setChecking] = useState(Boolean(order));

  useEffect(() => {
    if (status === "approved") refreshCurrentUser().catch(() => undefined);
  }, [status]);

  useEffect(() => {
    if (!order) return;
    let attempts = 0;
    let cancelled = false;
    async function check() {
      attempts += 1;
      try {
        const response = await fetch(`/api/payments/status/${encodeURIComponent(order)}`, { headers: authHeaders() });
        const data = await response.json().catch(() => ({}));
        if (!cancelled && response.ok && data.payment?.status) {
          const next = data.payment.status as Status;
          setStatus(next);
          if (next === "approved" || next === "cancelled") { setChecking(false); return; }
        }
      } catch {}
      if (!cancelled && attempts < 8) window.setTimeout(check, 2500);
      else if (!cancelled) setChecking(false);
    }
    check();
    return () => { cancelled = true; };
  }, [order]);

  const approved = status === "approved";
  const failed = status === "failure" || status === "cancelled";
  return (
    <PremiumPage>
      <div className="mx-auto max-w-xl py-8">
        <Brand />
        <GlassCard className="mt-10 p-8 text-center">
          {approved ? <CheckCircle2 className="mx-auto h-16 w-16 text-green-400" /> : failed ? <XCircle className="mx-auto h-16 w-16 text-red-400" /> : <Clock3 className="mx-auto h-16 w-16 text-yellow-400" />}
          <h1 className="mt-5 text-3xl font-black text-white">{approved ? "Pagamento aprovado" : failed ? "Pagamento não concluído" : "Confirmando pagamento"}</h1>
          <p className="mt-4 leading-relaxed text-slate-300">
            {approved ? "Seu acesso premium já foi liberado." : failed ? "O pagamento não foi concluído. Você pode tentar novamente." : checking ? "Aguardando a confirmação segura do Mercado Pago. Esta verificação pode levar alguns segundos." : "O pagamento ainda está pendente. Assim que o Mercado Pago confirmar, seu acesso será liberado automaticamente."}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/account" className="rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 font-black text-black">Ir para minha conta</Link>
            <Link href="/payments" className="rounded-xl border border-white/15 px-6 py-3 font-black text-white hover:bg-white/10">Voltar ao pagamento</Link>
          </div>
        </GlassCard>
      </div>
    </PremiumPage>
  );
}
