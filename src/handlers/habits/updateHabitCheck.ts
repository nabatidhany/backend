import { Context } from 'hono'
import { db } from '../../db/client'
import { getTodayDate } from '../../utils/date'
import { errorResponse, successResponse } from '../../utils/response'

export const updateHabitCheck = async (c: Context) => {
  const user = c.get('user')
  const userId = user.id
  const habitId = parseInt(c.req.param('id'))
  const { is_done } = await c.req.json()
  const today = getTodayDate()

  // Cek apakah habit tersebut adalah mandatory dan absensinya sudah ada
  const [habitCheck]: any = await db.query(`
    SELECT h.id, h.name, h.is_mandatory, h.user_id
    FROM habits h
    WHERE h.id = ?
  `, [habitId])

  if (!habitCheck.length) {
    return c.json(errorResponse('Habit tidak ditemukan'), 404)
  }

  const habit = habitCheck[0]

  // Cek apakah dia mandatory & absensinya sudah ada hari ini
  if (habit.is_mandatory && habit.user_id === 0) {
    const name = habit.name.toLowerCase()

    const tag = name.includes('subuh') ? 'subuh'
              : name.includes('zuhur') ? 'zuhur'
              : name.includes('ashar') ? 'ashar'
              : name.includes('maghrib') ? 'maghrib'
              : name.includes('isya') ? 'isya'
              : null

    if (tag) {
      const [absensi]: any = await db.query(`
        SELECT id FROM absensi
        WHERE user_id = ?
          AND tag = ?
          AND DATE(CONVERT_TZ(created_at, '+00:00', '+07:00')) = CURDATE()
        LIMIT 1
      `, [userId, tag])

      if (absensi.length > 0) {
        return c.json(errorResponse('Habit wajib ini dicentang otomatis dari absensi dan tidak bisa diubah'), 403)
      }
    }
  }

  if (is_done) {
    // INSERT (IGNORE jika sudah ada)
    await db.query(`
      INSERT IGNORE INTO habit_logs (habit_id, user_id, date, is_done)
      VALUES (?, ?, ?, true)
    `, [habitId, userId, today])
  } else {
    // DELETE
    await db.query(`
      DELETE FROM habit_logs WHERE habit_id = ? AND user_id = ? AND date = ?
    `, [habitId, userId, today])
  }

  return c.json(successResponse('Habit updated', {}))
}
