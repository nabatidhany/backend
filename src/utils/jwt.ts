import { sign, verify } from 'hono/jwt';
import { JWT_SECRET } from '../config/jwt';
import type { UserPayload } from '../types/user';

export const generateToken = async (payload: UserPayload, expiresInSec: number = 60 * 60) => {
  const now = Math.floor(Date.now() / 1000);
  const oneYearInSeconds = 60 * 60 * 24 * 365;
  const token = await sign(
    {
      ...payload,
      exp: now + oneYearInSeconds,
      iat: now,
      iss: 'my-api',
      sub: payload.username
    },
    JWT_SECRET
  );
  return token;
};

export const verifyToken = async (token: string): Promise<UserPayload> => {
  return await verify(token, JWT_SECRET) as UserPayload;
};
