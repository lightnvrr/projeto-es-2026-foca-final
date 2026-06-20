import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { userRoutes } from './user.route';
import errorHandlerPlugin from '../plugins/errorHandler';
import { Role, Turno } from '../generated/enums';
import { UserWithRelations } from '../models/user/types/user.types';

function makeUsuario(overrides: Partial<UserWithRelations> = {}): UserWithRelations {
  return {
    id: 1,
    nome: 'Fulano',
    email: 'fulano@example.com',
    senha_hash: 'hashed',
    role: Role.ALUNO,
    ativo: true,
    criado_em: new Date('2024-01-01T00:00:00.000Z'),
    aluno: { id: 1, usuario_id: 1, turma_id: 1, turno: Turno.MANHA },
    professor: null,
    coordenador: null,
    ...overrides,
  };
}

function buildApp(prisma: unknown, user: { userId: number; role: Role } | null) {
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.register(errorHandlerPlugin);

  app.decorate('prisma', prisma as never);
  app.decorate('authenticate', async (request) => {
    request.user = user;
  });

  app.register(userRoutes, { prefix: '/user' });
  return app;
}

describe('user routes', () => {
  it('GET /user/:id com id inválido retorna 400 com message e issues', async () => {
    const app = buildApp({}, { userId: 1, role: Role.COORDENADOR });

    const res = await app.inject({ method: 'GET', url: '/user/abc' });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual(
      expect.objectContaining({ message: 'Dados inválidos', issues: expect.any(Array) }),
    );
  });

  it('POST /user com body inválido retorna 400 com message e issues', async () => {
    const app = buildApp({}, { userId: 1, role: Role.COORDENADOR });

    const res = await app.inject({
      method: 'POST',
      url: '/user',
      payload: { role: Role.ALUNO },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual(
      expect.objectContaining({ message: 'Dados inválidos', issues: expect.any(Array) }),
    );
  });

  it('GET /user retorna 403 para Aluno', async () => {
    const app = buildApp({}, { userId: 1, role: Role.ALUNO });

    const res = await app.inject({ method: 'GET', url: '/user' });

    expect(res.statusCode).toBe(403);
  });

  it('POST /user retorna 403 para Aluno', async () => {
    const app = buildApp({}, { userId: 1, role: Role.ALUNO });

    const res = await app.inject({
      method: 'POST',
      url: '/user',
      payload: {
        nome: 'Aluno Teste',
        email: 'aluno@example.com',
        senha: 'senha1234',
        role: Role.ALUNO,
        turma_id: 1,
        turno: Turno.MANHA,
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it('PATCH /user/:id retorna 403 para não-Coordenador', async () => {
    const app = buildApp({}, { userId: 1, role: Role.PROFESSOR });

    const res = await app.inject({ method: 'PATCH', url: '/user/1', payload: { nome: 'Novo' } });

    expect(res.statusCode).toBe(403);
  });

  it('DELETE /user/:id retorna 403 para não-Coordenador', async () => {
    const app = buildApp({}, { userId: 1, role: Role.PROFESSOR });

    const res = await app.inject({ method: 'DELETE', url: '/user/1' });

    expect(res.statusCode).toBe(403);
  });

  it('DELETE /user/:id remove o usuário e retorna 204 sem corpo', async () => {
    const usuario = makeUsuario({
      role: Role.PROFESSOR,
      aluno: null,
      professor: { id: 1, usuario_id: 1, coordenador_id: null },
    });
    const prisma = {
      usuario: {
        findUnique: jest.fn().mockResolvedValue(usuario),
        delete: jest.fn().mockResolvedValue(usuario),
      },
    };
    const app = buildApp(prisma, { userId: 99, role: Role.COORDENADOR });

    const res = await app.inject({ method: 'DELETE', url: '/user/1' });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe('');
  });
});
