import { Context } from 'hono'
import { db } from '../../db/client'
import { successResponse, errorResponse } from '../../utils/response'

export const checkLocation = async (c: Context) => {
  const user = c.get('user')
  const userId = user.id
  const { latitude, longitude } = await c.req.json()

  if (!latitude || !longitude) {
    return c.json(errorResponse('Latitude dan longitude wajib diisi'), 400)
  }

  const RADIUS_KM = 0.2

  // Cari masjid terdekat
  const [masjidRows]: any = await db.query(`
    SELECT
      id,
      nama,
      alamat,
      (
        6371 * ACOS(
          COS(RADIANS(?)) * COS(RADIANS(SUBSTRING_INDEX(lokasi, ',', 1))) *
          COS(RADIANS(SUBSTRING_INDEX(lokasi, ',', -1)) - RADIANS(?)) +
          SIN(RADIANS(?)) * SIN(RADIANS(SUBSTRING_INDEX(lokasi, ',', 1)))
        )
      ) AS distance_km
    FROM masjid
    HAVING distance_km <= ?
    ORDER BY distance_km ASC
    LIMIT 1
  `, [latitude, longitude, latitude, RADIUS_KM])

  if (!masjidRows.length) {
    return c.json(successResponse('User tidak berada di sekitar masjid', {
      in_masjid: false
    }))
  }

  const masjid = masjidRows[0]

  // Ambil qr_code user
  const [pesertaRows]: any = await db.query(`
    SELECT qr_code FROM peserta WHERE id = ?
  `, [userId])

  if (!pesertaRows.length || !pesertaRows[0].qr_code) {
    return c.json(errorResponse('QR Code user tidak ditemukan'), 404)
  }

  // Ambil mesin_id dari petugas yang bertugas di masjid itu
  const [petugasRows]: any = await db.query(`
    SELECT id_user FROM petugas WHERE id_masjid = ? LIMIT 1
  `, [masjid.id])

  if (!petugasRows.length) {
    return c.json(errorResponse('Petugas (mesin_id) tidak ditemukan di masjid ini'), 404)
  }

  return c.json(successResponse('User berada di sekitar masjid', {
    in_masjid: true,
    masjid: {
      id: masjid.id,
      nama: masjid.nama,
      alamat: masjid.alamat,
      distance_km: masjid.distance_km
    },
    absen_payload: {
      qr_code: pesertaRows[0].qr_code,
      mesin_id: petugasRows[0].id_user
    }
  }))
}
