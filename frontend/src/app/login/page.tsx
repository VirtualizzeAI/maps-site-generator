"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Radar } from "lucide-react";
import { login } from "@/services/auth";
import { useActionNotification } from "@/components/action-notifications";

export default function LoginPage() {
  const notify = useActionNotification();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      notify({ variant: "success", title: "Acesso confirmado", description: "Você entrou no sistema com sucesso." });
      router.replace("/");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível entrar",
      );
      notify({ variant: "error", title: "Não foi possível entrar", description: cause instanceof Error ? cause.message : "Confira o e-mail e a senha e tente novamente." });
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="min-h-screen bg-[#07111f] text-white grid place-items-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[.06] p-8 shadow-2xl">
        <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500">
          <Radar />
        </div>
        <p className="text-sm font-semibold text-cyan-300">
          VIRTUALIZZE PROSPECTOR
        </p>
        <h1 className="mt-2 text-3xl font-bold">Acesse seu painel</h1>
        <p className="mt-2 text-sm text-slate-400">
          Ambiente interno da Virtualizze Automação.
        </p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block text-sm text-slate-300">
            E-mail
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-blue-400"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-sm text-slate-300">
            Senha
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-blue-400"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 font-semibold hover:bg-blue-400 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                Entrar <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
