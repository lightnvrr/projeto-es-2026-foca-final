import fp from 'fastify-plugin';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

export default fp(async (fastify) => {
  fastify.setErrorHandler((error, _request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.code(400).send({
        message: 'Dados inválidos',
        issues: error.validation.map((issue) => ({
          code: issue.keyword,
          path: issue.instancePath.split('/').filter(Boolean),
          message: issue.message,
          ...issue.params,
        })),
      });
    }
    throw error;
  });
});
