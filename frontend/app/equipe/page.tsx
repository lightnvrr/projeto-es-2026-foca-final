"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarMembro, type Role } from "@/lib/api";

interface FormState {
  nome: string;
  email: string;
  senha: string;
  role: Role | "";
}

const INITIAL: FormState = { nome: "", email: "", senha: "", role: "" };

export default function CadastroEquipe() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function change(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSucesso(null);
    setErro(null);
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.role) return;

    setLoading(true);
    setSucesso(null);
    setErro(null);

    try {
      const payload =
        form.role === "PROFESSOR"
          ? { nome: form.nome, email: form.email, senha: form.senha, role: "PROFESSOR" as const }
          : { nome: form.nome, email: form.email, senha: form.senha, role: "COORDENADOR" as const };

      const usuario = await criarMembro(payload);
      setSucesso(`${usuario.nome} cadastrado com sucesso!`);
      setForm(INITIAL);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao cadastrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-surfaceVariant p-8">
      <div className="max-w-2xl mx-auto bg-surface p-6 rounded-lg shadow-md border-t-4 border-secondary">
        <h1 className="text-2xl font-bold text-primary mb-2">
          Cadastro de Equipe
        </h1>
        <p className="text-secondary mb-8 text-sm">
          Registre os professores e coordenadores que terão acesso ao Foca. O
          nível de acesso definirá os painéis disponíveis para cada um.
        </p>

        {sucesso && (
          <div className="mb-5 p-3 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm font-medium">
            {sucesso}
          </div>
        )}
        {erro && (
          <div className="mb-5 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            {erro}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-semibold text-primary mb-1">
              Nome Completo
            </label>
            <input
              name="nome"
              type="text"
              value={form.nome}
              onChange={change}
              required
              placeholder="Ex: Carlos Eduardo Silva"
              className="w-full p-3 border border-primaryLight rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-onSurfaceLight"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-primary mb-1">
                E-mail Institucional
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={change}
                required
                placeholder="nome@escola.com.br"
                className="w-full p-3 border border-primaryLight rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-onSurfaceLight"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-1">
                Cargo / Acesso
              </label>
              <select
                name="role"
                value={form.role}
                onChange={change}
                required
                className="w-full p-3 border border-primaryLight rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-onSurfaceLight bg-surface"
              >
                <option value="">Selecione o cargo...</option>
                <option value="PROFESSOR">Professor</option>
                <option value="COORDENADOR">Coordenador Pedagógico</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary mb-1">
              Senha de Acesso{" "}
              <span className="text-xs font-normal text-secondary">
                (mínimo 8 caracteres)
              </span>
            </label>
            <input
              name="senha"
              type="password"
              value={form.senha}
              onChange={change}
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full p-3 border border-primaryLight rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-onSurfaceLight"
            />
          </div>

          {/* Turmas vinculadas — integração pendente de endpoint no backend */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-1">
              Turmas Vinculadas{" "}
              <span className="text-xs font-normal text-secondary">
                (apenas para Professor)
              </span>
            </label>
            <select
              multiple
              className="w-full p-3 border border-primaryLight rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-onSurfaceLight bg-surface"
            >
              <option value="1">1º Ano A</option>
              <option value="2">2º Ano B</option>
              <option value="3">3º Ano - Foco ENEM</option>
            </select>
            <p className="text-xs text-secondary mt-1">
              Segure Ctrl (ou Cmd) para selecionar mais de uma turma.
            </p>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 border border-primary text-primary font-bold py-3 px-4 rounded-md hover:bg-primaryLight transition"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-surface font-bold py-3 px-4 rounded-md hover:bg-secondary transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Cadastrando..." : "Cadastrar Membro da Equipe"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
