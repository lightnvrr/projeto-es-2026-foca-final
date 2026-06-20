import {
  AlunoModel,
  CoordenadorModel,
  ProfessorModel,
  UsuarioModel,
} from '../../../generated/models';
import { AuthorizeResponse } from '../../auth/types/authenticate.type';

export type AuthenticatedActor = AuthorizeResponse;

export type UserWithRelations = UsuarioModel & {
  aluno: AlunoModel | null;
  professor: ProfessorModel | null;
  coordenador: CoordenadorModel | null;
};

export type SafeUser = Omit<UserWithRelations, 'senha_hash'>;
