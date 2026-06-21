import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { withErrorHandler } from '../decorators/withErrorHandler';

const turmaSchema = z.object({
  id: z.number().int(),
  nome: z.string(),
  ano_letivo: z.number().int(),
});

export const turmaRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.addHook('preHandler', app.authenticate);

  app.get(
    '/',
    {
      schema: {
        tags: ['Turmas'],
        security: [{ bearerAuth: [] }],
        response: { 200: z.array(turmaSchema) },
      },
    },
    withErrorHandler(async (_request, reply) => {
      const turmas = await fastify.prisma.turma.findMany({ orderBy: { nome: 'asc' } });
      return reply.send(turmas);
    }),
  );
};
