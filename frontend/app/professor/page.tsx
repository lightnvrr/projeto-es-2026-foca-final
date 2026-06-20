"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getToken, getUserIdFromToken, getUsuario } from "@/lib/api";

type RotineStatus = "estavel" | "irregular" | "ausente";

interface Aluno {
  id: number;
  nome: string;
  status: RotineStatus;
}

interface Turma {
  id: number;
  nome: string;
  alunos: Aluno[];
}

const STATUS_LABEL: Record<RotineStatus, string> = {
  estavel: "Rotina estável",
  irregular: "Rotina irregular",
  ausente: "Rotina ausente",
};

const STATUS_STYLE: Record<RotineStatus, string> = {
  estavel: "bg-green-100 text-green-800",
  irregular: "bg-yellow-100 text-yellow-700",
  ausente: "bg-red-100 text-red-700",
};

// Mock — formato do endpoint GET /api/professor/:id/turmas
const MOCK_TURMAS: Turma[] = [
  {
    id: 1,
    nome: "3º Ano A - Foco ENEM",
    alunos: [
      { id: 1, nome: "João Henrique", status: "estavel" },
      { id: 2, nome: "Maria Clara", status: "irregular" },
      { id: 3, nome: "Pedro Alves", status: "ausente" },
      { id: 4, nome: "Ana Beatriz", status: "estavel" },
      { id: 5, nome: "Lucas Ferreira", status: "irregular" },
    ],
  },
  {
    id: 2,
    nome: "2º Ano B",
    alunos: [
      { id: 6, nome: "Sofia Lima", status: "estavel" },
      { id: 7, nome: "Gabriel Costa", status: "ausente" },
      { id: 8, nome: "Isabela Rocha", status: "estavel" },
      { id: 9, nome: "Thiago Mendes", status: "irregular" },
    ],
  },
];

export default function PainelProfessor() {
  const router = useRouter();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState<string>("");

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    const id = getUserIdFromToken();
    if (id) getUsuario(id).then((u) => setNomeUsuario(u.nome)).catch(() => {});
  }, [router]);

  useEffect(() => {
    // Substituir pelo endpoint quando o backend estiver pronto:
    // fetch("/api/professor/1/turmas")
    //   .then((r) => r.json())
    //   .then((data) => { setTurmas(data.turmas); setSelectedId(data.turmas[0]?.id); });
    setTurmas(MOCK_TURMAS);
    setSelectedId(MOCK_TURMAS[0].id);
    setLoading(false);
  }, []);

  const turmaAtiva = turmas.find((t) => t.id === selectedId);

  const count = (status: RotineStatus) =>
    turmaAtiva?.alunos.filter((a) => a.status === status).length ?? 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-surfaceVariant flex items-center justify-center">
        <p className="text-secondary">Carregando painel...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surfaceVariant p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary">
              Painel de Monitoramento
            </h1>
            <p className="text-secondary text-sm mt-1">
              {nomeUsuario} — acompanhe a rotina das suas turmas
            </p>
          </div>
          <Link
            href="/alunos"
            className="bg-primary text-surface text-sm font-bold px-4 py-2 rounded-lg hover:bg-secondary transition shrink-0"
          >
            Cadastrar Aluno
          </Link>
        </div>

        {/* Seletor de turmas */}
        <div className="flex flex-wrap gap-2 mb-6">
          {turmas.map((turma) => (
            <button
              key={turma.id}
              onClick={() => setSelectedId(turma.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                selectedId === turma.id
                  ? "bg-primary text-surface"
                  : "bg-surface text-primary border border-primaryLight hover:bg-primaryLight"
              }`}
            >
              {turma.nome}
            </button>
          ))}
        </div>

        {turmaAtiva && (
          <>
            {/* Cards de resumo — 3 estados do aluno */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-surface rounded-lg p-4 shadow-sm text-center border-t-4 border-green-400">
                <p className="text-3xl font-bold text-primary">{count("estavel")}</p>
                <p className="text-xs text-secondary mt-1">Rotina estável</p>
              </div>
              <div className="bg-surface rounded-lg p-4 shadow-sm text-center border-t-4 border-yellow-400">
                <p className="text-3xl font-bold text-primary">{count("irregular")}</p>
                <p className="text-xs text-secondary mt-1">Rotina irregular</p>
              </div>
              <div className="bg-surface rounded-lg p-4 shadow-sm text-center border-t-4 border-red-400">
                <p className="text-3xl font-bold text-primary">{count("ausente")}</p>
                <p className="text-xs text-secondary mt-1">Rotina ausente</p>
              </div>
            </div>

            {/* Lista de alunos */}
            <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-primaryLight">
                <h2 className="font-semibold text-primary">{turmaAtiva.nome}</h2>
                <p className="text-xs text-secondary mt-0.5">
                  {turmaAtiva.alunos.length} alunos
                </p>
              </div>
              <div className="divide-y divide-primaryLight">
                {turmaAtiva.alunos.map((aluno) => (
                  <div
                    key={aluno.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <p className="text-sm font-medium text-primary">{aluno.nome}</p>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLE[aluno.status]}`}
                    >
                      {STATUS_LABEL[aluno.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}