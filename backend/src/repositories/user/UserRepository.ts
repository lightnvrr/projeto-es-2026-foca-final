import { Prisma, PrismaClient } from '../../generated/client';
import { Role, Turno } from '../../generated/enums';
import { UserWithRelations } from '../../models/user/types/user.types';

const INCLUDE_RELATIONS = {
  aluno: true,
  professor: true,
  coordenador: true,
} as const;

type TransactionClient = Prisma.TransactionClient;

export type CreateStudentData = {
  nome: string;
  email: string;
  senha_hash: string;
  turma_id: number;
  turno: Turno;
};

export type CreateTeacherData = {
  nome: string;
  email: string;
  senha_hash: string;
  coordenador_id: number;
};

export type CreateCoordinatorData = {
  nome: string;
  email: string;
  senha_hash: string;
};

export type UpdateUserData = {
  nome?: string;
  email?: string;
  senha_hash?: string;
  ativo?: boolean;
};

export type UpdateRoleProfileData = {
  turma_id?: number;
  turno?: Turno;
  coordenador_id?: number | null;
};

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: number): Promise<UserWithRelations | null> {
    return this.prisma.usuario.findUnique({
      where: { id },
      include: INCLUDE_RELATIONS,
    });
  }

  findByEmail(email: string): Promise<UserWithRelations | null> {
    return this.prisma.usuario.findUnique({
      where: { email },
      include: INCLUDE_RELATIONS,
    });
  }

  findCoordenadorByUsuarioId(usuarioId: number) {
    return this.prisma.coordenador.findUnique({
      where: { usuario_id: usuarioId },
    });
  }

  list(): Promise<UserWithRelations[]> {
    return this.prisma.usuario.findMany({
      include: INCLUDE_RELATIONS,
      orderBy: { id: 'asc' },
    });
  }

  createAluno(data: CreateStudentData): Promise<UserWithRelations> {
    return this.prisma.$transaction(async (tx: TransactionClient) => {
      const usuario = await tx.usuario.create({
        data: {
          nome: data.nome,
          email: data.email,
          senha_hash: data.senha_hash,
          role: Role.ALUNO,
        },
      });

      const aluno = await tx.aluno.create({
        data: {
          usuario_id: usuario.id,
          turma_id: data.turma_id,
          turno: data.turno,
        },
      });

      return { ...usuario, aluno, professor: null, coordenador: null };
    });
  }

  createProfessor(data: CreateTeacherData): Promise<UserWithRelations> {
    return this.prisma.$transaction(async (tx: TransactionClient) => {
      const usuario = await tx.usuario.create({
        data: {
          nome: data.nome,
          email: data.email,
          senha_hash: data.senha_hash,
          role: Role.PROFESSOR,
        },
      });

      const professor = await tx.professor.create({
        data: {
          usuario_id: usuario.id,
          coordenador_id: data.coordenador_id,
        },
      });

      return { ...usuario, aluno: null, professor, coordenador: null };
    });
  }

  createCoordenador(data: CreateCoordinatorData): Promise<UserWithRelations> {
    return this.prisma.$transaction(async (tx: TransactionClient) => {
      const usuario = await tx.usuario.create({
        data: {
          nome: data.nome,
          email: data.email,
          senha_hash: data.senha_hash,
          role: Role.COORDENADOR,
        },
      });

      const coordenador = await tx.coordenador.create({
        data: {
          usuario_id: usuario.id,
        },
      });

      return { ...usuario, aluno: null, professor: null, coordenador };
    });
  }

  async update(
    id: number,
    role: Role,
    userData: UpdateUserData,
    subtableData: UpdateRoleProfileData,
  ): Promise<UserWithRelations> {
    return this.prisma.$transaction(async (tx: TransactionClient) => {
      await tx.usuario.update({
        where: { id },
        data: userData,
      });

      if (
        role === Role.ALUNO &&
        (subtableData.turma_id !== undefined || subtableData.turno !== undefined)
      ) {
        await tx.aluno.update({
          where: { usuario_id: id },
          data: {
            turma_id: subtableData.turma_id,
            turno: subtableData.turno,
          },
        });
      }

      if (role === Role.PROFESSOR && subtableData.coordenador_id !== undefined) {
        await tx.professor.update({
          where: { usuario_id: id },
          data: {
            coordenador_id: subtableData.coordenador_id,
          },
        });
      }

      return tx.usuario.findUniqueOrThrow({
        where: { id },
        include: INCLUDE_RELATIONS,
      });
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.usuario.delete({ where: { id } });
  }
}
