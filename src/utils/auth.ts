import { Context } from 'hono'
import { db } from '../db/client'
import { errorResponse } from './response'

export const checkIsAdmin = async (c: Context) => {
  const jwtPayload = c.get('user') as { id: number }

  const [users]: any = await db.query(`SELECT level FROM users WHERE id = ?`, [jwtPayload.id])
  if (users.length === 0) {
    return { ok: false, error: c.json(errorResponse('User tidak ditemukan'), 404) }
  }

  if (Number(users[0].level) !== 1) {
    return { ok: false, error: c.json(errorResponse('Anda tidak memiliki izin untuk melakukan aksi ini'), 403) }
  }

  return { ok: true }
}
