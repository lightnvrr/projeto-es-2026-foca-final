import { AppError } from '../models/user/errors';

export class SessaoNaoEncontradaError extends AppError {
  constructor() {
    super('Sessão não encontrada', 404);
  }
}

export class SessaoStatusInvalidoError extends AppError {
  constructor(mensagem = 'Operação inválida para o status atual da sessão') {
    super(mensagem, 409);
  }
}

export class LimiteSessoesDisciplinaDiaError extends AppError {
  readonly code = 'LIMITE_SESSOES_DISCIPLINA_DIA_ATINGIDO';

  constructor() {
    super('Limite de sessões por disciplina no dia atingido', 422);
  }
}

export class LimiteDisciplinasDiaError extends AppError {
  readonly code = 'LIMITE_DISCIPLINAS_DIA_ATINGIDO';

  constructor() {
    super('Limite de disciplinas diferentes no dia atingido', 422);
  }
}
