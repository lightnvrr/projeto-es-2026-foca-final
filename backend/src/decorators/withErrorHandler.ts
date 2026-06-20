import { FastifyReply } from 'fastify';
import { AppError } from '../models/user/errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRouteHandler = (request: any, reply: FastifyReply) => Promise<unknown>;

export function withErrorHandler<H extends AnyRouteHandler>(handler: H): H {
  return (async (request, reply) => {
    try {
      return await handler(request, reply);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send({
          message: error.message,
          ...('issues' in error ? { issues: error.issues } : {}),
        });
      }
      throw error;
    }
  }) as H;
}
