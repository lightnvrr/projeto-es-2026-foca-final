"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getToken,
  getDisciplinas,
  getSessoesHoje,
  criarSessao,
  iniciarSessao,
  pausarSessao,
  retomarSessao,
  concluirSessao,
  cancelarSessao,
  type Disciplina,
  type Sessao,
} from "@/lib/api";

const DURACAO_MAXIMA_SEG = 2_700; // RN-S1: 45 min — espelha backend config/sessao.ts
const DURACAO_MINIMA_SEG = 1_800; // 30 min — sessões abaixo disso não são registradas
const MAX_DISCIPLINAS_DIA = 3;    // RN-S2
const MAX_SESSOES_DISCIPLINA = 2; // RN-S3

type View = "home" | "session" | "done";
type OrdemSessoes = "inicio" | "alfabetica";

interface Limites {
  disciplinas_distintas_hoje: number;
  sessoes_por_disciplina: Record<string, number>;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function PainelAluno() {
  const router = useRouter();

  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [sessoesHoje, setSessoesHoje] = useState<Sessao[]>([]);
  const [limites, setLimites] = useState<Limites>({
    disciplinas_distintas_hoje: 0,
    sessoes_por_disciplina: {},
  });
  const [pageLoading, setPageLoading] = useState(true);

  const [view, setView] = useState<View>("home");
  const [disciplina, setDisciplina] = useState<Disciplina | null>(null);
  const [sessaoId, setSessaoId] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [autoStopped, setAutoStopped] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [ordemSessoes, setOrdemSessoes] = useState<OrdemSessoes>("inicio");
  const [showModalAbandono, setShowModalAbandono] = useState(false);

  const progress = Math.min((elapsed / DURACAO_MAXIMA_SEG) * 100, 100);
  const circumference = 2 * Math.PI * 44;
  const nearLimit = elapsed >= DURACAO_MAXIMA_SEG - 300;

  const reloadSessoes = useCallback(async () => {
    try {
      const res = await getSessoesHoje();
      setSessoesHoje(res.data);
      setLimites({
        disciplinas_distintas_hoje: res.disciplinas_distintas_hoje,
        sessoes_por_disciplina: res.sessoes_por_disciplina,
      });
    } catch {
      // silencioso — redirecionamento feito pelo request() se token expirou
    }
  }, []);

  // Auth check + carga inicial
  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    Promise.all([getDisciplinas(), getSessoesHoje()])
      .then(([discs, sessoes]) => {
        setDisciplinas(discs);
        setSessoesHoje(sessoes.data);
        setLimites({
          disciplinas_distintas_hoje: sessoes.disciplinas_distintas_hoje,
          sessoes_por_disciplina: sessoes.sessoes_por_disciplina,
        });
      })
      .catch(() => router.push("/login"))
      .finally(() => setPageLoading(false));
  }, [router]);

  // Timer progressivo — para no limite RN-S1
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= DURACAO_MAXIMA_SEG) {
          setIsRunning(false);
          setAutoStopped(true);
          return DURACAO_MAXIMA_SEG;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Quando timer atinge o limite, registra no backend
  useEffect(() => {
    if (!autoStopped || !sessaoId || view !== "session") return;
    setActionLoading(true);
    concluirSessao(sessaoId, DURACAO_MAXIMA_SEG)
      .then(() => reloadSessoes())
      .catch(() => {})
      .finally(() => {
        setView("done");
        setActionLoading(false);
      });
  }, [autoStopped, sessaoId, view, reloadSessoes]);

  function canStart(disc: Disciplina): { ok: boolean; reason?: string } {
    const sessoesDaDisc = limites.sessoes_por_disciplina[String(disc.id)] ?? 0;
    if (sessoesDaDisc >= MAX_SESSOES_DISCIPLINA) {
      return { ok: false, reason: `Limite de ${MAX_SESSOES_DISCIPLINA} sessões por disciplina atingido` };
    }
    const isNew = sessoesDaDisc === 0;
    if (isNew && limites.disciplinas_distintas_hoje >= MAX_DISCIPLINAS_DIA) {
      return { ok: false, reason: `Limite de ${MAX_DISCIPLINAS_DIA} disciplinas diferentes por dia atingido` };
    }
    return { ok: true };
  }

  async function startSession(disc: Disciplina) {
    setActionLoading(true);
    try {
      const sessao = await criarSessao(disc.id);
      await iniciarSessao(sessao.id);
      setDisciplina(disc);
      setSessaoId(sessao.id);
      setElapsed(sessao.tempo_total_seg ?? 0);
      setAutoStopped(false);
      setIsRunning(true);
      setView("session");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao iniciar sessão");
    } finally {
      setActionLoading(false);
    }
  }

  async function togglePause() {
    if (!sessaoId) return;
    setActionLoading(true);
    try {
      if (isRunning) {
        const resultado = await pausarSessao(sessaoId, elapsed);
        setIsRunning(false);
        if (resultado.encerrada_por_limite) {
          setAutoStopped(true);
          setView("done");
          await reloadSessoes();
        }
      } else {
        await retomarSessao(sessaoId);
        setIsRunning(true);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro");
    } finally {
      setActionLoading(false);
    }
  }

  async function completeSession() {
    if (!sessaoId) return;
    if (elapsed < DURACAO_MINIMA_SEG) {
      setIsRunning(false);
      setShowModalAbandono(true);
      return;
    }
    setActionLoading(true);
    setIsRunning(false);
    try {
      await concluirSessao(sessaoId, elapsed);
      await reloadSessoes();
      setView("done");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao concluir sessão");
    } finally {
      setActionLoading(false);
    }
  }

  async function abandonarSessao() {
    if (!sessaoId) return;
    setActionLoading(true);
    try {
      await cancelarSessao(sessaoId);
      await reloadSessoes();
    } catch {
      // silencioso — sessão já pode ter sido removida
    } finally {
      setActionLoading(false);
      setShowModalAbandono(false);
      goHome();
    }
  }

  function goHome() {
    setView("home");
    setDisciplina(null);
    setSessaoId(null);
    setElapsed(0);
    setIsRunning(false);
    setAutoStopped(false);
  }

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-surfaceVariant flex items-center justify-center">
        <p className="text-secondary">Carregando...</p>
      </main>
    );
  }

  // ── VIEW HOME ──────────────────────────────────────────────────
  if (view === "home") {
    return (
      <main className="min-h-screen bg-surfaceVariant p-6">
        <div className="max-w-xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-primary">Bom dia!</h1>
            <p className="text-secondary text-sm mt-1">O que você vai estudar hoje?</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-surface rounded-lg p-3 shadow-sm text-center">
              <p className="text-xl font-bold text-primary">
                {limites.disciplinas_distintas_hoje}/{MAX_DISCIPLINAS_DIA}
              </p>
              <p className="text-xs text-secondary mt-0.5">disciplinas hoje</p>
            </div>
            <div className="bg-surface rounded-lg p-3 shadow-sm text-center">
              <p className="text-xl font-bold text-primary">{sessoesHoje.length}</p>
              <p className="text-xs text-secondary mt-0.5">sessões realizadas</p>
            </div>
          </div>

          {sessoesHoje.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-secondary uppercase tracking-widest">
                  Sessões de hoje
                </h2>
                <div className="flex gap-1">
                  <button
                    onClick={() => setOrdemSessoes("inicio")}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium transition ${
                      ordemSessoes === "inicio"
                        ? "bg-primary text-surface"
                        : "bg-surface text-secondary border border-primaryLight hover:bg-primaryLight"
                    }`}
                  >
                    Por início
                  </button>
                  <button
                    onClick={() => setOrdemSessoes("alfabetica")}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium transition ${
                      ordemSessoes === "alfabetica"
                        ? "bg-primary text-surface"
                        : "bg-surface text-secondary border border-primaryLight hover:bg-primaryLight"
                    }`}
                  >
                    A–Z
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {[...sessoesHoje]
                  .sort((a, b) => {
                    if (ordemSessoes === "alfabetica") {
                      const nomeA = disciplinas.find((d) => d.id === a.disciplina_id)?.nome ?? "";
                      const nomeB = disciplinas.find((d) => d.id === b.disciplina_id)?.nome ?? "";
                      return nomeA.localeCompare(nomeB, "pt-BR");
                    }
                    return new Date(a.iniciada_em).getTime() - new Date(b.iniciada_em).getTime();
                  })
                  .map((s) => {
                  const nomeDisciplina =
                    disciplinas.find((d) => d.id === s.disciplina_id)?.nome ??
                    `Disciplina #${s.disciplina_id}`;
                  return (
                    <div
                      key={s.id}
                      className="bg-surface rounded-lg px-4 py-3 shadow-sm flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-primary">{nomeDisciplina}</p>
                        <p className="text-xs text-secondary">{formatTime(s.tempo_total_seg)}</p>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          s.status === "ENCERRADA_POR_LIMITE"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {s.status === "ENCERRADA_POR_LIMITE" ? "Limite atingido" : "Concluída"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <h2 className="text-xs font-semibold text-secondary uppercase tracking-widest mb-2">
            Iniciar nova sessão
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {disciplinas.map((disc) => {
              const { ok, reason } = canStart(disc);
              const sessoes = limites.sessoes_por_disciplina[String(disc.id)] ?? 0;
              return (
                <button
                  key={disc.id}
                  onClick={() => ok && !actionLoading && startSession(disc)}
                  disabled={!ok || actionLoading}
                  title={reason}
                  className={`bg-surface rounded-lg px-3 py-3 shadow-sm text-left border-l-4 transition ${
                    ok
                      ? "border-primary hover:bg-primaryLight cursor-pointer"
                      : "border-primaryLight opacity-40 cursor-not-allowed"
                  }`}
                >
                  <p className="text-sm font-semibold text-primary">{disc.nome}</p>
                  <p className="text-xs text-secondary mt-0.5">
                    {sessoes}/{MAX_SESSOES_DISCIPLINA} sessões
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  // ── VIEW SESSION ───────────────────────────────────────────────
  if (view === "session" && disciplina) {
    return (
      <main className="min-h-screen bg-surfaceVariant flex items-center justify-center p-6">
        {showModalAbandono && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
            <div className="bg-surface rounded-xl shadow-xl max-w-sm w-full p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-primary mb-2">Sessão abaixo do mínimo</h3>
              <p className="text-sm text-secondary mb-1">
                Você estudou <span className="font-semibold text-primary">{formatTime(elapsed)}</span>, mas o mínimo para registrar uma sessão é{" "}
                <span className="font-semibold text-primary">30 min</span>.
              </p>
              <p className="text-sm text-secondary mb-6">
                Se sair agora, esta sessão será descartada e não ficará no histórico.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setShowModalAbandono(false); setIsRunning(true); }}
                  disabled={actionLoading}
                  className="w-full bg-primary text-surface font-bold py-2.5 rounded-lg hover:bg-secondary transition disabled:opacity-50"
                >
                  Continuar estudando
                </button>
                <button
                  onClick={abandonarSessao}
                  disabled={actionLoading}
                  className="w-full border-2 border-red-400 text-red-500 font-semibold py-2.5 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                >
                  {actionLoading ? "Encerrando..." : "Descartar sessão"}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="max-w-sm w-full bg-surface rounded-xl shadow-lg p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary mb-1">
            {isRunning ? "em andamento" : "pausada"}
          </p>
          <h2 className="text-2xl font-bold text-primary mb-8">{disciplina.nome}</h2>

          <div className="relative w-48 h-48 mx-auto mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="#c7d9e5" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="44"
                fill="none"
                stroke={nearLimit ? "#ef4444" : "#2f4157"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress / 100)}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-primary font-mono">
                {formatTime(elapsed)}
              </span>
              <span className="text-xs text-secondary mt-1">
                {formatTime(DURACAO_MAXIMA_SEG - elapsed)} restante
              </span>
            </div>
          </div>

          {nearLimit && (
            <p className="text-xs text-red-500 font-semibold mb-4">
              Atenção: menos de 5 min até o limite de 45 min.
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={togglePause}
              disabled={actionLoading}
              className="flex-1 border-2 border-primary text-primary font-bold py-3 rounded-lg hover:bg-primaryLight transition disabled:opacity-50"
            >
              {actionLoading ? "..." : isRunning ? "Pausar" : "Retomar"}
            </button>
            <button
              onClick={completeSession}
              disabled={actionLoading}
              className="flex-1 bg-primary text-surface font-bold py-3 rounded-lg hover:bg-secondary transition disabled:opacity-50"
            >
              {actionLoading ? "..." : "Concluir"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── VIEW DONE ──────────────────────────────────────────────────
  if (view === "done") {
    return (
      <main className="min-h-screen bg-surfaceVariant flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-surface rounded-xl shadow-lg p-8 text-center">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              autoStopped ? "bg-yellow-100" : "bg-primaryLight"
            }`}
          >
            <svg
              className={`w-8 h-8 ${autoStopped ? "text-yellow-600" : "text-primary"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-primary mb-1">
            {autoStopped ? "Limite atingido!" : "Sessão concluída!"}
          </h2>
          <p className="text-secondary text-sm mb-2">
            {disciplina?.nome} — {formatTime(elapsed)} estudados
          </p>
          {autoStopped && (
            <p className="text-xs text-secondary mb-6">
              Você atingiu o limite de 45 minutos. Faça uma pausa antes de continuar.
            </p>
          )}
          <div className={autoStopped ? "" : "mt-6"}>
            <button
              onClick={goHome}
              className="w-full bg-primary text-surface font-bold py-3 rounded-lg hover:bg-secondary transition"
            >
              Voltar ao início
            </button>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
