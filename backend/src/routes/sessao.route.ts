import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { Role, StatusSessao } from '../generated/enums';
import { SessaoService } from '../services/sessaoService';
import { withErrorHandler } from '../decorators/withErrorHandler';
import { withRoles } from '../decorators/withRoles';
import {
  LimiteDisciplinasDiaError,
  LimiteSessoesDisciplinaDiaError,
} from '../services/sessaoService.errors';

const statusSessaoEnum = z.enum([
  StatusSessao.CRIADA,
  StatusSessao.EM_ANDAMENTO,
  StatusSessao.PAUSADA,
  StatusSessao.CONCLUIDA,
  StatusSessao.ENCERRADA_POR_LIMITE,
]);

const sessaoSchema = z.object({
  id: z.number().int(),
  aluno_id: z.number().int(),
  disciplina_id: z.number().int(),
  iniciada_em: z.date(),
  concluida_em: z.date().nullable(),
  tempo_total_seg: z.number().int(),
  status: statusSessaoEnum,
});

const paramsIdSchema = z.object({ id: z.coerce.number().int().positive() });

const onlyAluno = withRoles([Role.ALUNO]);

export const sessaoRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  const service = new SessaoService(fastify.prisma);
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.addHook('preHandler', app.authenticate);

  async function resolveAlunoId(usuarioId: number): Promise<number> {
    const aluno = await fastify.prisma.aluno.findUniqueOrThrow({
      where: { usuario_id: usuarioId },
      select: { id: true },
    });
    return aluno.id;
  }

  app.post(
    '/',
    {
      schema: {
        tags: ['Sessoes'],
        security: [{ bearerAuth: [] }],
        body: z.object({ disciplina_id: z.number().int().positive() }),
        response: { 201: sessaoSchema },
      },
    },
    withErrorHandler(
      onlyAluno(async (request, reply) => {
        const alunoId = await resolveAlunoId(request.user!.userId);
        try {
          const sessao = await service.criarSessao(alunoId, request.body.disciplina_id);
          return reply.code(201).send(sessao);
        } catch (error) {
          if (
            error instanceof LimiteSessoesDisciplinaDiaError ||
            error instanceof LimiteDisciplinasDiaError
          ) {
            return reply.code(422).send({ code: error.code, message: error.message });
          }
          throw error;
        }
      }),
    ),
  );

  app.patch(
    '/:id/iniciar',
    {
      schema: {
        tags: ['Sessoes'],
        security: [{ bearerAuth: [] }],
        params: paramsIdSchema,
        response: { 200: sessaoSchema },
      },
    },
    withErrorHandler(
      onlyAluno(async (request, reply) => {
        const alunoId = await resolveAlunoId(request.user!.userId);
        const sessao = await service.iniciarSessao(request.params.id, alunoId);
        return reply.send(sessao);
      }),
    ),
  );

  app.patch(
    '/:id/pausar',
    {
      schema: {
        tags: ['Sessoes'],
        security: [{ bearerAuth: [] }],
        params: paramsIdSchema,
        body: z.object({ tempo_total_seg: z.number().int().min(0) }),
        response: {
          200: z.object({
            sessao: sessaoSchema,
            encerrada_por_limite: z.boolean(),
            mensagem: z.string().optional(),
          }),
        },
      },
    },
    withErrorHandler(
      onlyAluno(async (request, reply) => {
        const alunoId = await resolveAlunoId(request.user!.userId);
        const resultado = await service.pausarSessao(
          request.params.id,
          alunoId,
          request.body.tempo_total_seg,
        );
        return reply.send({
          sessao: resultado.sessao,
          encerrada_por_limite: resultado.encerradaPorLimite,
          mensagem: resultado.encerradaPorLimite
            ? 'Sessão encerrada por atingir o limite de tempo'
            : undefined,
        });
      }),
    ),
  );

  app.patch(
    '/:id/retomar',
    {
      schema: {
        tags: ['Sessoes'],
        security: [{ bearerAuth: [] }],
        params: paramsIdSchema,
        response: { 200: sessaoSchema },
      },
    },
    withErrorHandler(
      onlyAluno(async (request, reply) => {
        const alunoId = await resolveAlunoId(request.user!.userId);
        const sessao = await service.retomarSessao(request.params.id, alunoId);
        return reply.send(sessao);
      }),
    ),
  );

  app.patch(
    '/:id/concluir',
    {
      schema: {
        tags: ['Sessoes'],
        security: [{ bearerAuth: [] }],
        params: paramsIdSchema,
        body: z.object({ tempo_total_seg: z.number().int().min(0) }),
        response: { 200: z.object({ sessao: sessaoSchema, status: statusSessaoEnum }) },
      },
    },
    withErrorHandler(
      onlyAluno(async (request, reply) => {
        const alunoId = await resolveAlunoId(request.user!.userId);
        const resultado = await service.concluirSessao(
          request.params.id,
          alunoId,
          request.body.tempo_total_seg,
        );
        return reply.send({ sessao: resultado.sessao, status: resultado.status });
      }),
    ),
  );

  app.delete(
    '/:id',
    {
      schema: {
        tags: ['Sessoes'],
        security: [{ bearerAuth: [] }],
        params: paramsIdSchema,
        response: { 204: z.void() },
      },
    },
    withErrorHandler(
      onlyAluno(async (request, reply) => {
        const alunoId = await resolveAlunoId(request.user!.userId);
        await service.cancelarSessao(request.params.id, alunoId);
        return reply.code(204).send();
      }),
    ),
  );

  app.get(
    '/hoje',
    {
      schema: {
        tags: ['Sessoes'],
        security: [{ bearerAuth: [] }],
        response: {
          200: z.object({
            data: z.array(sessaoSchema),
            disciplinas_distintas_hoje: z.number().int(),
            sessoes_por_disciplina: z.record(z.string(), z.number().int()),
          }),
        },
      },
    },
    withErrorHandler(
      onlyAluno(async (request, reply) => {
        const alunoId = await resolveAlunoId(request.user!.userId);
        const resultado = await service.listar(alunoId, { date: new Date(), limit: 100 });

        const sessoesPorDisciplina: Record<string, number> = {};
        for (const sessao of resultado.data) {
          const key = String(sessao.disciplina_id);
          sessoesPorDisciplina[key] = (sessoesPorDisciplina[key] ?? 0) + 1;
        }

        return reply.send({
          data: resultado.data,
          disciplinas_distintas_hoje: Object.keys(sessoesPorDisciplina).length,
          sessoes_por_disciplina: sessoesPorDisciplina,
        });
      }),
    ),
  );

  app.get(
    '/historico',
    {
      schema: {
        tags: ['Sessoes'],
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          page: z.coerce.number().int().positive().default(1),
          limit: z.coerce.number().int().positive().max(100).default(20),
          status: statusSessaoEnum.optional(),
        }),
        response: {
          200: z.object({
            data: z.array(sessaoSchema),
            pagination: z.object({
              page: z.number().int(),
              limit: z.number().int(),
              total: z.number().int(),
            }),
          }),
        },
      },
    },
    withErrorHandler(
      onlyAluno(async (request, reply) => {
        const alunoId = await resolveAlunoId(request.user!.userId);
        const { page, limit, status } = request.query;
        const resultado = await service.listar(alunoId, { page, limit, status });
        return reply.send(resultado);
      }),
    ),
  );
};
