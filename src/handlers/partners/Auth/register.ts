import { Context } from 'hono';
import { z } from 'zod';
import { db } from '../../../db/client';
import * as bcrypt from 'bcryptjs';
import { successResponse, errorResponse } from '../../../utils/response';

export const registerPetugasHandler = async (c: Context) => {
  try {
    const body = await c.req.json();

    const schema = z.object({
      name: z.string(),
      username: z.string().regex(/^(\d{10,15})$/, {
        message: 'Username harus berupa nomor HP (10-15 digit)'
      }),
      password: z.string().min(6),
      masjid_id: z.number(),
      id_event: z.array(z.number()).min(1) // ✅ Perubahan: terima array event
    });

    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return c.json(errorResponse(parsed.error.issues[0].message), 400);
    }

    const { name, username, password, masjid_id, id_event } = parsed.data;

    // Cek apakah username sudah ada
    const [existing]: any = await db.query(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    if (existing.length > 0) {
      return c.json(errorResponse('Username sudah digunakan'), 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert ke tabel users
    const [userResult]: any = await db.query(
      `INSERT INTO users (name, username, password, level) 
       VALUES (?, ?, ?, ?)`,
      [name, username, hashedPassword, '2']
    );

    const userId = userResult.insertId;

    // Insert ke tabel petugas untuk setiap id_event
    for (const eventId of id_event) {
      await db.query(
        `INSERT INTO petugas (nama, contact, id_masjid, id_event, id_user, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, username, masjid_id, eventId, userId, 0]
      );
    }

    return c.json(successResponse('Registrasi berhasil', {
      user_id: userId,
      name,
      username,
      event_ids: id_event
    }));
  } catch (err) {
    console.error('Register error:', err);
    return c.json(errorResponse('Terjadi kesalahan saat registrasi'), 500);
  }
};
