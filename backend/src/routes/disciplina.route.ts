import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { DisciplinaService } from '../models/disciplina/Disciplina';
import { DisciplinaRepository } from '../repositories/disciplina/DisciplinaRepository';
import { withErrorHandler } from '../decorators/withErrorHandler';

const disciplinaSchema = z.object({
  id: z.number().int(),
  nome: z.string(),
});

export const disciplinaRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  const repository = new DisciplinaRepository(fastify.prisma);
  const disciplinaService = new DisciplinaService(repository);

  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    '/',
    { schema: { tags: ['Disciplinas'], response: { 200: z.array(disciplinaSchema) } } },
    withErrorHandler(async (_request, reply) => {
      const disciplinas = await disciplinaService.listar();
      return reply.send(disciplinas);
    }),
  );
};
