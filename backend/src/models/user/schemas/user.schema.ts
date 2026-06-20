import { z } from 'zod';
import { Role, Turno } from '../../../generated/enums';

const baseUserSchema = z.object({
  nome: z.string().min(1).max(150),
  email: z.string().email().max(100),
  senha: z.string().min(8),
});

export const createAlunoSchema = baseUserSchema.extend({
  role: z.literal(Role.ALUNO),
  turma_id: z.number().int().positive(),
  turno: z.enum(Turno),
});

export const createProfessorSchema = baseUserSchema.extend({
  role: z.literal(Role.PROFESSOR),
});

export const createCoordenadorSchema = baseUserSchema.extend({
  role: z.literal(Role.COORDENADOR),
});

export const createUserSchema = z.discriminatedUnion('role', [
  createAlunoSchema,
  createProfessorSchema,
  createCoordenadorSchema,
]);

export const updateUserSchema = z
  .object({
    nome: z.string().min(1).max(150).optional(),
    email: z.string().email().max(100).optional(),
    senha: z.string().min(8).optional(),
    ativo: z.boolean().optional(),
    turma_id: z.number().int().positive().optional(),
    turno: z.enum(Turno).optional(),
    coordenador_id: z.number().int().positive().nullable().optional(),
  })
  .strict();

export const createAlunoRepositoryDataSchema = createAlunoSchema
  .omit({ role: true, senha: true })
  .extend({ senha_hash: z.string() });

export const createProfessorRepositoryDataSchema = createProfessorSchema
  .omit({ role: true, senha: true })
  .extend({
    senha_hash: z.string(),
    coordenador_id: z.number().int().positive(),
  });

export const createCoordenadorRepositoryDataSchema = createCoordenadorSchema
  .omit({ role: true, senha: true })
  .extend({ senha_hash: z.string() });

export const updateUserRepositoryDataSchema = updateUserSchema
  .pick({ nome: true, email: true, ativo: true })
  .strip();

export const updateRoleProfileRepositoryDataSchema = updateUserSchema
  .pick({ turma_id: true, turno: true, coordenador_id: true })
  .strip();

export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const alunoRelationSchema = z.object({
  id: z.number().int(),
  usuario_id: z.number().int(),
  turma_id: z.number().int(),
  turno: z.enum(Turno),
});

const professorRelationSchema = z.object({
  id: z.number().int(),
  usuario_id: z.number().int(),
  coordenador_id: z.number().int().nullable(),
});

const coordenadorRelationSchema = z.object({
  id: z.number().int(),
  usuario_id: z.number().int(),
});

export const safeUserSchema = z.object({
  id: z.number().int(),
  nome: z.string(),
  email: z.string(),
  role: z.enum(Role),
  ativo: z.boolean(),
  criado_em: z.date(),
  aluno: alunoRelationSchema.nullable(),
  professor: professorRelationSchema.nullable(),
  coordenador: coordenadorRelationSchema.nullable(),
});

export const safeUserListSchema = z.array(safeUserSchema);
