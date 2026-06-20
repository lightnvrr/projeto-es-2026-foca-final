import { PrismaClient } from '../../generated/client';
import { DisciplinaModel } from '../../generated/models';

export class DisciplinaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll(): Promise<DisciplinaModel[]> {
    return this.prisma.disciplina.findMany({ orderBy: { nome: 'asc' } });
  }
}
