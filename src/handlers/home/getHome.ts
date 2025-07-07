import { Context } from 'hono';
import { db } from '../../db/client';
import { successResponse } from '../../utils/response';
import { getTodayDate } from '../../utils/date';
import { getPagination } from '../../utils/pagination';
import type { RowDataPacket } from 'mysql2/promise';


function shuffleArray<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export const getHome = async (c: Context) => {
  const user = c.get('user');
  const userId = user.id;
  const today = getTodayDate();

  // Ambil query pagination
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '8'); // idealnya kelipatan 4
  const { page: safePage, limit: safeLimit } = getPagination(page, limit);

  // Hitung total timeline (asumsi: jumlah seluruh konten AI)
  const [countResult]: any = await db.query(`
    SELECT COUNT(*) AS total FROM timeline_entries WHERE user_id IS NULL
  `);
  const total = countResult[0].total;
  const totalPages = Math.ceil(total / safeLimit);

  // Ambil konten berdasarkan jenis secara acak
  const types = ['quote', 'ayat', 'tips', 'challenge'];
  const perType = Math.floor(safeLimit / types.length);

  const promises = types.map(type =>
    db.query(
      `SELECT t.id, t.type, t.content,
        (SELECT COUNT(*) FROM timeline_likes WHERE timeline_entry_id = t.id) as like_count,
        EXISTS(
          SELECT 1 FROM timeline_likes WHERE user_id = ? AND timeline_entry_id = t.id
        ) as liked
      FROM timeline_entries t
      WHERE t.user_id IS NULL AND t.type = ?
      ORDER BY RAND()
      LIMIT ?`,
      [userId, type, perType]
    )
  );

  const results = await Promise.all(promises);
  const timeline = shuffleArray(
    results.flatMap((res) => res[0] as RowDataPacket[])
  );

  // Ambil absensi hari ini (waktu Indonesia)
  const [absensiLogs]: any = await db.query(`
      SELECT
          a.tag,
          DATE_FORMAT(CONVERT_TZ(a.created_at, '+00:00', '+07:00'), '%H:%i') AS time,
          m.nama AS nama_masjid,
          m.id AS masjid_id
      FROM
          absensi a
      LEFT JOIN
          petugas p ON a.mesin_id = p.id_user
      LEFT JOIN
          masjid m ON p.id_masjid = m.id
      WHERE
          a.user_id = ?
          AND DATE(CONVERT_TZ(a.created_at, '+00:00', '+07:00')) = CURDATE()
          AND a.tag IN ('subuh', 'dzuhur', 'ashar', 'maghrib', 'isya')
  `, [userId]);
  
  // Inisialisasi default: status false, time null, nama_masjid null
  const sholatTags = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
  const sholatLogs = Object.fromEntries(
      sholatTags.map((tag) => [tag, { status: false, time: null, nama_masjid: null, masjid_id: null }])
  );
  
  // Isi data dari absensi jika ada
  for (const row of absensiLogs) {
      const tag = row.tag?.toLowerCase();
      if (sholatTags.includes(tag) && !sholatLogs[tag].status) {
          sholatLogs[tag] = { status: true, time: row.time, nama_masjid: row.nama_masjid, masjid_id: row.masjid_id };
      }
  }
  

  // Ambil habit harian
  const [habits]: any = await db.query(`
    SELECT h.id as habit_id, h.name, h.is_mandatory, h.user_id,
      COALESCE(l.is_done, false) as is_done
    FROM habits h
    LEFT JOIN habit_logs l ON l.habit_id = h.id AND l.date = ? AND l.user_id = ?
    WHERE (h.user_id = 0 AND h.is_mandatory = 1)
      OR h.user_id = ?
  `, [today, userId, userId]);

  const habitsToday = habits.map((habit: any) => {
    const lowerName = habit.name.toLowerCase();

    if (habit.is_mandatory && habit.user_id === 0) {
      const tag = lowerName.includes('subuh') ? 'subuh'
                : lowerName.includes('dzuhur') ? 'dzuhur'
                : lowerName.includes('ashar') ? 'ashar'
                : lowerName.includes('maghrib') ? 'maghrib'
                : lowerName.includes('isya') ? 'isya'
                : '';

      const autoChecked = sholatLogs[tag]?.status ?? false;

      return {
        habit_id: habit.habit_id,
        name: habit.name,
        is_done: autoChecked || habit.is_done,
        auto_checked: autoChecked,
        editable: !autoChecked
      };
    }

    return {
      habit_id: habit.habit_id,
      name: habit.name,
      is_done: habit.is_done,
      auto_checked: false,
      editable: true
    };
  });

  return c.json(successResponse('Home fetched successfully', {
    sholat_logs: sholatLogs,
    habits_today: habitsToday,
    timeline,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages
    }
  }));
};
