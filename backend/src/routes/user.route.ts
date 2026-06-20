import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { UserService } from '../models/user/User';
import { UserRepository } from '../repositories/user/UserRepository';
import { withErrorHandler } from '../decorators/withErrorHandler';
import { withRoles } from '../decorators/withRoles';
import { Role } from '../generated/enums';
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  safeUserSchema,
  safeUserListSchema,
} from '../models/user/schemas/user.schema';

export const userRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  const repository = new UserRepository(fastify.prisma);
  const userService = new UserService(repository);

  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.addHook('preHandler', app.authenticate);

  app.post(
    '/',
    {
      schema: {
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        body: createUserSchema,
        response: { 201: safeUserSchema },
      },
    },
    withErrorHandler(
      withRoles([Role.PROFESSOR, Role.COORDENADOR])(async (request, reply) => {
        const user = await userService.create(request.user!, request.body);
        return reply.code(201).send(user);
      }),
    ),
  );

  app.get(
    '/',
    {
      schema: {
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        response: { 200: safeUserListSchema },
      },
    },
    withErrorHandler(
      withRoles([Role.COORDENADOR])(async (request) => userService.list(request.user!)),
    ),
  );

  app.get(
    '/:id',
    {
      schema: {
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        params: userIdParamSchema,
        response: { 200: safeUserSchema },
      },
    },
    withErrorHandler(async (request) => userService.getById(request.user!, request.params.id)),
  );

  app.patch(
    '/:id',
    {
      schema: {
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        params: userIdParamSchema,
        body: updateUserSchema,
        response: { 200: safeUserSchema },
      },
    },
    withErrorHandler(
      withRoles([Role.COORDENADOR])(async (request) =>
        userService.update(request.user!, request.params.id, request.body),
      ),
    ),
  );

  app.delete(
    '/:id',
    { schema: { tags: ['Users'], security: [{ bearerAuth: [] }], params: userIdParamSchema } },
    withErrorHandler(
      withRoles([Role.COORDENADOR])(async (request, reply) => {
        await userService.delete(request.user!, request.params.id);
        return reply.code(204).send();
      }),
    ),
  );
};
