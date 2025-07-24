// middlewares/isAdmin.ts
import { MiddlewareHandler } from 'hono'
import { db } from '../db/client'
import { errorResponse } from '../utils/response'

export const isAdmin: MiddlewareHandler = async (c, next) => {
  const jwtPayload = c.get('user') as { id: number }

  const [users]: any = await db.query(`SELECT level FROM users WHERE id = ?`, [jwtPayload.id])
  if (users.length === 0) {
    return c.json(errorResponse('User tidak ditemukan'), 404)
  }

  if (Number(users[0].level) !== 1) {
    return c.json(errorResponse('Anda tidak memiliki izin untuk melakukan aksi ini'), 403)
  }

  await next()
}
