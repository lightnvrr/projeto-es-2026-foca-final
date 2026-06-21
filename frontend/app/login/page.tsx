"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, getRoleFromToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [emailErro, setEmailErro] = useState<string | null>(null);
  const [senhaErro, setSenhaErro] = useState<string | null>(null);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmailErro(null);
    setSenhaErro(null);
    setErro(null);

    let valido = true;
    if (!email) {
      setEmailErro("Preencha este campo");
      valido = false;
    }
    if (!senha) {
      setSenhaErro("Preencha este campo");
      valido = false;
    }
    if (!valido) return;

    setLoading(true);
    try {
      await login(email, senha);
      const role = getRoleFromToken();
      if (role === "ALUNO") router.push("/aluno");
      else if (role === "PROFESSOR") router.push("/professor");
      else if (role === "COORDENADOR") router.push("/coordenador");
      else router.push("/");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-surfaceVariant flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-surface p-8 rounded-lg shadow-lg border-t-4 border-secondary">
        <div className="text-center mb-8">
          <img src="/logo_clara.svg" alt="Foca" className="h-16 w-auto mx-auto mb-4" />
          <p className="text-secondary text-sm">
            Faça login para acessar o seu ambiente de estudos ou gestão.
          </p>
        </div>

        {erro && (
          <div className="mb-5 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-primary mb-1">
              E-mail Institucional
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com.br"
              className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-onSurfaceLight ${emailErro ? "border-red-500" : "border-primaryLight"}`}
            />
            {emailErro && <p className="mt-1 text-xs text-red-600">{emailErro}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary mb-1">
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-onSurfaceLight ${senhaErro ? "border-red-500" : "border-primaryLight"}`}
            />
            {senhaErro && <p className="mt-1 text-xs text-red-600">{senhaErro}</p>}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-surface font-bold py-3 px-4 rounded-md hover:bg-secondary transition duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Entrando..." : "Entrar na Plataforma"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
