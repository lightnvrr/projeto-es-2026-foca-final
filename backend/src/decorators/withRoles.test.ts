import { FastifyReply, FastifyRequest } from 'fastify';
import { withRoles } from './withRoles';
import { withErrorHandler } from './withErrorHandler';
import { Role } from '../generated/enums';

function makeReply(): jest.Mocked<FastifyReply> {
  return {
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<FastifyReply>;
}

describe('withRoles', () => {
  it('permite acesso quando o papel do ator está na lista permitida', async () => {
    const reply = makeReply();
    const request = { user: { userId: 1, role: Role.COORDENADOR } } as FastifyRequest;
    const handler = withErrorHandler(
      withRoles([Role.COORDENADOR])(async (_request: FastifyRequest, _reply: FastifyReply) => ({
        ok: true,
      })),
    );

    const result = await handler(request, reply);

    expect(result).toEqual({ ok: true });
    expect(reply.code).not.toHaveBeenCalled();
  });

  it('permite acesso quando o papel do ator está entre múltiplos papéis permitidos', async () => {
    const reply = makeReply();
    const request = { user: { userId: 2, role: Role.PROFESSOR } } as FastifyRequest;
    const handler = withErrorHandler(
      withRoles([Role.PROFESSOR, Role.COORDENADOR])(
        async (_request: FastifyRequest, _reply: FastifyReply) => ({ ok: true }),
      ),
    );

    const result = await handler(request, reply);

    expect(result).toEqual({ ok: true });
    expect(reply.code).not.toHaveBeenCalled();
  });

  it('retorna 403 quando o papel do ator não está na lista permitida', async () => {
    const reply = makeReply();
    const request = { user: { userId: 1, role: Role.ALUNO } } as FastifyRequest;
    const handler = withErrorHandler(
      withRoles([Role.COORDENADOR])(async (_request: FastifyRequest, _reply: FastifyReply) => ({
        ok: true,
      })),
    );

    await handler(request, reply);

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({
      message: 'Você não tem permissão para realizar esta ação',
    });
  });
});
