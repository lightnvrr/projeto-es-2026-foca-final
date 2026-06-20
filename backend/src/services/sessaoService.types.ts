import { StatusSessao } from '../generated/enums';

export type SessaoCriada = {
  id: number;
  aluno_id: number;
  disciplina_id: number;
  iniciada_em: Date;
  tempo_total_seg: number;
  status: StatusSessao;
};

export type SessaoAtualizada = SessaoCriada & {
  concluida_em: Date | null;
};

export type ResultadoPausar = {
  sessao: SessaoAtualizada;
  encerradaPorLimite: boolean;
};

export type ResultadoConcluir = {
  sessao: SessaoAtualizada;
  status: StatusSessao;
};

export type ListarOptions = {
  page?: number;
  limit?: number;
  status?: StatusSessao;
  date?: Date;
};

export type PaginacaoMeta = {
  page: number;
  limit: number;
  total: number;
};

export type ListarResult = {
  data: SessaoAtualizada[];
  pagination: PaginacaoMeta;
};
