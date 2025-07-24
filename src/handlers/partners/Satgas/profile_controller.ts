import { Context } from 'hono'
import { db } from '../../../db/client'
import { errorResponse, successResponse } from '../../../utils/response'
import { z } from 'zod'
import * as bcrypt from 'bcryptjs';

export const updateProfile = async (c: Context) => {
  const user = c.get('user') as { id: number }
  const body = await c.req.json()

  // Validasi: nama atau password harus diisi minimal satu
  const schema = z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter').optional(),
    password: z.string().min(6, 'Password minimal 6 karakter').optional()
  }).refine(data => data.name || data.password, {
    message: 'Minimal salah satu dari nama atau password harus diisi'
  })

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return c.json(errorResponse('Input tidak valid', 400, parsed.error.format()), 400)
  }

  const { name, password } = parsed.data

  const [users]: any = await db.query(`SELECT * FROM users WHERE id = ?`, [user.id])
  if (users.length === 0) {
    return c.json(errorResponse('User tidak ditemukan'), 404)
  }

  // Default: tetap pakai password lama
  let newPassword = users[0].password
  if (password) {
    const salt = bcrypt.genSaltSync(10)
    newPassword = bcrypt.hashSync(password, salt)
  }

  // Update users table
  await db.query(`UPDATE users SET name = ?, password = ? WHERE id = ?`, [
    name || users[0].name,
    newPassword,
    user.id
  ])

  // Jika ada perubahan nama, update juga di tabel petugas (satgas)
  if (name) {
    await db.query(`UPDATE petugas SET nama = ? WHERE id_user = ?`, [name, user.id])
  }

  return c.json(successResponse('Profil berhasil diperbarui', {
    name: name || users[0].name,
    passwordChanged: !!password
  }))
}


export const getProfile = async (c: Context) => {
  const user = c.get('user') as { id: number }

  const [users]: any = await db.query(`SELECT name FROM users WHERE id = ?`, [user.id])
  if (users.length === 0) {
    return c.json(errorResponse('User tidak ditemukan'), 404)
  }

  return c.json(successResponse('Profil berhasil diambil', {
    name: users[0].name
  }))
}
