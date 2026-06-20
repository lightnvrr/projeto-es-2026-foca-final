import { DisciplinaModel } from '../../generated/models';
import { DisciplinaRepository } from '../../repositories/disciplina/DisciplinaRepository';

export class DisciplinaService {
  constructor(private readonly repository: DisciplinaRepository) {}

  listar(): Promise<DisciplinaModel[]> {
    return this.repository.findAll();
  }
}
