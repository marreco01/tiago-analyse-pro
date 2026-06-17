import { useState, type FormEvent } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import { Link } from "wouter";
import { forgotPassword } from "@/lib/localAuth";
import { AuthShell, Input } from "./Login";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setPreviewUrl("");
    try {
      const data = await forgotPassword(email);
      setStatus(data.message || "Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.");
      setPreviewUrl(data.previewUrl || "");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Recuperar senha" subtitle="Informe o e-mail cadastrado para receber o link de redefinição da sua senha.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email" type="email" value={email} onChange={setEmail} />
        <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 py-4 font-black text-black hover:from-yellow-300 hover:to-orange-400 disabled:opacity-60">
          <Mail className="h-5 w-5" /> {loading ? "ENVIANDO..." : "ENVIAR LINK DE RECUPERAÇÃO"}
        </button>
      </form>
      {status ? (
        <div className="mt-5 rounded-xl border border-green-400/30 bg-green-500/10 p-4 text-sm text-green-200">
          <div className="flex items-start gap-2 font-bold"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> <span>{status}</span></div>
          {previewUrl ? <a href={previewUrl} className="mt-3 block rounded-lg border border-green-400/35 px-3 py-2 text-center font-black text-green-300 hover:bg-green-400/10">ABRIR LINK DE TESTE</a> : null}
        </div>
      ) : null}
      <p className="mt-6 text-sm text-slate-300"><Link href="/login" className="font-bold text-yellow-400">Voltar ao login</Link></p>
    </AuthShell>
  );
}
