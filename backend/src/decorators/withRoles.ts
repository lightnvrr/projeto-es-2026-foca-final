import { FastifyReply, FastifyRequest } from 'fastify';
import { Role } from '../generated/enums';
import { ForbiddenError } from '../models/user/errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRouteHandler = (request: any, reply: FastifyReply) => Promise<unknown>;

export function withRoles(allowedRoles: Role[]) {
  return function <H extends AnyRouteHandler>(handler: H): H {
    return (async (request: FastifyRequest, reply: FastifyReply) => {
      if (!allowedRoles.includes(request.user!.role)) {
        throw new ForbiddenError();
      }
      return handler(request, reply);
    }) as H;
  };
}
