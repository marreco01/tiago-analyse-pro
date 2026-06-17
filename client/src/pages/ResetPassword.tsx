import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { resetPassword } from "@/lib/localAuth";
import { AuthShell, PasswordInput } from "./Login";

export default function ResetPassword() {
  const token = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") || "" : "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!token) { setError("Link de recuperação inválido."); return; }
    if (password.length < 6) { setError("A senha precisa ter pelo menos 6 caracteres."); return; }
    if (password !== confirmPassword) { setError("As senhas não coincidem."); return; }
    setLoading(true);
    try {
      const data = await resetPassword(token, password);
      if (!data.ok) throw new Error(data.error || "Não foi possível redefinir a senha.");
      setStatus("Senha redefinida com sucesso! Agora você já pode entrar.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível redefinir a senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Nova senha" subtitle="Crie uma nova senha para voltar a acessar o ANALYSE PRO 2.0.">
      {status ? (
        <div className="rounded-xl border border-green-400/30 bg-green-500/10 p-4 text-sm font-bold text-green-200">
          <div className="flex gap-2"><CheckCircle2 className="h-5 w-5" /> {status}</div>
          <Link href="/login" className="mt-4 block rounded-lg bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-3 text-center font-black text-black">ENTRAR</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput label="Nova senha" value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword(!showPassword)} />
          <PasswordInput label="Confirmar nova senha" value={confirmPassword} onChange={setConfirmPassword} visible={showPassword} onToggle={() => setShowPassword(!showPassword)} />
          {error ? <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-bold text-red-300">{error}</p> : null}
          <button disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 py-4 font-black text-black disabled:opacity-60">
            {loading ? "SALVANDO..." : "REDEFINIR SENHA"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
