import { Context } from 'hono'
import { db } from '../../../db/client'
import { errorResponse, successResponse } from '../../../utils/response'
import { z } from 'zod'

export const getUnapprovedSatgas = async (c: Context) => {
  const page = parseInt(c.req.query('page') || '1', 10)
  const limit = parseInt(c.req.query('limit') || '10', 10)
  const offset = (page - 1) * limit

  // Ambil ringkasan status
  const [[counts]]: any = await db.query(`
    SELECT 
      SUM(status = 0) as pending,
      SUM(status = 1) as approved,
      SUM(status = 9) as rejected,
      COUNT(*) as total
    FROM petugas
  `)

  // Total data pending
  const [[{ total_pending }]]: any = await db.query(
    `SELECT COUNT(*) as total_pending FROM petugas WHERE status = 0`
  )

  // Ambil data dengan pagination dan join masjid
  const [rows]: any = await db.query(
    `SELECT 
      p.id, p.nama, p.contact, p.id_masjid, m.nama as nama_masjid,
      p.id_user, u.username, u.name 
     FROM petugas p
     JOIN users u ON p.id_user = u.id
     JOIN masjid m ON p.id_masjid = m.id
     WHERE p.status = 0
     LIMIT ? OFFSET ?`,
    [limit, offset]
  )

  return c.json(successResponse('Daftar satgas belum di-approve', {
    current_page: page,
    per_page: limit,
    total: total_pending,
    last_page: Math.ceil(total_pending / limit),
    data: rows,
    summary: {
      pending: counts.pending || 0,
      approved: counts.approved || 0,
      rejected: counts.rejected || 0,
      total: counts.total || 0
    }
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
  const jwtPayload = c.get('user') as { id: number }

  // ✅ Validasi user level
  const [users]: any = await db.query(`SELECT level FROM users WHERE id = ?`, [jwtPayload.id])
  if (users.length === 0) {
    return c.json(errorResponse('User tidak ditemukan'), 404)
  }

  if (Number(users[0].level) !== 1) {
    return c.json(errorResponse('Anda tidak memiliki izin untuk melakukan aksi ini'), 403)
  }

  // ✅ Update status menjadi 1 (approved) + id_event
  const [result]: any = await db.query(
    `UPDATE petugas SET status = 1, id_event = ? WHERE id = ?`,
    [id_event, id]
  )

  if (result.affectedRows === 0) {
    return c.json(errorResponse('Petugas tidak ditemukan'), 404)
  }

  return c.json(successResponse('Satgas berhasil di-approve', { id, id_event }))
}

export const rejectSatgas = async (c: Context) => {
  const body = await c.req.json()

  const schema = z.object({
    id: z.number()
  })

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return c.json(errorResponse('Input tidak valid'), 400)
  }

  const { id } = parsed.data
  const jwtPayload = c.get('user') as { id: number }

  // ✅ Validasi user level
  const [users]: any = await db.query(`SELECT level FROM users WHERE id = ?`, [jwtPayload.id])
  if (users.length === 0) {
    return c.json(errorResponse('User tidak ditemukan'), 404)
  }

  if (Number(users[0].level) !== 1) {
    return c.json(errorResponse('Anda tidak memiliki izin untuk melakukan aksi ini'), 403)
  }

  // ✅ Update status menjadi 9 (rejected)
  const [result]: any = await db.query(
    `UPDATE petugas SET status = 9 WHERE id = ?`,
    [id]
  )

  if (result.affectedRows === 0) {
    return c.json(errorResponse('Petugas tidak ditemukan'), 404)
  }

  return c.json(successResponse('Satgas berhasil ditolak', { id }))
}

export const getPesertaByEvent = async (c: Context) => {
  const eventId = c.req.query('event_id')
  const satgasId = c.req.query('satgas_id')
  const search = c.req.query('search')?.trim()
  const gender = c.req.query('gender')?.toUpperCase()
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '10')
  const offset = (page - 1) * limit

  if (!eventId) {
    return c.json(errorResponse('event_id wajib dikirim', 400))
  }

  let query = `
    SELECT 
      dp.id_event,
      p.id AS peserta_id,
      p.fullname,
      p.contact,
      p.gender,
      p.dob,
      p.qr_code,
      p.status,
      p.IsHideName,
      p.masjid_id,
      m.nama AS nama_masjid,
      u.name AS nama_satgas
    FROM detail_peserta dp
    JOIN peserta p ON dp.id_peserta = p.id
    LEFT JOIN masjid m ON p.masjid_id = m.id
    LEFT JOIN users u ON p.id_user = u.id
    WHERE dp.id_event = ?
  `
  const params: any[] = [eventId]

  if (satgasId) {
    query += ' AND p.id_user = ?'
    params.push(satgasId)
  }

  if (search) {
    query += ' AND p.fullname LIKE ?'
    params.push(`%${search}%`)
  }

  if (gender === 'L' || gender === 'P') {
    query += ' AND p.gender = ?'
    params.push(gender)
  }

  query += ' ORDER BY p.fullname ASC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  // Count query
  let countQuery = `
    SELECT COUNT(*) AS total
    FROM detail_peserta dp
    JOIN peserta p ON dp.id_peserta = p.id
    WHERE dp.id_event = ?
  `
  const countParams: any[] = [eventId]

  if (satgasId) {
    countQuery += ' AND p.id_user = ?'
    countParams.push(satgasId)
  }

  if (search) {
    countQuery += ' AND p.fullname LIKE ?'
    countParams.push(`%${search}%`)
  }

  if (gender === 'L' || gender === 'P') {
    countQuery += ' AND p.gender = ?'
    countParams.push(gender)
  }

  const [rows]: any = await db.query(query, params)
  const [countResult]: any = await db.query(countQuery, countParams)

  const total = countResult[0]?.total || 0
  const totalPages = Math.ceil(total / limit)

  return c.json(successResponse('Daftar peserta berhasil diambil', {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  }))
}

