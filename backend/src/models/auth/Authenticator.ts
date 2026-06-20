import jwt from 'jsonwebtoken';
import { AuthorizeResponse } from './types/authenticate.type';

export class AuthenticatorAdapter {
  private readonly authenticator: typeof jwt;
  private readonly secretKey: string;

  constructor(secretKey: string, authenticator: typeof jwt) {
    this.secretKey = secretKey;
    this.authenticator = authenticator;
  }

  async authenticate(payload: AuthorizeResponse): Promise<string> {
    return this.authenticator.sign({ userId: payload.userId, role: payload.role }, this.secretKey, {
      expiresIn: '7d',
    }) as string;
  }

  async authorize(token: string): Promise<AuthorizeResponse> {
    const decoded = this.authenticator.verify(token, this.secretKey) as AuthorizeResponse;
    return {
      userId: decoded.userId,
      role: decoded.role,
      validTrough: decoded.validTrough,
    };
  }
}
