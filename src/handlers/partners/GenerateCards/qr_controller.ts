import { Context } from 'hono'
import { db } from '../../../db/client'
import { errorResponse, successResponse } from '../../../utils/response'

// Request cetak kartu
export const requestCetakKartu = async (c: Context) => {
  try {
    const user = c.get('user')
    const body = await c.req.json()
    const { jumlah_kartu } = body

    if (!jumlah_kartu || typeof jumlah_kartu !== 'number' || jumlah_kartu <= 0) {
      return c.json(errorResponse('Jumlah kartu tidak valid'), 400)
    }

    const conn = await db.getConnection()
    try {
      await conn.query(
        `INSERT INTO kartu_requests (id_user, jumlah_kartu, status, created_at)
         VALUES (?, ?, ?, NOW())`,
        [user.id, jumlah_kartu, 'request']
      )
      return c.json(successResponse('Request cetak kartu berhasil dibuat', {
        id_user: user.id,
        jumlah_kartu
      }))
    } finally {
      conn.release()
    }
  } catch (err) {
    console.error(err)
    return c.json(errorResponse('Terjadi kesalahan'), 500)
  }
}

// Lihat daftar request (dengan role-based filter dan pagination)
export const getDaftarRequestCetak = async (c: Context) => {
  try {
    const user = c.get('user')

    const conn = await db.getConnection()
    try {
      // Ambil level user dari tabel
      const [users]: any = await conn.query(
        'SELECT level FROM users WHERE id = ?',
        [user.id]
      )
      if (!users.length) return c.json(errorResponse('User tidak ditemukan'), 404)

      const level = users[0].level

      const query = c.req.query()
      const page = parseInt(query.page || '1')
      const limit = parseInt(query.limit || '10')
      const offset = (page - 1) * limit

      const whereClause = level === 1 ? '' : 'WHERE r.id_user = ?'
      const params = level === 1 ? [limit, offset] : [user.id, limit, offset]

      const [rows]: any = await conn.query(
        `
        SELECT r.id, u.name, r.jumlah_kartu, r.status, r.created_at
        FROM kartu_requests r
        JOIN users u ON u.id = r.id_user
        ${whereClause}
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
        `,
        params
      )

      return c.json(successResponse('Daftar request ditemukan', rows))
    } finally {
      conn.release()
    }
  } catch (err) {
    console.error(err)
    return c.json(errorResponse('Terjadi kesalahan'), 500)
  }
}

export const updateStatusRequest = async (c: Context) => {
  try {
    const user = c.get('user')

    const conn = await db.getConnection()
    try {
      // Ambil level user dari tabel
      const [users]: any = await conn.query(
        'SELECT level FROM users WHERE id = ?',
        [user.id]
      )
      if (!users.length) return c.json(errorResponse('User tidak ditemukan'), 404)

      const level = users[0].level
      if (level !== 1) {
        return c.json(errorResponse('Akses ditolak'), 403)
      }

      const id = c.req.param('id')
      const body = await c.req.json()
      const { status } = body

      if (!['request', 'disetujui'].includes(status)) {
        return c.json(errorResponse('Status tidak valid'), 400)
      }

      const [res]: any = await conn.query(
        `UPDATE kartu_requests SET status = ? WHERE id = ?`,
        [status, id]
      )

      if (res.affectedRows === 0) {
        return c.json(errorResponse('Request tidak ditemukan'), 404)
      }

      return c.json(successResponse('Status berhasil diperbarui', {
        id,
        status
      }))
    } finally {
      conn.release()
    }
  } catch (err) {
    console.error(err)
    return c.json(errorResponse('Terjadi kesalahan'), 500)
  }
}
