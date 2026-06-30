import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { registerUser } from "@/lib/localAuth";
import { AuthShell, Input } from "./Login";

export default function Register() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    setLoading(true);
    try {
      await registerUser(name, email, password, avatar);
      setLocation("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Registrar" subtitle="Crie sua conta grátis para salvar análises e favoritos.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nome" type="text" value={name} onChange={setName} />
        <Input label="Email" type="email" value={email} onChange={setEmail} />
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-300">Foto/avatar URL opcional</span>
          <input type="url" value={avatar} onChange={e => setAvatar(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-4 outline-none focus:border-yellow-400" />
        </label>
        <Input label="Senha" type="password" value={password} onChange={setPassword} />
        <Input label="Confirmar senha" type="password" value={confirm} onChange={setConfirm} />
        {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-bold text-red-300">{error}</p>}
        <button disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 py-4 font-black text-black hover:from-yellow-300 hover:to-orange-400 disabled:bg-slate-600">
          {loading ? "CRIANDO..." : "CRIAR CONTA"}
        </button>
      </form>
      <p className="mt-6 text-sm text-slate-300">Já tem conta? <Link href="/login" className="font-bold text-yellow-400">Entrar</Link></p>
    </AuthShell>
  );
}
