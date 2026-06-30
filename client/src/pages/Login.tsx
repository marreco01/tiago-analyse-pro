import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { loginUser } from "@/lib/localAuth";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginUser(email, password);
      setLocation("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Entrar"
      subtitle="Bem-vindo ao ANALYSE PRO 2.0. Faça login para acessar o dashboard premium, chat PRO e análises avançadas."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email" type="email" value={email} onChange={setEmail} />
        <PasswordInput
          label="Senha"
          value={password}
          onChange={setPassword}
          visible={showPassword}
          onToggle={() => setShowPassword(!showPassword)}
        />
        {error ? (
          <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-bold text-red-200">
            {error}
          </p>
        ) : null}
        <button
          disabled={loading}
          className="w-full rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-500 py-4 font-black tracking-wide text-black shadow-[0_10px_30px_rgba(250,204,21,0.28)] transition hover:-translate-y-0.5 hover:from-yellow-300 hover:to-orange-400 disabled:opacity-60"
        >
          {loading ? "ENTRANDO..." : "ENTRAR"}
        </button>
      </form>
      <div className="mt-6 flex justify-between gap-4 text-sm text-slate-300">
        <Link href="/register" className="font-bold text-yellow-400 transition hover:text-yellow-300">
          Criar conta
        </Link>
        <Link href="/forgot-password" className="font-bold text-yellow-400 transition hover:text-yellow-300">
          Esqueci minha senha
        </Link>
      </div>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030405] px-4 py-8 text-white sm:px-6">
      <AuthAnimatedBackground />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[2rem] border border-yellow-400/20 bg-[#05070bcc] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="font-black text-yellow-400 transition hover:text-yellow-300">
            ← Voltar
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-yellow-300">
            <Sparkles className="h-3.5 w-3.5" />
            Login PRO
          </div>
        </div>

        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
        <p className="mb-8 mt-3 text-base leading-8 text-slate-300">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

function AuthAnimatedBackground() {
  return (
    <>
      <div
        className="absolute inset-0 bg-cover bg-center auth-stadium-bg"
        style={{ backgroundImage: "url('/stadium-bg.png')" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,221,87,0.08),transparent_28%),linear-gradient(180deg,rgba(1,3,8,0.45),rgba(1,3,8,0.76))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_68%,rgba(34,197,94,0.15),transparent_24%)]" />

      <div className="auth-blob auth-blob-one" />
      <div className="auth-blob auth-blob-two" />
      <div className="auth-blob auth-blob-three" />

      <div className="auth-particles" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, index) => (
          <span
            key={index}
            className="auth-particle"
            style={{
              left: `${5 + ((index * 11) % 90)}%`,
              top: `${10 + ((index * 13) % 70)}%`,
              animationDelay: `${(index % 6) * 0.7}s`,
              animationDuration: `${4 + (index % 5)}s`,
            }}
          />
        ))}
      </div>

      <div className="absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400/6 blur-3xl" />
    </>
  );
}

export function Input({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-white/90 px-4 py-4 text-base text-black outline-none transition focus:border-yellow-400 focus:bg-white"
        required
      />
    </label>
  );
}

export function PasswordInput({ label, value, onChange, visible, onToggle }: { label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-300">{label}</span>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/90 px-4 py-4 pr-28 text-base text-black outline-none transition focus:border-yellow-400 focus:bg-white"
          required
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          className="absolute inset-y-0 right-3 flex items-center gap-1 text-sm font-bold text-slate-500 transition hover:text-yellow-500"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span>{visible ? "Ocultar" : "Mostrar"}</span>
        </button>
      </div>
    </label>
  );
}
