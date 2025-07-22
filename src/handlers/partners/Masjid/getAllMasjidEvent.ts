import { Context } from 'hono'
import { db } from '../../../db/client'
import { successResponse, errorResponse } from '../../../utils/response'

export const getMasjidByEventIdHandler = async (c: Context) => {
  try {
    const idEvent = c.req.query('id_event') 
    if (!idEvent || isNaN(Number(idEvent))) {
      return c.json(errorResponse('ID event tidak valid'), 400)
    }

    const [masjid]: any = await db.query(
      `
      SELECT m.id as id_masjid, m.nama, m.alamat 
      FROM masjid m
      JOIN setting s ON s.id_masjid = m.id
      WHERE s.id_event = ?
      `,
      [Number(idEvent)]
    )

    return c.json(successResponse('Berhasil ambil masjid', masjid))
  } catch (err) {
    console.error('Error ambil masjid:', err)
    return c.json(errorResponse('Gagal mengambil data masjid'), 500)
  }
}
