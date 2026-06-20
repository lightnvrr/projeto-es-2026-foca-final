/* eslint-disable @typescript-eslint/ban-ts-comment */
import { PrismaClient } from '../../generated/client';
import { Role, Turno } from '../../generated/enums';
import { UserRepository } from './UserRepository';

function createPrismaMock() {
  const tx = {
    usuario: {
      create: jest.fn(),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    aluno: { create: jest.fn(), update: jest.fn() },
    professor: { create: jest.fn(), update: jest.fn() },
    coordenador: { create: jest.fn(), update: jest.fn() },
  };

  // @ts-ignore circular ref in mock is intentional
  const prisma = {
    usuario: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    coordenador: {
      findUnique: jest.fn(),
    },
    // @ts-ignore
    $transaction: jest.fn((callback: (tx: typeof tx) => unknown) => callback(tx)),
    tx,
  };

  return prisma;
}

describe('UserRepository', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let repository: UserRepository;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new UserRepository(prisma as unknown as PrismaClient);
  });

  it('findById busca usuário com relações', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: 1 });

    await repository.findById(1);

    expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: { aluno: true, professor: true, coordenador: true },
    });
  });

  it('createAluno cria Usuario e Aluno em uma transação', async () => {
    prisma.tx.usuario.create.mockResolvedValue({ id: 1, role: Role.ALUNO });
    prisma.tx.aluno.create.mockResolvedValue({
      id: 1,
      usuario_id: 1,
      turma_id: 2,
      turno: Turno.MANHA,
    });

    const result = await repository.createAluno({
      nome: 'Aluno',
      email: 'aluno@example.com',
      senha_hash: 'hash',
      turma_id: 2,
      turno: Turno.MANHA,
    });

    expect(prisma.tx.usuario.create).toHaveBeenCalledWith({
      data: { nome: 'Aluno', email: 'aluno@example.com', senha_hash: 'hash', role: Role.ALUNO },
    });
    expect(prisma.tx.aluno.create).toHaveBeenCalledWith({
      data: { usuario_id: 1, turma_id: 2, turno: Turno.MANHA },
    });
    expect(result.aluno).toEqual({ id: 1, usuario_id: 1, turma_id: 2, turno: Turno.MANHA });
  });

  it('createProfessor cria Usuario e Professor com vínculo de coordenador', async () => {
    prisma.tx.usuario.create.mockResolvedValue({ id: 1, role: Role.PROFESSOR });
    prisma.tx.professor.create.mockResolvedValue({
      id: 1,
      usuario_id: 1,
      coordenador_id: 10,
    });

    const result = await repository.createProfessor({
      nome: 'Professor',
      email: 'professor@example.com',
      senha_hash: 'hash',
      coordenador_id: 10,
    });

    expect(prisma.tx.professor.create).toHaveBeenCalledWith({
      data: { usuario_id: 1, coordenador_id: 10 },
    });
    expect(result.professor).toEqual({ id: 1, usuario_id: 1, coordenador_id: 10 });
  });

  it('update atualiza Usuario e subtabela conforme o role', async () => {
    prisma.tx.usuario.findUniqueOrThrow.mockResolvedValue({ id: 1, role: Role.ALUNO });

    await repository.update(
      1,
      Role.ALUNO,
      { nome: 'Novo nome' },
      { turma_id: 3, turno: Turno.TARDE },
    );

    expect(prisma.tx.usuario.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { nome: 'Novo nome' },
    });
    expect(prisma.tx.aluno.update).toHaveBeenCalledWith({
      where: { usuario_id: 1 },
      data: { turma_id: 3, turno: Turno.TARDE },
    });
    expect(prisma.tx.professor.update).not.toHaveBeenCalled();
    expect(prisma.tx.coordenador.update).not.toHaveBeenCalled();
  });

  it('delete remove o usuário', async () => {
    await repository.delete(1);

    expect(prisma.usuario.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
