/* eslint-disable @typescript-eslint/ban-ts-comment */
import { AuthenticatorAdapter } from './Authenticator';
import jwt from 'jsonwebtoken';
import { Role } from '../../generated/enums';

jest.mock('jsonwebtoken');

const jwtMock = jest.mocked(jwt);

describe('Authenticator', () => {
  let instance: AuthenticatorAdapter;

  beforeEach(() => {
    instance = new AuthenticatorAdapter('secretKey', jwtMock);
  });

  it('should throw on invalid token', async () => {
    jwtMock.verify.mockImplementationOnce(() => {
      throw new Error('invalid token');
    });
    await expect(instance.authorize('invalidToken')).rejects.toThrow('invalid token');
  });

  it('should return decoded payload on valid token', async () => {
    const decodedPayload = { userId: 1, role: Role.ALUNO, validTrough: undefined };
    //@ts-ignore
    jwtMock.verify.mockReturnValueOnce({ userId: 1, role: Role.ALUNO });
    const result = await instance.authorize('validToken');
    expect(result).toEqual(decodedPayload);
  });

  it('should sign and return a JWT token', async () => {
    //@ts-ignore
    jwtMock.sign.mockReturnValueOnce('signed.token.here');
    const result = await instance.authenticate({ userId: 1, role: Role.ALUNO });
    expect(result).toBe('signed.token.here');
    expect(jwtMock.sign).toHaveBeenCalledWith({ userId: 1, role: Role.ALUNO }, 'secretKey', {
      expiresIn: '7d',
    });
  });
});
