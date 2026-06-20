import { Role } from '../../generated/enums';
import {
  UpdateRoleProfileData,
  UpdateUserData,
  UserRepository,
} from '../../repositories/user/UserRepository';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from './errors';
import { hashPassword } from './hash';
import {
  createUserSchema,
  updateUserSchema,
  createAlunoRepositoryDataSchema,
  createProfessorRepositoryDataSchema,
  createCoordenadorRepositoryDataSchema,
  updateUserRepositoryDataSchema,
  updateRoleProfileRepositoryDataSchema,
} from './schemas/user.schema';
import { AuthenticatedActor, SafeUser, UserWithRelations } from './types/user.types';

export class UserService {
  constructor(private readonly repository: UserRepository) {}

  async create(actor: AuthenticatedActor, rawPayload: unknown): Promise<SafeUser> {
    const parsed = createUserSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new ValidationError('Dados inválidos para criação de usuário', parsed.error.issues);
    }
    const payload = parsed.data;

    const existing = await this.repository.findByEmail(payload.email);
    if (existing) {
      throw new ConflictError();
    }

    const passwordHash = await hashPassword(payload.senha);

    if (payload.role === Role.ALUNO) {
      const studentData = createAlunoRepositoryDataSchema.parse({
        ...payload,
        senha_hash: passwordHash,
      });
      const user = await this.repository.createAluno(studentData);
      return this.toSafeUser(user);
    }

    if (actor.role !== Role.COORDENADOR) {
      throw new ForbiddenError('Apenas coordenadores podem criar professores ou coordenadores');
    }

    const coordinator = await this.repository.findCoordenadorByUsuarioId(actor.userId);
    if (!coordinator) {
      throw new ForbiddenError('Coordenador autenticado não encontrado');
    }

    if (payload.role === Role.PROFESSOR) {
      const teacherData = createProfessorRepositoryDataSchema.parse({
        ...payload,
        senha_hash: passwordHash,
        coordenador_id: coordinator.id,
      });
      const user = await this.repository.createProfessor(teacherData);
      return this.toSafeUser(user);
    }

    const coordinatorData = createCoordenadorRepositoryDataSchema.parse({
      ...payload,
      senha_hash: passwordHash,
    });
    const user = await this.repository.createCoordenador(coordinatorData);
    return this.toSafeUser(user);
  }

  async getById(actor: AuthenticatedActor, targetId: number): Promise<SafeUser> {
    if (actor.role !== Role.COORDENADOR && actor.userId !== targetId) {
      throw new ForbiddenError();
    }

    const user = await this.repository.findById(targetId);
    if (!user) {
      throw new NotFoundError();
    }
    return this.toSafeUser(user);
  }

  async list(_actor: AuthenticatedActor): Promise<SafeUser[]> {
    const users = await this.repository.list();
    return users.map((user) => this.toSafeUser(user));
  }

  async update(
    _actor: AuthenticatedActor,
    targetId: number,
    rawPayload: unknown,
  ): Promise<SafeUser> {
    const target = await this.repository.findById(targetId);
    if (!target) {
      throw new NotFoundError();
    }

    const parsed = updateUserSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new ValidationError('Dados inválidos para atualização de usuário', parsed.error.issues);
    }
    const payload = parsed.data;

    if (payload.email && payload.email !== target.email) {
      const existing = await this.repository.findByEmail(payload.email);
      if (existing) {
        throw new ConflictError();
      }
    }

    const userData: UpdateUserData = updateUserRepositoryDataSchema.parse(payload);
    if (payload.senha) {
      userData.senha_hash = await hashPassword(payload.senha);
    }

    const roleProfileData: UpdateRoleProfileData =
      updateRoleProfileRepositoryDataSchema.parse(payload);

    const updated = await this.repository.update(targetId, target.role, userData, roleProfileData);
    return this.toSafeUser(updated);
  }

  async delete(_actor: AuthenticatedActor, targetId: number): Promise<void> {
    const target = await this.repository.findById(targetId);
    if (!target) {
      throw new NotFoundError();
    }

    await this.repository.delete(targetId);
  }

  private toSafeUser(user: UserWithRelations): SafeUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { senha_hash, ...safeUser } = user;
    return safeUser;
  }
}
