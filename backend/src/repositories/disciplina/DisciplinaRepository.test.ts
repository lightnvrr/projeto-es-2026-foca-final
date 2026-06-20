import { PrismaClient } from '../../generated/client';
import { DisciplinaRepository } from './DisciplinaRepository';

describe('DisciplinaRepository', () => {
  it('findAll retorna disciplinas ordenadas por nome', async () => {
    const disciplinas = [
      { id: 1, nome: 'Artes' },
      { id: 2, nome: 'Física' },
    ];
    const prisma = {
      disciplina: {
        findMany: jest.fn().mockResolvedValue(disciplinas),
      },
    };
    const repository = new DisciplinaRepository(prisma as unknown as PrismaClient);

    const result = await repository.findAll();

    expect(prisma.disciplina.findMany).toHaveBeenCalledWith({ orderBy: { nome: 'asc' } });
    expect(result).toEqual(disciplinas);
  });
});
