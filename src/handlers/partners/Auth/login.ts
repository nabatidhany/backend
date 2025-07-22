// controllers/auth_controller.ts

import { Context } from 'hono';
import { z } from 'zod';
import { db } from '../../../db/client';
import * as bcrypt from 'bcryptjs';
import { generateToken } from '../../../utils/jwt';
import { successResponse, errorResponse } from '../../../utils/response';

export const partnerLoginHandler = async (c: Context) => {
  try {
    const body = await c.req.json();

    const schema = z.object({
      username: z.string(),
      password: z.string()
    });

    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return c.json(errorResponse('Input tidak valid'), 400);
    }

    const { username, password } = parsed.data;

    const [rows]: any = await db.query(
      'SELECT id, username, password, name, level FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    const user = rows[0];

    if (!user) {
      return c.json(errorResponse('Username tidak ditemukan'), 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return c.json(errorResponse('Password salah'), 401);
    }

    // Jika bukan admin (level != 1), cek status dari tabel petugas
    if (user.level !== '1') {
      const [petugasRows]: any = await db.query(
        'SELECT status FROM petugas WHERE id_user = ? LIMIT 1',
        [user.id]
      );

      const petugas = petugasRows[0];

      if (!petugas) {
        return c.json(errorResponse('Akun belum terdaftar sebagai petugas'), 403);
      }

      if (petugas.status === 0) {
        return c.json(errorResponse('Akun belum disetujui oleh admin'), 403);
      }
    }

    const token = await generateToken({ id: user.id, username: user.username });

    return c.json(successResponse('Berhasil login', {
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name || 'Petugas',
        role: user.level === '1' ? 'admin' : 'satgas'
      }
    }));
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    return c.json(errorResponse('Terjadi kesalahan di server'), 500);
  }
};
