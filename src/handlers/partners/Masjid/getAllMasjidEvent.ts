import { Context } from 'hono'
import { z } from 'zod'
import { db } from '../../../db/client'
import { successResponse, errorResponse } from '../../../utils/response'

export const getMasjidByEventIdHandler = async (c: Context) => {
  try {
    const body = await c.req.json()

    const schema = z.object({
      event_id: z.number()
    })

    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return c.json(errorResponse(parsed.error.issues[0].message), 400)
    }

    const { event_id } = parsed.data

    // Ambil masjid yang tergabung dalam event berdasarkan tabel `setting`
    const [rows]: any = await db.query(
      `
      SELECT m.id_masjid, m.nama, m.alamat
      FROM setting s
      JOIN masjid m ON s.id_masjid = m.id_masjid
      WHERE s.id_event = ?
      `,
      [event_id]
    )

    return c.json(successResponse('Daftar masjid untuk event', rows))
  } catch (err) {
    console.error('Error ambil masjid:', err)
    return c.json(errorResponse('Terjadi kesalahan saat mengambil masjid'), 500)
  }
}
