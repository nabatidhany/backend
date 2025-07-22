import { Context } from 'hono'
import { db } from '../../../db/client'
import { errorResponse, successResponse } from '../../../utils/response'

export const getTodayAbsensiSatgas = async (c: Context) => {
  try {
    const user = c.get('user') // JWT middleware
    const conn = await db.getConnection()

    // Ambil id_masjid sebagai mesin_id
    const mesin_id = user.id

    // Query waktu lokal (UTC+7)
    const query = `
      SELECT 
        a.tag,
        COUNT(*) as total
      FROM absensi a
      WHERE a.mesin_id = ? 
        AND DATE(CONVERT_TZ(a.created_at, '+00:00', '+07:00')) = CURDATE()
      GROUP BY a.tag
    `

    const [countRows]: any = await conn.query(query, [mesin_id])

    const totalPerSholat: { [key in 'subuh' | 'dzuhur' | 'maghrib' | 'isya']: number } = {
      subuh: 0,
      dzuhur: 0,
      maghrib: 0,
      isya: 0
    }

    countRows.forEach((row: any) => {
      const tag = row.tag?.toLowerCase() as 'subuh' | 'dzuhur' | 'maghrib' | 'isya'
      if (tag && totalPerSholat[tag] !== undefined) {
        totalPerSholat[tag] = row.total
      }
    })

    // Ambil 10 absensi terbaru hari ini
    const [latestAbsensi]: any = await conn.query(
      `
      SELECT 
        a.id, a.user_id, p.fullname, a.tag, 
        CONVERT_TZ(a.created_at, '+00:00', '+07:00') as waktu 
      FROM absensi a
      JOIN peserta p ON p.id = a.user_id
      WHERE a.mesin_id = ?
        AND DATE(CONVERT_TZ(a.created_at, '+00:00', '+07:00')) = CURDATE()
      ORDER BY a.created_at DESC
      LIMIT 10
    `,
      [mesin_id]
    )

    conn.release()

    return c.json(
      successResponse('Data absensi hari ini', {
        total_per_sholat: totalPerSholat,
        latest_absensi: latestAbsensi
      })
    )
  } catch (err) {
    console.error(err)
    return c.json(errorResponse('Terjadi kesalahan saat mengambil data'), 500)
  }
}
