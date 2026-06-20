import { ZodIssue } from 'zod';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Você não tem permissão para realizar esta ação') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Usuário não encontrado') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Já existe um usuário com este email') {
    super(message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(
    message = 'Dados inválidos',
    public readonly issues?: ZodIssue[],
  ) {
    super(message, 400);
  }
}
