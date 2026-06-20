import { Role, Turno } from '../../generated/enums';
import { UserRepository } from '../../repositories/user/UserRepository';
import { UserService } from './User';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from './errors';
import { UserWithRelations } from './types/user.types';

jest.mock('../../repositories/user/UserRepository');

function makeUsuario(overrides: Partial<UserWithRelations> = {}): UserWithRelations {
  return {
    id: 1,
    nome: 'Fulano',
    email: 'fulano@example.com',
    senha_hash: 'hashed',
    role: Role.ALUNO,
    ativo: true,
    criado_em: new Date(),
    aluno: null,
    professor: null,
    coordenador: null,
    ...overrides,
  };
}

describe('UserService', () => {
  let repository: jest.Mocked<UserRepository>;
  let service: UserService;

  beforeEach(() => {
    repository = new UserRepository(undefined as never) as jest.Mocked<UserRepository>;
    service = new UserService(repository);
  });

  describe('create', () => {
    const alunoPayload = {
      nome: 'Aluno Teste',
      email: 'aluno@example.com',
      senha: 'senha1234',
      role: Role.ALUNO,
      turma_id: 1,
      turno: Turno.MANHA,
    };

    it('rejeita payload inválido', async () => {
      const actor = { userId: 1, role: Role.COORDENADOR };
      await expect(service.create(actor, { role: Role.ALUNO })).rejects.toThrow(ValidationError);
    });

    it('Professor pode criar Aluno', async () => {
      const actor = { userId: 2, role: Role.PROFESSOR };
      repository.findByEmail.mockResolvedValue(null);
      repository.createAluno.mockResolvedValue(
        makeUsuario({
          email: alunoPayload.email,
          aluno: { id: 1, usuario_id: 1, turma_id: 1, turno: Turno.MANHA },
        }),
      );

      const result = await service.create(actor, alunoPayload);

      expect(repository.createAluno).toHaveBeenCalledWith(
        expect.objectContaining({ turma_id: 1, turno: Turno.MANHA, email: alunoPayload.email }),
      );
      expect(result).not.toHaveProperty('senha_hash');
    });

    it('Professor não pode criar Professor', async () => {
      const actor = { userId: 2, role: Role.PROFESSOR };
      repository.findByEmail.mockResolvedValue(null);

      await expect(
        service.create(actor, {
          nome: 'Prof Teste',
          email: 'prof@example.com',
          senha: 'senha1234',
          role: Role.PROFESSOR,
        }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('Professor não pode criar Coordenador', async () => {
      const actor = { userId: 2, role: Role.PROFESSOR };
      repository.findByEmail.mockResolvedValue(null);

      await expect(
        service.create(actor, {
          nome: 'Coord Teste',
          email: 'coord@example.com',
          senha: 'senha1234',
          role: Role.COORDENADOR,
        }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('Coordenador cria Professor herdando vínculo do coordenador', async () => {
      const actor = { userId: 3, role: Role.COORDENADOR };
      repository.findByEmail.mockResolvedValue(null);
      repository.findCoordenadorByUsuarioId.mockResolvedValue({
        id: 10,
        usuario_id: 3,
      });
      repository.createProfessor.mockResolvedValue(
        makeUsuario({
          role: Role.PROFESSOR,
          professor: { id: 1, usuario_id: 1, coordenador_id: 10 },
        }),
      );

      await service.create(actor, {
        nome: 'Prof Teste',
        email: 'prof@example.com',
        senha: 'senha1234',
        role: Role.PROFESSOR,
      });

      expect(repository.createProfessor).toHaveBeenCalledWith(
        expect.objectContaining({ coordenador_id: 10 }),
      );
    });

    it('Coordenador pode criar outro Coordenador', async () => {
      const actor = { userId: 3, role: Role.COORDENADOR };
      repository.findByEmail.mockResolvedValue(null);
      repository.findCoordenadorByUsuarioId.mockResolvedValue({
        id: 10,
        usuario_id: 3,
      });
      repository.createCoordenador.mockResolvedValue(
        makeUsuario({
          role: Role.COORDENADOR,
          coordenador: { id: 2, usuario_id: 1 },
        }),
      );

      await service.create(actor, {
        nome: 'Coord Teste',
        email: 'coord@example.com',
        senha: 'senha1234',
        role: Role.COORDENADOR,
      });

      expect(repository.createCoordenador).toHaveBeenCalled();
    });

    it('Coordenador cria Aluno sem herdar coordenador_id', async () => {
      const actor = { userId: 3, role: Role.COORDENADOR };
      repository.findByEmail.mockResolvedValue(null);
      repository.findCoordenadorByUsuarioId.mockResolvedValue({
        id: 10,
        usuario_id: 3,
      });
      repository.createAluno.mockResolvedValue(
        makeUsuario({
          role: Role.ALUNO,
          aluno: { id: 1, usuario_id: 1, turma_id: 1, turno: Turno.MANHA },
        }),
      );

      await service.create(actor, alunoPayload);

      const [studentData] = repository.createAluno.mock.calls[0];
      expect(studentData).not.toHaveProperty('coordenador_id');
      expect(studentData).toEqual(expect.objectContaining({ turma_id: 1, turno: Turno.MANHA }));
    });

    it('rejeita email duplicado', async () => {
      const actor = { userId: 2, role: Role.PROFESSOR };
      repository.findByEmail.mockResolvedValue(makeUsuario());

      await expect(service.create(actor, alunoPayload)).rejects.toThrow(ConflictError);
    });
  });

  describe('getById', () => {
    it('Coordenador pode ver qualquer usuário', async () => {
      const actor = { userId: 1, role: Role.COORDENADOR };
      repository.findById.mockResolvedValue(makeUsuario({ id: 5 }));

      const result = await service.getById(actor, 5);
      expect(result.id).toBe(5);
    });

    it('Aluno não pode ver perfil de outro usuário', async () => {
      const actor = { userId: 1, role: Role.ALUNO };

      await expect(service.getById(actor, 5)).rejects.toThrow(ForbiddenError);
    });

    it('Aluno pode ver o próprio perfil', async () => {
      const actor = { userId: 1, role: Role.ALUNO };
      repository.findById.mockResolvedValue(makeUsuario({ id: 1 }));

      const result = await service.getById(actor, 1);
      expect(result.id).toBe(1);
    });
  });

  describe('list', () => {
    it('retorna a lista de usuários', async () => {
      const coordenador = { userId: 2, role: Role.COORDENADOR };
      repository.list.mockResolvedValue([makeUsuario()]);

      await expect(service.list(coordenador)).resolves.toHaveLength(1);
    });
  });

  describe('update', () => {
    it('lança NotFoundError se usuário alvo não existir', async () => {
      const actor = { userId: 1, role: Role.COORDENADOR };
      repository.findById.mockResolvedValue(null);

      await expect(service.update(actor, 5, { nome: 'Novo nome' })).rejects.toThrow(NotFoundError);
    });

    it('hasheia a senha antes de atualizar', async () => {
      const actor = { userId: 1, role: Role.COORDENADOR };
      const target = makeUsuario({ id: 5 });
      repository.findById.mockResolvedValue(target);
      repository.update.mockResolvedValue(target);

      await service.update(actor, 5, { senha: 'novaSenha123' });

      const [, , userData] = repository.update.mock.calls[0];
      expect(userData.senha_hash).toBeDefined();
      expect(userData.senha_hash).not.toBe('novaSenha123');
    });
  });

  describe('delete', () => {
    it('lança NotFoundError se usuário alvo não existir', async () => {
      const actor = { userId: 1, role: Role.COORDENADOR };
      repository.findById.mockResolvedValue(null);

      await expect(service.delete(actor, 5)).rejects.toThrow(NotFoundError);
    });

    it('deleta o usuário quando encontrado', async () => {
      const actor = { userId: 1, role: Role.COORDENADOR };
      repository.findById.mockResolvedValue(makeUsuario({ id: 5 }));

      await service.delete(actor, 5);

      expect(repository.delete).toHaveBeenCalledWith(5);
    });
  });
});
