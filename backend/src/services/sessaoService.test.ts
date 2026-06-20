import { StatusSessao } from '../generated/enums';
import { SessaoService } from './sessaoService';
import {
  LimiteDisciplinasDiaError,
  LimiteSessoesDisciplinaDiaError,
  SessaoNaoEncontradaError,
  SessaoStatusInvalidoError,
} from './sessaoService.errors';

function makeSessao(overrides = {}) {
  return {
    id: 1,
    aluno_id: 10,
    disciplina_id: 1,
    iniciada_em: new Date(),
    concluida_em: null,
    tempo_total_seg: 0,
    status: StatusSessao.CRIADA,
    ...overrides,
  };
}

function makePrisma(overrides = {}) {
  return {
    sessaoEstudo: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(makeSessao()),
      update: jest.fn().mockResolvedValue(makeSessao()),
    },
    ...overrides,
  } as unknown;
}

describe('SessaoService', () => {
  describe('criarSessao', () => {
    it('cria sessao quando dentro dos limites', async () => {
      // @ts-expect-error -- mock parcial em teste
      const service = new SessaoService(makePrisma());
      const resultado = await service.criarSessao(10, 1);
      expect(resultado.status).toBe(StatusSessao.CRIADA);
    });

    it('RN-S3: bloqueia quando ja tem 2 sessoes da mesma disciplina hoje', async () => {
      const prisma = makePrisma();
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.count.mockResolvedValue(2);
      // @ts-expect-error -- mock parcial em teste
      const service = new SessaoService(prisma);
      await expect(service.criarSessao(10, 1)).rejects.toThrow(LimiteSessoesDisciplinaDiaError);
    });

    it('RN-S3 borda: permite 2a sessao da mesma disciplina', async () => {
      const prisma = makePrisma();
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.count.mockResolvedValue(1);
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.findMany.mockResolvedValue([{ disciplina_id: 1 }]);
      // @ts-expect-error -- mock parcial em teste
      const service = new SessaoService(prisma);
      const resultado = await service.criarSessao(10, 1);
      expect(resultado.status).toBe(StatusSessao.CRIADA);
    });

    it('RN-S2: bloqueia 4a disciplina diferente no mesmo dia', async () => {
      const prisma = makePrisma();
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.count.mockResolvedValue(0);
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.findMany.mockResolvedValue([
        { disciplina_id: 2 },
        { disciplina_id: 3 },
        { disciplina_id: 4 },
      ]);
      // @ts-expect-error -- mock parcial em teste
      const service = new SessaoService(prisma);
      await expect(service.criarSessao(10, 5)).rejects.toThrow(LimiteDisciplinasDiaError);
    });

    it('RN-S2 borda: permite 3a disciplina diferente no mesmo dia', async () => {
      const prisma = makePrisma();
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.count.mockResolvedValue(0);
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.findMany.mockResolvedValue([{ disciplina_id: 2 }, { disciplina_id: 3 }]);
      // @ts-expect-error -- mock parcial em teste
      const service = new SessaoService(prisma);
      const resultado = await service.criarSessao(10, 5);
      expect(resultado.status).toBe(StatusSessao.CRIADA);
    });

    it('RN-S3 tem prioridade sobre RN-S2: retorna erro de disciplina quando ambos ultrapassados', async () => {
      const prisma = makePrisma();
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.count.mockResolvedValue(2);
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.findMany.mockResolvedValue([
        { disciplina_id: 1 },
        { disciplina_id: 2 },
        { disciplina_id: 3 },
      ]);
      // @ts-expect-error -- mock parcial em teste
      const service = new SessaoService(prisma);
      await expect(service.criarSessao(10, 1)).rejects.toThrow(LimiteSessoesDisciplinaDiaError);
    });
  });

  describe('iniciarSessao', () => {
    it('inicia sessao com status CRIADA', async () => {
      const sessao = makeSessao({ status: StatusSessao.CRIADA });
      const prisma = makePrisma();
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.findUnique.mockResolvedValue(sessao);
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.update.mockResolvedValue({
        ...sessao,
        status: StatusSessao.EM_ANDAMENTO,
      });
      // @ts-expect-error -- mock parcial em teste
      const service = new SessaoService(prisma);
      const resultado = await service.iniciarSessao(1, 10);
      expect(resultado.status).toBe(StatusSessao.EM_ANDAMENTO);
    });

    it('retorna 409 quando sessao ja esta EM_ANDAMENTO', async () => {
      const sessao = makeSessao({ status: StatusSessao.EM_ANDAMENTO });
      const prisma = makePrisma();
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.findUnique.mockResolvedValue(sessao);
      // @ts-expect-error -- mock parcial em teste
      const service = new SessaoService(prisma);
      await expect(service.iniciarSessao(1, 10)).rejects.toThrow(SessaoStatusInvalidoError);
    });

    it('retorna 404 quando sessao nao pertence ao aluno', async () => {
      const prisma = makePrisma();
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.findUnique.mockResolvedValue(null);
      // @ts-expect-error -- mock parcial em teste
      const service = new SessaoService(prisma);
      await expect(service.iniciarSessao(1, 99)).rejects.toThrow(SessaoNaoEncontradaError);
    });
  });

  describe('pausarSessao', () => {
    it('pausa sessao e persiste tempo acumulado', async () => {
      const sessao = makeSessao({ status: StatusSessao.EM_ANDAMENTO });
      const prisma = makePrisma();
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.findUnique.mockResolvedValue(sessao);
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.update.mockResolvedValue({
        ...sessao,
        status: StatusSessao.PAUSADA,
        tempo_total_seg: 300,
      });
      // @ts-expect-error -- mock parcial em teste
      const service = new SessaoService(prisma);
      const resultado = await service.pausarSessao(1, 10, 300);
      expect(resultado.encerradaPorLimite).toBe(false);
      expect(resultado.sessao.status).toBe(StatusSessao.PAUSADA);
    });

    it('RN-S1: encerra por limite quando tempo = 2700', async () => {
      const sessao = makeSessao({ status: StatusSessao.EM_ANDAMENTO });
      const prisma = makePrisma();
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.findUnique.mockResolvedValue(sessao);
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.update.mockResolvedValue({
        ...sessao,
        status: StatusSessao.ENCERRADA_POR_LIMITE,
        tempo_total_seg: 2700,
        concluida_em: new Date(),
      });
      // @ts-expect-error -- mock parcial em teste
      const service = new SessaoService(prisma);
      const resultado = await service.pausarSessao(1, 10, 2700);
      expect(resultado.encerradaPorLimite).toBe(true);
      expect(resultado.sessao.status).toBe(StatusSessao.ENCERRADA_POR_LIMITE);
      expect(resultado.sessao.tempo_total_seg).toBe(2700);
    });

    it('RN-S1: encerra por limite quando tempo > 2700', async () => {
      const sessao = makeSessao({ status: StatusSessao.EM_ANDAMENTO });
      const prisma = makePrisma();
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.findUnique.mockResolvedValue(sessao);
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.update.mockResolvedValue({
        ...sessao,
        status: StatusSessao.ENCERRADA_POR_LIMITE,
        tempo_total_seg: 2700,
        concluida_em: new Date(),
      });
      // @ts-expect-error -- mock parcial em teste
      const service = new SessaoService(prisma);
      const resultado = await service.pausarSessao(1, 10, 3000);
      expect(resultado.encerradaPorLimite).toBe(true);
    });
  });

  describe('retomarSessao', () => {
    it('retoma sessao pausada sem zerar tempo', async () => {
      const sessao = makeSessao({ status: StatusSessao.PAUSADA, tempo_total_seg: 600 });
      const prisma = makePrisma();
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.findUnique.mockResolvedValue(sessao);
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.update.mockResolvedValue({
        ...sessao,
        status: StatusSessao.EM_ANDAMENTO,
      });
      // @ts-expect-error -- mock parcial em teste
      const service = new SessaoService(prisma);
      const resultado = await service.retomarSessao(1, 10);
      expect(resultado.status).toBe(StatusSessao.EM_ANDAMENTO);
      expect(resultado.tempo_total_seg).toBe(600);
    });

    it('retorna 409 quando sessao nao esta pausada', async () => {
      const sessao = makeSessao({ status: StatusSessao.EM_ANDAMENTO });
      const prisma = makePrisma();
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.findUnique.mockResolvedValue(sessao);
      // @ts-expect-error -- mock parcial em teste
      const service = new SessaoService(prisma);
      await expect(service.retomarSessao(1, 10)).rejects.toThrow(SessaoStatusInvalidoError);
    });
  });

  describe('concluirSessao', () => {
    it('conclui com CONCLUIDA quando tempo < 2700', async () => {
      const sessao = makeSessao({ status: StatusSessao.EM_ANDAMENTO });
      const prisma = makePrisma();
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.findUnique.mockResolvedValue(sessao);
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.update.mockResolvedValue({
        ...sessao,
        status: StatusSessao.CONCLUIDA,
        tempo_total_seg: 1500,
        concluida_em: new Date(),
      });
      // @ts-expect-error -- mock parcial em teste
      const service = new SessaoService(prisma);
      const resultado = await service.concluirSessao(1, 10, 1500);
      expect(resultado.status).toBe(StatusSessao.CONCLUIDA);
    });

    it('RN-S1: conclui com ENCERRADA_POR_LIMITE e cap quando tempo = 2700', async () => {
      const sessao = makeSessao({ status: StatusSessao.EM_ANDAMENTO });
      const prisma = makePrisma();
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.findUnique.mockResolvedValue(sessao);
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.update.mockResolvedValue({
        ...sessao,
        status: StatusSessao.ENCERRADA_POR_LIMITE,
        tempo_total_seg: 2700,
        concluida_em: new Date(),
      });
      // @ts-expect-error -- mock parcial em teste
      const service = new SessaoService(prisma);
      const resultado = await service.concluirSessao(1, 10, 2700);
      expect(resultado.status).toBe(StatusSessao.ENCERRADA_POR_LIMITE);
      expect(resultado.sessao.tempo_total_seg).toBe(2700);
    });

    it('RN-S1: cap no limite e ENCERRADA_POR_LIMITE quando tempo > 2700', async () => {
      const sessao = makeSessao({ status: StatusSessao.EM_ANDAMENTO });
      const prisma = makePrisma();
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.findUnique.mockResolvedValue(sessao);
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...sessao, ...data, concluida_em: new Date() }),
      );
      // @ts-expect-error -- mock parcial em teste
      const service = new SessaoService(prisma);
      const resultado = await service.concluirSessao(1, 10, 3500);
      expect(resultado.status).toBe(StatusSessao.ENCERRADA_POR_LIMITE);
      expect(resultado.sessao.tempo_total_seg).toBe(2700);
    });
  });

  describe('listar', () => {
    it('retorna sessoes do dia quando date e fornecido', async () => {
      const sessoes = [makeSessao({ disciplina_id: 1 }), makeSessao({ id: 2, disciplina_id: 2 })];
      const prisma = makePrisma();
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.findMany.mockResolvedValue(sessoes);
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.count.mockResolvedValue(2);
      // @ts-expect-error -- mock parcial em teste
      const service = new SessaoService(prisma);
      const resultado = await service.listar(10, { date: new Date() });
      expect(resultado.data).toHaveLength(2);
      expect(resultado.pagination.total).toBe(2);
    });

    it('aplica paginacao e filtro de status', async () => {
      const prisma = makePrisma();
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.findMany.mockResolvedValue([
        makeSessao({ status: StatusSessao.CONCLUIDA }),
      ]);
      // @ts-expect-error -- mock parcial em teste
      prisma.sessaoEstudo.count.mockResolvedValue(1);
      // @ts-expect-error -- mock parcial em teste
      const service = new SessaoService(prisma);
      const resultado = await service.listar(10, {
        page: 2,
        limit: 5,
        status: StatusSessao.CONCLUIDA,
      });
      expect(resultado.pagination.page).toBe(2);
      expect(resultado.pagination.limit).toBe(5);
    });
  });
});
