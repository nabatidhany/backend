import { Context } from 'hono';
import { db } from '../../db/client';
import { successResponse, errorResponse } from '../../utils/response';

export const createHabit = async (c: Context) => {
  const user = c.get('user');
  const userId = user.id;

  const body = await c.req.json();
  const { name, description = '', is_public = false } = body;

  if (!name || name.trim() === '') {
    return c.json(errorResponse('Nama habit wajib diisi'), 400);
  }

  const [result]: any = await db.query(
    `INSERT INTO habits (user_id, name, description, is_public, created_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [userId, name, description, is_public ? 1 : 0]
  );

  return c.json(successResponse('Habit berhasil ditambahkan', {
    id: result.insertId,
    name,
    description,
    is_public: !!is_public
  }));
};
