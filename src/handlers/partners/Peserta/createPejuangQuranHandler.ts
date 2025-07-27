import { Context } from 'hono'
import { z } from 'zod'
import { db } from '../../../db/client'
import { successResponse, errorResponse } from '../../../utils/response'
import { parse } from 'date-fns'
import { id as localeID } from 'date-fns/locale'

const pejuangSchema = z.object({
  id_peserta: z.number(),
  tanggal: z.string(),
  id_surat: z.number(),
  ayat: z.number()
})

export const createPejuangQuranHandler = async (c: Context) => {
  try {
    const jwtPayload = c.get('user') as { id: number }
    const id_satgas = jwtPayload?.id

    const body = await c.req.json()
    const parsed = pejuangSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(errorResponse('Input tidak valid'), 400)
    }

    const { id_peserta, tanggal, id_surat, ayat } = parsed.data

    let tanggalSQL: string
    try {
      const parsedDate = parse(tanggal, 'd MMMM yyyy HH:mm', new Date(), { locale: localeID })
      tanggalSQL = parsedDate.toISOString().slice(0, 19).replace('T', ' ')
    } catch {
      return c.json(errorResponse('Format tanggal tidak dikenali'), 400)
    }

    const conn = await db.getConnection()
    try {
      await conn.beginTransaction()

      // ✅ Ambil masjid_id dari tabel petugas
      const [petugas]: any = await conn.query(
        `SELECT id_masjid FROM petugas WHERE id_user = ? AND id_event = 1 LIMIT 1`,
        [id_satgas]
      )

      if (!petugas.length) {
        await conn.rollback()
        return c.json(errorResponse('Satgas tidak ditemukan di event 1'), 404)
      }

      const masjid_id = petugas[0].id_masjid

      // ✅ Insert ke pejuang_quran termasuk masjid_id
      await conn.query(
        `INSERT INTO pejuang_quran (id_peserta, id_satgas, tanggal, id_surat, ayat, id_masjid)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id_peserta, id_satgas, tanggalSQL, id_surat, ayat, masjid_id]
      )

      await conn.commit()
      return c.json(successResponse('Data pejuang Quran berhasil disimpan', {
        id_peserta, id_satgas, tanggal: tanggalSQL, id_surat, ayat, masjid_id
      }))
    } catch (err) {
      await conn.rollback()
      console.error('DB Error:', err)
      return c.json(errorResponse('Gagal menyimpan data pejuang Quran'), 500)
    } finally {
      conn.release()
    }
  } catch (error) {
    console.error('Server Error:', error)
    return c.json(errorResponse('Terjadi kesalahan di server'), 500)
  }
}


export const searchSuratHandler = async (c: Context) => {
  const search = c.req.query('search')

  if (!search || search.trim() === '') {
    return c.json(errorResponse('Parameter search diperlukan'), 400)
  }

  const conn = await db.getConnection()
  try {
    const [rows]: any = await conn.query(
      `SELECT id, number, name_id, name_en, name_short, name_long, number_of_verses 
       FROM surat_quran
       WHERE name_id LIKE ? OR name_en LIKE ? OR name_short LIKE ? OR name_long LIKE ?
       LIMIT 10`,
      [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]
    )

    return c.json(successResponse('Hasil pencarian surat', rows))
  } catch (err) {
    console.error('DB Error:', err)
    return c.json(errorResponse('Gagal melakukan pencarian'), 500)
  } finally {
    conn.release()
  }
}

export const getRiwayatSatgasHandler = async (c: Context) => {
  const jwtPayload = c.get('user') as { id: number }
  const satgas_id = jwtPayload?.id

  if (!satgas_id) {
    return c.json(errorResponse('ID satgas tidak ditemukan di token'), 403)
  }

  const conn = await db.getConnection()
  try {
    const [rows]: any = await conn.query(
      `SELECT pq.id, pq.tanggal, pq.ayat, 
              s.name_id AS surat_nama, s.number AS surat_number,
              p.fullname AS peserta_nama, p.id AS peserta_id
       FROM pejuang_quran pq
       JOIN surat_quran s ON pq.id_surat = s.id
       JOIN peserta p ON pq.id_peserta = p.id
       WHERE pq.id_satgas = ?
       ORDER BY pq.tanggal DESC
       LIMIT 10`,
      [satgas_id]
    )

    return c.json(successResponse('Riwayat pejuang Quran', rows))
  } catch (err) {
    console.error('DB Error:', err)
    return c.json(errorResponse('Gagal mengambil riwayat'), 500)
  } finally {
    conn.release()
  }
}


export const getTerakhirPesertaHandler = async (c: Context) => {
  const qr_code = c.req.query('qrcode')

  if (!qr_code || qr_code.trim() === '') {
    return c.json(errorResponse('QR code wajib dikirim'), 400)
  }

  const conn = await db.getConnection()
  try {
    // Cari peserta berdasarkan QR code
    const [pesertaRows]: any = await conn.query(
      `SELECT id, fullname FROM peserta WHERE qr_code = ? LIMIT 1`,
      [qr_code]
    )

    if (pesertaRows.length === 0) {
      return c.json(errorResponse('Peserta tidak ditemukan'), 404)
    }

    const peserta = pesertaRows[0]

    // Ambil data terakhir dari pejuang_quran
    const [lastDataRows]: any = await conn.query(
      `SELECT pq.ayat, pq.tanggal,
              s.name_id AS surat_nama, s.number AS surat_number
       FROM pejuang_quran pq
       JOIN surat_quran s ON pq.id_surat = s.id
       WHERE pq.id_peserta = ?
       ORDER BY pq.tanggal DESC
       LIMIT 1`,
      [peserta.id]
    )

    const terakhir = lastDataRows[0] ?? null

    return c.json(successResponse('Data terakhir peserta', {
      peserta_id: peserta.id,
      nama: peserta.fullname,
      terakhir
    }))
  } catch (err) {
    console.error('DB Error:', err)
    return c.json(errorResponse('Gagal mengambil data'), 500)
  } finally {
    conn.release()
  }
}

export const getListPejuangQuranByMasjidHandler = async (c: Context) => {
  try {
    const jwtPayload = c.get('user') as { id: number }
    const id_user = jwtPayload?.id

    const page = parseInt(c.req.query('page') || '1', 10)
    const limit = parseInt(c.req.query('limit') || '10', 10)
    const offset = (page - 1) * limit

    const conn = await db.getConnection()
    try {
      // Ambil masjid_id tempat user bertugas di event 1
      const [petugas]: any = await conn.query(
        `SELECT id_masjid FROM petugas WHERE id_user = ? AND id_event = 1 LIMIT 1`,
        [id_user]
      )

      if (!petugas.length) {
        return c.json(errorResponse('Petugas tidak ditemukan atau belum ditugaskan di event 1'), 404)
      }

      const masjid_id = petugas[0].id_masjid

      // Hitung total untuk pagination
      const [[{ total }]]: any = await conn.query(
        `SELECT COUNT(*) as total FROM pejuang_quran WHERE id_masjid = ?`,
        [masjid_id]
      )

      // Ambil data pejuang Quran berdasarkan masjid_id
      const [rows]: any = await conn.query(
        `SELECT 
            pq.id,
            pq.id_peserta,
            pq.id_surat,
            pq.ayat,
            pq.tanggal,
            p.fullname AS peserta_nama,
            pt.nama AS petugas_nama,
            sq.name_id AS surat_nama,
            jq.number AS juz_number,
            jq.name AS juz_nama
        FROM pejuang_quran pq
        JOIN surat_quran sq ON pq.id_surat = sq.id
        LEFT JOIN juz_quran jq 
            ON pq.id_surat BETWEEN jq.surah_id_start AND jq.surah_id_end
        AND pq.ayat BETWEEN jq.verse_start AND jq.verse_end
        LEFT JOIN peserta p ON pq.id_peserta = p.id
        LEFT JOIN petugas pt 
            ON pt.id_user = p.id_user AND pt.id_event = 1
        WHERE pq.id_masjid = ?
        ORDER BY pq.tanggal DESC
        LIMIT ? OFFSET ?`,
        [masjid_id, limit, offset]
        )

      return c.json(successResponse('List pejuang Quran berhasil diambil', {
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }))
    } catch (err) {
      console.error('DB Error:', err)
      return c.json(errorResponse('Gagal mengambil data'), 500)
    } finally {
      conn.release()
    }
  } catch (err) {
    console.error('Server Error:', err)
    return c.json(errorResponse('Terjadi kesalahan di server'), 500)
  }
}

export const requestJoinEventPejuangQuranHandler = async (c: Context) => {
  try {
    const jwtPayload = c.get('user') as { id: number }
    const id_user = jwtPayload?.id

    const conn = await db.getConnection()
    try {
      await conn.beginTransaction()

      // ✅ Ambil data petugas event 3
      const [existingPetugas]: any = await conn.query(
        `SELECT nama, contact, id_masjid FROM petugas WHERE id_user = ? AND id_event = 3 LIMIT 1`,
        [id_user]
      )

      if (!existingPetugas.length) {
        await conn.rollback()
        return c.json(errorResponse('Data petugas tidak ditemukan di event 3'), 404)
      }

      const { nama, contact, id_masjid } = existingPetugas[0]

      // ✅ Cek apakah sudah pernah request ke event 2
      const [alreadyRequested]: any = await conn.query(
        `SELECT id FROM petugas WHERE id_user = ? AND id_event = 1 LIMIT 1`,
        [id_user]
      )

      if (alreadyRequested.length > 0) {
        await conn.rollback()
        return c.json(errorResponse('Anda sudah pernah request untuk event Pejuang Quran'), 409)
      }

      // ✅ Insert ke event 1 dengan status = 0
      await conn.query(
        `INSERT INTO petugas (nama, contact, id_masjid, id_event, id_user, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nama, contact, id_masjid, 1, id_user, 0]
      )

      await conn.commit()
      return c.json(successResponse('Permintaan bergabung ke event Pejuang Quran telah dikirim', {
        nama}))
    } catch (err) {
      await conn.rollback()
      console.error('DB Error:', err)
      return c.json(errorResponse('Gagal memproses permintaan'), 500)
    } finally {
      conn.release()
    }
  } catch (err) {
    console.error('Server Error:', err)
    return c.json(errorResponse('Terjadi kesalahan di server'), 500)
  }
}
