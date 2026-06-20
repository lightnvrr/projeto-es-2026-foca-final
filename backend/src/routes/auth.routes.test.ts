import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { authRoutes } from './auth.routes';
import errorHandlerPlugin from '../plugins/errorHandler';
import { Role } from '../generated/enums';
import { AuthenticatorAdapter } from '../models/auth/Authenticator';

function buildApp(
  prismaFindByEmail: jest.Mock,
  authenticateMock: jest.Mock = jest.fn().mockResolvedValue('signed.token'),
) {
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.register(sensible);
  app.register(errorHandlerPlugin);

  app.decorate('prisma', {
    usuario: { findUnique: prismaFindByEmail },
  } as never);

  app.decorate('authenticator', {
    authenticate: authenticateMock,
  } as unknown as AuthenticatorAdapter);

  app.register(authRoutes, { prefix: '/auth' });
  return app;
}

function basicAuthHeader(email: string, password: string) {
  return `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`;
}

describe('POST /auth/login', () => {
  it('retorna 401 sem header Authorization', async () => {
    const app = buildApp(jest.fn());
    const res = await app.inject({ method: 'POST', url: '/auth/login' });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ message: 'Credenciais não fornecidas' });
  });

  it('retorna 401 com header Basic mal formado (sem dois-pontos)', async () => {
    const app = buildApp(jest.fn());
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { authorization: `Basic ${Buffer.from('semDoisPontos').toString('base64')}` },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ message: 'Credenciais inválidas' });
  });

  it('retorna 401 quando email não existe', async () => {
    const app = buildApp(jest.fn().mockResolvedValue(null));
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { authorization: basicAuthHeader('naoexiste@test.com', 'senha') },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ message: 'Credenciais inválidas' });
  });

  it('retorna 401 com senha incorreta', async () => {
    const app = buildApp(
      jest.fn().mockResolvedValue({
        id: 1,
        role: Role.ALUNO,
        // bcrypt hash de "senhaCorreta"
        senha_hash: '$2b$10$rJ5vUnhPmYTx8oNsX7nj5OCYqr91yeTWbRNre/TRrTrnQDd/JAZci',
      }),
    );
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { authorization: basicAuthHeader('user@test.com', 'senhaErrada') },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ message: 'Credenciais inválidas' });
  });

  it('retorna 200 com token em credenciais válidas', async () => {
    // bcrypt hash de "senhaCorreta" (salt 10)
    const senhaHash = '$2b$10$rJ5vUnhPmYTx8oNsX7nj5OCYqr91yeTWbRNre/TRrTrnQDd/JAZci';
    const app = buildApp(
      jest.fn().mockResolvedValue({ id: 1, role: Role.ALUNO, senha_hash: senhaHash }),
    );
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { authorization: basicAuthHeader('user@test.com', 'senhaCorreta') },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ token: 'signed.token' });
  });
});
