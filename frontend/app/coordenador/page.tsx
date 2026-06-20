"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getToken, getUserIdFromToken, getUsuario } from "@/lib/api";

interface Professor {
  id: number;
  nome: string;
  email: string;
  turmasMonitoradas: string[];
  ultimoAcesso: string | null;
  ativo: boolean;
}

// Mock — formato do endpoint GET /api/coordenador/:id/professores (RF10)
const MOCK_PROFESSORES: Professor[] = [
  {
    id: 1,
    nome: "Ana Menezes",
    email: "ana@escola.com.br",
    turmasMonitoradas: ["3º Ano A - Foco ENEM", "2º Ano B"],
    ultimoAcesso: "2026-06-19T08:30:00",
    ativo: true,
  },
  {
    id: 2,
    nome: "Carlos Eduardo",
    email: "carlos@escola.com.br",
    turmasMonitoradas: ["1º Ano A"],
    ultimoAcesso: "2026-06-17T14:10:00",
    ativo: false,
  },
  {
    id: 3,
    nome: "Fernanda Souza",
    email: "fernanda@escola.com.br",
    turmasMonitoradas: [],
    ultimoAcesso: null,
    ativo: false,
  },
];

function formatDate(iso: string | null): string {
  if (!iso) return "Nunca acessou";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PainelCoordenador() {
  const router = useRouter();
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [nomeUsuario, setNomeUsuario] = useState<string>("");

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    const id = getUserIdFromToken();
    if (id) getUsuario(id).then((u) => setNomeUsuario(u.nome)).catch(() => {});
  }, [router]);

  useEffect(() => {
    // Substituir pelo endpoint quando o backend estiver pronto:
    // fetch("/api/coordenador/1/professores")
    //   .then((r) => r.json())
    //   .then((data) => setProfessores(data.professores));
    setProfessores(MOCK_PROFESSORES);
    setLoading(false);
  }, []);

  const ativos = professores.filter((p) => p.ativo).length;
  const inativos = professores.filter((p) => !p.ativo).length;

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
              Painel da Coordenação
            </h1>
            <p className="text-secondary text-sm mt-1">
              {nomeUsuario} — acompanhe o engajamento dos professores
            </p>
          </div>
          <Link
            href="/equipe"
            className="bg-primary text-surface text-sm font-bold px-4 py-2 rounded-lg hover:bg-secondary transition shrink-0"
          >
            Cadastrar Equipe
          </Link>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-surface rounded-lg p-4 shadow-sm text-center border-t-4 border-primary">
            <p className="text-3xl font-bold text-primary">{ativos}</p>
            <p className="text-xs text-secondary mt-1">Professores ativos</p>
          </div>
          <div className="bg-surface rounded-lg p-4 shadow-sm text-center border-t-4 border-primaryLight">
            <p className="text-3xl font-bold text-secondary">{inativos}</p>
            <p className="text-xs text-secondary mt-1">Sem acesso recente</p>
          </div>
        </div>

        {/* Lista de professores — RF10 */}
        <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-primaryLight">
            <h2 className="font-semibold text-primary">
              Professores vinculados
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              {professores.length} professores
            </p>
          </div>
          <div className="divide-y divide-primaryLight">
            {professores.map((prof) => (
              <div key={prof.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-primary">
                        {prof.nome}
                      </p>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          prof.ativo
                            ? "bg-green-100 text-green-800"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {prof.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <p className="text-xs text-secondary mt-0.5">{prof.email}</p>
                    <p className="text-xs text-secondary mt-1">
                      Último acesso:{" "}
                      <span className="font-medium">
                        {formatDate(prof.ultimoAcesso)}
                      </span>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-primary">
                      {prof.turmasMonitoradas.length}{" "}
                      {prof.turmasMonitoradas.length === 1 ? "turma" : "turmas"}
                    </p>
                    {prof.turmasMonitoradas.length > 0 ? (
                      <div className="flex flex-col gap-0.5 mt-1">
                        {prof.turmasMonitoradas.map((t) => (
                          <span key={t} className="text-xs text-secondary">
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-secondary mt-1">Sem turmas</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}