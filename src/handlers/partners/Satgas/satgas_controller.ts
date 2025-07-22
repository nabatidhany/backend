// controllers/satgas_controller.ts
import { Context } from 'hono'
import { db } from '../../../db/client'
import { errorResponse, successResponse } from '../../../utils/response'
import { z } from 'zod'

export const getUnapprovedSatgas = async (c: Context) => {
  const page = parseInt(c.req.query('page') || '1', 10)
  const limit = parseInt(c.req.query('limit') || '10', 10)
  const offset = (page - 1) * limit

  // Ambil total data (untuk info total halaman)
  const [[{ total }]]: any = await db.query(
    `SELECT COUNT(*) as total FROM petugas WHERE status = 0`
  )

  const [rows]: any = await db.query(
    `SELECT 
      p.id, p.nama, p.contact, p.id_masjid, p.id_user, u.username, u.name 
     FROM petugas p
     JOIN users u ON p.id_user = u.id
     WHERE p.status = 0
     LIMIT ? OFFSET ?`,
    [limit, offset]
  )

  return c.json(successResponse('Daftar satgas belum di-approve', {
    current_page: page,
    per_page: limit,
    total,
    last_page: Math.ceil(total / limit),
    data: rows
  }))
}

export const approveSatgas = async (c: Context) => {
  const body = await c.req.json()

  const schema = z.object({
    id: z.number(),         // id dari tabel petugas
    id_event: z.number()    // event yang ditentukan admin
  })

  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return c.json(errorResponse('Input tidak valid'), 400)
  }

  const { id, id_event } = parsed.data

  // ✅ Ambil id_user dari JWT
  const jwtPayload = c.get('user') as { id: number }
  const userId = jwtPayload.id
  // ✅ Cek level user di database
  const [rows]: any = await db.query(
    `SELECT level FROM users WHERE id = ?`,
    [userId]
  )

  if (rows.length === 0) {
    return c.json(errorResponse('User tidak ditemukan'), 404)
  }

  const level = rows[0].level
  if (Number(level) !== 1) {
    return c.json(errorResponse('Anda tidak memiliki izin untuk melakukan aksi ini'), 403)
  }

  // ✅ Update status dan id_event
  const [result]: any = await db.query(
    `UPDATE petugas SET status = 1, id_event = ? WHERE id = ?`,
    [id_event, id]
  )

  if (result.affectedRows === 0) {
    return c.json(errorResponse('Petugas tidak ditemukan'), 404)
  }

  return c.json(successResponse('Satgas berhasil di-approve', { id, id_event }))
}

