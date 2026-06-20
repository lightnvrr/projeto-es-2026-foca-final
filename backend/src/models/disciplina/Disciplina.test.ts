import { DisciplinaRepository } from '../../repositories/disciplina/DisciplinaRepository';
import { DisciplinaService } from './Disciplina';

jest.mock('../../repositories/disciplina/DisciplinaRepository');

describe('DisciplinaService', () => {
  it('listar delega ao repository', async () => {
    const repository = new DisciplinaRepository(
      undefined as never,
    ) as jest.Mocked<DisciplinaRepository>;
    const service = new DisciplinaService(repository);
    const disciplinas = [{ id: 1, nome: 'Matemática' }];
    repository.findAll.mockResolvedValue(disciplinas as never);

    const result = await service.listar();

    expect(repository.findAll).toHaveBeenCalled();
    expect(result).toEqual(disciplinas);
  });
});
