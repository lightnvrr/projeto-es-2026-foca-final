const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// ── Token management ────────────────────────────────────────────────────────

export function saveToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem("foca_token", token);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("foca_token");
}

export function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem("foca_token");
}

export function getRoleFromToken(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (payload.role as string) ?? null;
  } catch {
    return null;
  }
}

export function getUserIdFromToken(): number | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (payload.userId as number) ?? null;
  } catch {
    return null;
  }
}

export async function getUsuario(id: number): Promise<UsuarioResponse> {
  return request<UsuarioResponse>(`/user/${id}`);
}

function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...authHeader(),
    ...(options.headers as Record<string, string>),
  };
  if (options.body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Não autenticado");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `Erro ${res.status}`);
  }

  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

// ── Auth ────────────────────────────────────────────────────────────────────

export async function login(email: string, senha: string): Promise<void> {
  const credentials = btoa(`${email}:${senha}`);
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Credenciais inválidas");
  }
  const data = (await res.json()) as { token: string };
  saveToken(data.token);
}

// ── Disciplinas (público, sem auth) ─────────────────────────────────────────

export interface Disciplina {
  id: number;
  nome: string;
}

export async function getDisciplinas(): Promise<Disciplina[]> {
  const res = await fetch(`${BASE_URL}/disciplinas`);
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.json() as Promise<Disciplina[]>;
}

// ── Sessões ──────────────────────────────────────────────────────────────────

export type StatusSessao =
  | "CRIADA"
  | "EM_ANDAMENTO"
  | "PAUSADA"
  | "CONCLUIDA"
  | "ENCERRADA_POR_LIMITE";

export interface Sessao {
  id: number;
  aluno_id: number;
  disciplina_id: number;
  iniciada_em: string;
  concluida_em: string | null;
  tempo_total_seg: number;
  status: StatusSessao;
}

export interface SessoesHojeResponse {
  data: Sessao[];
  disciplinas_distintas_hoje: number;
  sessoes_por_disciplina: Record<string, number>;
}

export async function getSessoesHoje(): Promise<SessoesHojeResponse> {
  return request<SessoesHojeResponse>("/sessoes/hoje");
}

export async function criarSessao(disciplinaId: number): Promise<Sessao> {
  return request<Sessao>("/sessoes", {
    method: "POST",
    body: JSON.stringify({ disciplina_id: disciplinaId }),
  });
}

export async function iniciarSessao(id: number): Promise<Sessao> {
  return request<Sessao>(`/sessoes/${id}/iniciar`, { method: "PATCH" });
}

export async function pausarSessao(
  id: number,
  tempoTotalSeg: number
): Promise<{ sessao: Sessao; encerrada_por_limite: boolean }> {
  return request(`/sessoes/${id}/pausar`, {
    method: "PATCH",
    body: JSON.stringify({ tempo_total_seg: tempoTotalSeg }),
  });
}

export async function retomarSessao(id: number): Promise<Sessao> {
  return request<Sessao>(`/sessoes/${id}/retomar`, { method: "PATCH" });
}

export async function concluirSessao(
  id: number,
  tempoTotalSeg: number
): Promise<{ sessao: Sessao; status: StatusSessao }> {
  return request(`/sessoes/${id}/concluir`, {
    method: "PATCH",
    body: JSON.stringify({ tempo_total_seg: tempoTotalSeg }),
  });
}

// ── Usuários ─────────────────────────────────────────────────────────────────

export type Role = "PROFESSOR" | "COORDENADOR" | "ALUNO";

export type CriarMembroPayload =
  | { nome: string; email: string; senha: string; role: "PROFESSOR" }
  | { nome: string; email: string; senha: string; role: "COORDENADOR" }
  | { nome: string; email: string; senha: string; role: "ALUNO"; turma_id: number; turno: "MANHA" | "TARDE" | "NOITE" };

export interface UsuarioResponse {
  id: number;
  nome: string;
  email: string;
  role: Role;
  ativo: boolean;
  criado_em: string;
}

export async function criarMembro(
  data: CriarMembroPayload
): Promise<UsuarioResponse> {
  return request<UsuarioResponse>("/user", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
