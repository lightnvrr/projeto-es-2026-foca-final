import { FastifyReply, FastifyRequest } from 'fastify';
import { withErrorHandler } from './withErrorHandler';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../models/user/errors';

function makeReply(): jest.Mocked<FastifyReply> {
  return {
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<FastifyReply>;
}

const request = {} as FastifyRequest;

describe('withErrorHandler', () => {
  it('retorna 403 para ForbiddenError', async () => {
    const reply = makeReply();
    const handler = withErrorHandler(async (_request: FastifyRequest, _reply: FastifyReply) => {
      throw new ForbiddenError();
    });

    await handler(request, reply);

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({
      message: 'Você não tem permissão para realizar esta ação',
    });
  });

  it('retorna 404 para NotFoundError', async () => {
    const reply = makeReply();
    const handler = withErrorHandler(async (_request: FastifyRequest, _reply: FastifyReply) => {
      throw new NotFoundError();
    });

    await handler(request, reply);

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({ message: 'Usuário não encontrado' });
  });

  it('retorna 409 para ConflictError', async () => {
    const reply = makeReply();
    const handler = withErrorHandler(async (_request: FastifyRequest, _reply: FastifyReply) => {
      throw new ConflictError();
    });

    await handler(request, reply);

    expect(reply.code).toHaveBeenCalledWith(409);
    expect(reply.send).toHaveBeenCalledWith({
      message: 'Já existe um usuário com este email',
    });
  });

  it('retorna 400 com issues para ValidationError', async () => {
    const reply = makeReply();
    const issues = [{ code: 'custom', path: ['email'], message: 'Email inválido' }] as never;
    const handler = withErrorHandler(async (_request: FastifyRequest, _reply: FastifyReply) => {
      throw new ValidationError('Dados inválidos', issues);
    });

    await handler(request, reply);

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ message: 'Dados inválidos', issues });
  });

  it('retorna 400 com issues undefined quando ValidationError não recebe issues', async () => {
    const reply = makeReply();
    const handler = withErrorHandler(async (_request: FastifyRequest, _reply: FastifyReply) => {
      throw new ValidationError('Dados inválidos');
    });

    await handler(request, reply);

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ message: 'Dados inválidos', issues: undefined });
  });

  it('relança erros que não são AppError', async () => {
    const reply = makeReply();
    const handler = withErrorHandler(async (_request: FastifyRequest, _reply: FastifyReply) => {
      throw new Error('boom');
    });

    await expect(handler(request, reply)).rejects.toThrow('boom');
    expect(reply.code).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
  });

  it('retorna o valor do handler quando não há erro', async () => {
    const reply = makeReply();
    const handler = withErrorHandler(async (_request: FastifyRequest, _reply: FastifyReply) => ({
      ok: true,
    }));

    const result = await handler(request, reply);

    expect(result).toEqual({ ok: true });
    expect(reply.code).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
  });
});
