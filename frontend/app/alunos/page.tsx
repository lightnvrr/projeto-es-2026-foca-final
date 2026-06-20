"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, getRoleFromToken, criarMembro } from "@/lib/api";

interface FormState {
  nome: string;
  email: string;
  senha: string;
  turma_id: string;
  turno: "MANHA" | "TARDE" | "NOITE" | "";
}

const INITIAL: FormState = { nome: "", email: "", senha: "", turma_id: "", turno: "" };

export default function CadastroAluno() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    const role = getRoleFromToken();
    if (role !== "PROFESSOR" && role !== "COORDENADOR") router.push("/login");
  }, [router]);

  function change(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSucesso(null);
    setErro(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.turno) return;
    setLoading(true);
    setSucesso(null);
    setErro(null);

    try {
      const usuario = await criarMembro({
        nome: form.nome,
        email: form.email,
        senha: form.senha,
        role: "ALUNO",
        turma_id: Number(form.turma_id),
        turno: form.turno,
      });
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
      <div className="max-w-lg mx-auto bg-surface p-6 rounded-lg shadow-md border-t-4 border-secondary">
        <h1 className="text-2xl font-bold text-primary mb-2">Cadastrar Aluno</h1>
        <p className="text-secondary text-sm mb-8">
          Registre um aluno para que ele possa acessar o Foca e gerenciar sua rotina de estudos.
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
              placeholder="Ex: João Henrique"
              className="w-full p-3 border border-primaryLight rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-onSurfaceLight"
            />
          </div>

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
              placeholder="aluno@escola.com.br"
              className="w-full p-3 border border-primaryLight rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-onSurfaceLight"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary mb-1">
              Senha de Acesso{" "}
              <span className="text-xs font-normal text-secondary">(mínimo 8 caracteres)</span>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-primary mb-1">
                Turma
              </label>
              <select
                name="turma_id"
                value={form.turma_id}
                onChange={change}
                required
                className="w-full p-3 border border-primaryLight rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-onSurfaceLight bg-surface"
              >
                <option value="">Selecione a turma...</option>
                <option value="1">1º Ano A</option>
                <option value="2">2º Ano B</option>
                <option value="3">3º Ano - Foco ENEM</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-1">
                Turno
              </label>
              <select
                name="turno"
                value={form.turno}
                onChange={change}
                required
                className="w-full p-3 border border-primaryLight rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-onSurfaceLight bg-surface"
              >
                <option value="">Selecione o turno...</option>
                <option value="MANHA">Manhã</option>
                <option value="TARDE">Tarde</option>
                <option value="NOITE">Noite</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
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
              className="flex-1 bg-primary text-surface font-bold py-3 px-4 rounded-md hover:bg-secondary transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Cadastrando..." : "Cadastrar Aluno"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
