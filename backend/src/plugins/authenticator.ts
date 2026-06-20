import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { AuthenticatorAdapter } from '../models/auth/Authenticator';
import { AuthorizeResponse } from '../models/auth/types/authenticate.type';

declare module 'fastify' {
  interface FastifyInstance {
    authenticator: AuthenticatorAdapter;
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }

  interface FastifyRequest {
    user: AuthorizeResponse | null;
  }
}

const authenticatorPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const authenticator = new AuthenticatorAdapter(process.env.JWT_SECRET as string, jwt);

  fastify.decorate('authenticator', authenticator);

  fastify.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
    const [, token] = request.headers.authorization?.split(' ') ?? [];

    if (!token) {
      throw fastify.httpErrors.unauthorized('Missing authentication token');
    }

    let payload: AuthorizeResponse;
    try {
      payload = await authenticator.authorize(token);
    } catch {
      throw fastify.httpErrors.unauthorized('Invalid or expired token');
    }

    // TODO: buscar o usuário no banco de dados a partir de payload.userId

    request.user = payload;
  });
});

export default authenticatorPlugin;
