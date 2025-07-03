import type { UserPayload } from './user';

declare module 'hono' {
  interface ContextVariableMap {
    user: UserPayload;
  }
}
