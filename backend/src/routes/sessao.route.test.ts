import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { sessaoRoutes } from './sessao.route';
import errorHandlerPlugin from '../plugins/errorHandler';
import { Role, StatusSessao } from '../generated/enums';

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

function buildApp(
  prismaOverrides: Record<string, unknown> = {},
  user: { userId: number; role: Role } | null = { userId: 1, role: Role.ALUNO },
) {
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.register(errorHandlerPlugin);

  const prisma = {
    aluno: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 10 }),
    },
    sessaoEstudo: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(makeSessao()),
      update: jest.fn().mockResolvedValue(makeSessao()),
    },
    ...prismaOverrides,
  };

  app.decorate('prisma', prisma as never);
  app.decorate('authenticate', async (request) => {
    if (!user) {
      throw Object.assign(new Error('Token ausente'), { statusCode: 401 });
    }
    request.user = user;
  });

  app.register(sessaoRoutes, { prefix: '/sessoes' });
  return app;
}

describe('sessao routes', () => {
  describe('POST /sessoes', () => {
    it('retorna 400 quando disciplina_id ausente', async () => {
      const app = buildApp();
      const res = await app.inject({ method: 'POST', url: '/sessoes', payload: {} });
      expect(res.statusCode).toBe(400);
    });

    it('cria sessao e retorna 201', async () => {
      const sessao = makeSessao();
      const app = buildApp({
        sessaoEstudo: {
          count: jest.fn().mockResolvedValue(0),
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockResolvedValue(sessao),
          findUnique: jest.fn(),
          update: jest.fn(),
        },
      });
      const res = await app.inject({
        method: 'POST',
        url: '/sessoes',
        payload: { disciplina_id: 1 },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().status).toBe(StatusSessao.CRIADA);
    });

    it('retorna 422 com code quando limite de sessoes por disciplina atingido', async () => {
      const app = buildApp({
        sessaoEstudo: {
          count: jest.fn().mockResolvedValue(2),
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
        },
      });
      const res = await app.inject({
        method: 'POST',
        url: '/sessoes',
        payload: { disciplina_id: 1 },
      });
      expect(res.statusCode).toBe(422);
      expect(res.json().code).toBe('LIMITE_SESSOES_DISCIPLINA_DIA_ATINGIDO');
    });

    it('retorna 422 com code quando limite de disciplinas por dia atingido', async () => {
      const app = buildApp({
        sessaoEstudo: {
          count: jest.fn().mockResolvedValue(0),
          findMany: jest
            .fn()
            .mockResolvedValue([{ disciplina_id: 2 }, { disciplina_id: 3 }, { disciplina_id: 4 }]),
          create: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
        },
      });
      const res = await app.inject({
        method: 'POST',
        url: '/sessoes',
        payload: { disciplina_id: 5 },
      });
      expect(res.statusCode).toBe(422);
      expect(res.json().code).toBe('LIMITE_DISCIPLINAS_DIA_ATINGIDO');
    });

    it('retorna 401 sem token', async () => {
      const app = buildApp({}, null);
      const res = await app.inject({
        method: 'POST',
        url: '/sessoes',
        payload: { disciplina_id: 1 },
      });
      expect(res.statusCode).toBe(401);
    });

    it('retorna 403 para PROFESSOR', async () => {
      const app = buildApp({}, { userId: 1, role: Role.PROFESSOR });
      const res = await app.inject({
        method: 'POST',
        url: '/sessoes',
        payload: { disciplina_id: 1 },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('fluxo completo', () => {
    it('criar -> iniciar -> pausar -> retomar -> concluir', async () => {
      const sessaoBase = makeSessao();
      const sessaoEmAndamento = makeSessao({ status: StatusSessao.EM_ANDAMENTO });
      const sessaoPausada = makeSessao({ status: StatusSessao.PAUSADA, tempo_total_seg: 300 });
      const sessaoConcluida = makeSessao({
        status: StatusSessao.CONCLUIDA,
        tempo_total_seg: 600,
        concluida_em: new Date(),
      });

      const sessaoEstudo = {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue(sessaoBase),
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(sessaoBase)
          .mockResolvedValueOnce(sessaoEmAndamento)
          .mockResolvedValueOnce(sessaoPausada)
          .mockResolvedValueOnce(sessaoPausada),
        update: jest
          .fn()
          .mockResolvedValueOnce(sessaoEmAndamento)
          .mockResolvedValueOnce(sessaoPausada)
          .mockResolvedValueOnce(sessaoEmAndamento)
          .mockResolvedValueOnce(sessaoConcluida),
      };

      const app = buildApp({ sessaoEstudo });

      const criar = await app.inject({
        method: 'POST',
        url: '/sessoes',
        payload: { disciplina_id: 1 },
      });
      expect(criar.statusCode).toBe(201);

      const iniciar = await app.inject({ method: 'PATCH', url: '/sessoes/1/iniciar' });
      expect(iniciar.statusCode).toBe(200);
      expect(iniciar.json().status).toBe(StatusSessao.EM_ANDAMENTO);

      const pausar = await app.inject({
        method: 'PATCH',
        url: '/sessoes/1/pausar',
        payload: { tempo_total_seg: 300 },
      });
      expect(pausar.statusCode).toBe(200);
      expect(pausar.json().encerrada_por_limite).toBe(false);

      const retomar = await app.inject({ method: 'PATCH', url: '/sessoes/1/retomar' });
      expect(retomar.statusCode).toBe(200);

      const concluir = await app.inject({
        method: 'PATCH',
        url: '/sessoes/1/concluir',
        payload: { tempo_total_seg: 600 },
      });
      expect(concluir.statusCode).toBe(200);
      expect(concluir.json().status).toBe(StatusSessao.CONCLUIDA);
    });
  });

  describe('PATCH /sessoes/:id/pausar com limite', () => {
    it('retorna ENCERRADA_POR_LIMITE quando tempo_total_seg = 2700', async () => {
      const sessaoEmAndamento = makeSessao({ status: StatusSessao.EM_ANDAMENTO });
      const sessaoEncerrada = makeSessao({
        status: StatusSessao.ENCERRADA_POR_LIMITE,
        tempo_total_seg: 2700,
        concluida_em: new Date(),
      });
      const app = buildApp({
        sessaoEstudo: {
          count: jest.fn(),
          findMany: jest.fn(),
          create: jest.fn(),
          findUnique: jest.fn().mockResolvedValue(sessaoEmAndamento),
          update: jest.fn().mockResolvedValue(sessaoEncerrada),
        },
      });
      const res = await app.inject({
        method: 'PATCH',
        url: '/sessoes/1/pausar',
        payload: { tempo_total_seg: 2700 },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().encerrada_por_limite).toBe(true);
      expect(res.json().sessao.status).toBe(StatusSessao.ENCERRADA_POR_LIMITE);
    });
  });

  describe('PATCH /sessoes/:id/concluir com limite', () => {
    it('retorna ENCERRADA_POR_LIMITE quando tempo_total_seg = 2700', async () => {
      const sessaoEmAndamento = makeSessao({ status: StatusSessao.EM_ANDAMENTO });
      const sessaoEncerrada = makeSessao({
        status: StatusSessao.ENCERRADA_POR_LIMITE,
        tempo_total_seg: 2700,
        concluida_em: new Date(),
      });
      const app = buildApp({
        sessaoEstudo: {
          count: jest.fn(),
          findMany: jest.fn(),
          create: jest.fn(),
          findUnique: jest.fn().mockResolvedValue(sessaoEmAndamento),
          update: jest.fn().mockResolvedValue(sessaoEncerrada),
        },
      });
      const res = await app.inject({
        method: 'PATCH',
        url: '/sessoes/1/concluir',
        payload: { tempo_total_seg: 2700 },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe(StatusSessao.ENCERRADA_POR_LIMITE);
    });
  });

  describe('GET /sessoes/hoje', () => {
    it('retorna sessoes com metadados de limite', async () => {
      const sessoes = [makeSessao({ disciplina_id: 1 }), makeSessao({ id: 2, disciplina_id: 2 })];
      const app = buildApp({
        sessaoEstudo: {
          count: jest.fn().mockResolvedValue(2),
          findMany: jest.fn().mockResolvedValue(sessoes),
          create: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
        },
      });
      const res = await app.inject({ method: 'GET', url: '/sessoes/hoje' });
      expect(res.statusCode).toBe(200);
      expect(res.json().disciplinas_distintas_hoje).toBe(2);
      expect(res.json().data).toHaveLength(2);
    });
  });

  describe('GET /sessoes/historico', () => {
    it('retorna historico paginado', async () => {
      const sessoes = [makeSessao({ status: StatusSessao.CONCLUIDA })];
      const app = buildApp({
        sessaoEstudo: {
          count: jest.fn().mockResolvedValue(1),
          findMany: jest.fn().mockResolvedValue(sessoes),
          create: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
        },
      });
      const res = await app.inject({ method: 'GET', url: '/sessoes/historico?page=1&limit=10' });
      expect(res.statusCode).toBe(200);
      expect(res.json().pagination).toMatchObject({ page: 1, limit: 10, total: 1 });
      expect(res.json().data).toHaveLength(1);
    });
  });
});
