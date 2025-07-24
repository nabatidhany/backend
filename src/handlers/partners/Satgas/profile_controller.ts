import { Context } from 'hono'
import { db } from '../../../db/client'
import { errorResponse, successResponse } from '../../../utils/response'
import { z } from 'zod'
import * as bcrypt from 'bcryptjs';

export const updateProfile = async (c: Context) => {
  const user = c.get('user') as { id: number }

  const body = await c.req.json()

  const schema = z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter'),
    password: z.string().min(6, 'Password minimal 6 karakter').optional()
  })

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return c.json(errorResponse('Input tidak valid', 400, parsed.error.format()), 400)
  }

  const { name, password } = parsed.data

  // Ambil data user dulu
  const [users]: any = await db.query(`SELECT * FROM users WHERE id = ?`, [user.id])
  if (users.length === 0) {
    return c.json(errorResponse('User tidak ditemukan'), 404)
  }

  let newPassword = users[0].password // default: tidak diubah
  if (password) {
    const salt = bcrypt.genSaltSync(10)
    newPassword = bcrypt.hashSync(password, salt)
  }

  await db.query(
    `UPDATE users SET name = ?, password = ? WHERE id = ?`,
    [name, newPassword, user.id]
  )

  return c.json(successResponse('Profil berhasil diperbarui', {
    name,
    passwordChanged: !!password
  }))
}
