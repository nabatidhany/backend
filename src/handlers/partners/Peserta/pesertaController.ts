import { Context } from 'hono'
import { z } from 'zod'
import { db } from '../../../db/client'
import { successResponse, errorResponse } from '../../../utils/response'
import { nanoid } from 'nanoid'

// Validasi input dari frontend
const pesertaSchema = z.object({
  fullname: z.string(),
  contact: z.string().optional(),
  gender: z.enum(['male', 'female']),
  dob: z.string().optional(), // format bebas
  id_event: z.number(),
  is_hide_name: z.boolean().optional()
})

export const createPesertaHandler = async (c: Context) => {
  try {
    const user = c.get('user') // user dari JWT (sudah lewat middleware auth)
    const body = await c.req.json()
    const parsed = pesertaSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(errorResponse('Input tidak valid'), 400)
    }

    const {
      fullname,
      contact,
      gender,
      dob,
      id_event,
      is_hide_name = false
    } = parsed.data

    const qr_code = nanoid(10)

    const conn = await db.getConnection()
    try {
      await conn.beginTransaction()

      // Ambil masjid_id dari tabel petugas berdasarkan id_user (yang mendaftarkan)
      const [petugasRows]: any = await conn.query(
        `SELECT masjid_id FROM petugas WHERE id_user = ? LIMIT 1`,
        [user.id]
      )

      if (!petugasRows.length) {
        await conn.rollback()
        return c.json(errorResponse('Petugas tidak ditemukan'), 404)
      }

      const masjid_id = petugasRows[0].masjid_id

      // Insert ke tabel peserta
      const [insertPeserta]: any = await conn.query(
        `INSERT INTO peserta (fullname, contact, gender, dob, qr_code, id_user, status, masjid_id, IsHideName)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fullname,
          contact ?? null,
          gender,
          dob ?? null,
          qr_code,
          user.id,
          1, // status default aktif
          masjid_id,
          is_hide_name ? 1 : 0
        ]
      )

      const pesertaId = insertPeserta.insertId

      // Insert ke detail_peserta
      await conn.query(
        `INSERT INTO detail_peserta (id_peserta, id_event, status)
         VALUES (?, ?, ?)`,
        [pesertaId, id_event, 1]
      )

      await conn.commit()

      return c.json(
        successResponse('Peserta berhasil ditambahkan', {
          id: pesertaId,
          fullname,
          qr_code
        })
      )
    } catch (err) {
      await conn.rollback()
      console.error('DB Error:', err)
      return c.json(errorResponse('Gagal menambahkan peserta'), 500)
    } finally {
      conn.release()
    }
  } catch (error) {
    console.error('Server Error:', error)
    return c.json(errorResponse('Terjadi kesalahan di server'), 500)
  }
}
