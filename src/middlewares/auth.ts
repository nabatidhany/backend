import type { MiddlewareHandler } from 'hono';
import { verifyToken } from '../utils/jwt';
import type { UserPayload } from '../types/user';

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return c.json({ message: 'Unauthorized, token not provided' }, 401);
  }

  try {
    const payload = await verifyToken(token) as UserPayload;

    if (!payload.username) {
      return c.json({ message: 'Invalid token structure' }, 400);
    }

    c.set('user', payload);
    await next();
  } catch (e) {
    return c.json({ message: 'Invalid token' }, 401);
  }
};
