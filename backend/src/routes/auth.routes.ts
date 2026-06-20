import { type FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { UserRepository } from '../repositories/user/UserRepository';
import { comparePassword } from '../models/user/hash';

const loginResponseSchema = z.object({ token: z.string() });

export const authRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.post(
    '/login',
    {
      schema: {
        tags: ['Auth'],
        response: { 200: loginResponseSchema },
      },
    },
    async (request, reply) => {
      const authHeader = request.headers.authorization;

      if (!authHeader?.startsWith('Basic ')) {
        throw fastify.httpErrors.unauthorized('Credenciais não fornecidas');
      }

      const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
      const colonIndex = decoded.indexOf(':');

      if (colonIndex === -1) {
        throw fastify.httpErrors.unauthorized('Credenciais inválidas');
      }

      const email = decoded.slice(0, colonIndex);
      const password = decoded.slice(colonIndex + 1);

      const repo = new UserRepository(fastify.prisma);
      const user = await repo.findByEmail(email);

      if (!user || !(await comparePassword(password, user.senha_hash))) {
        throw fastify.httpErrors.unauthorized('Credenciais inválidas');
      }

      const token = await fastify.authenticator.authenticate({
        userId: user.id,
        role: user.role,
      });

      return reply.send({ token });
    },
  );
};
