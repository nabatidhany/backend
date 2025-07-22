import { Hono } from 'hono';
import { z } from 'zod';
import { generateToken } from '../utils/jwt';
import { successResponse, errorResponse } from '../utils/response';
import { partnerLoginHandler } from '../handlers/partners/Auth/login';
import { registerPetugasHandler } from '../handlers/partners/Auth/register';
import { getMasjidByEventIdHandler } from '../handlers/partners/Masjid/getAllMasjidEvent';


const auth = new Hono();

auth.post('/login', async (c) => {
  const body = await c.req.json();

  const schema = z.object({
    username: z.string(),
    password: z.string()
  });

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return c.json({ message: 'Invalid input' }, 400);
  }

  const { username, password } = parsed.data;

  // Simulasi login
  if (username === 'admin' && password === 'password') {
    const token = await generateToken({ username, id: 1849 });
    return c.json(successResponse('Berhasil login', { token }));
  }

  return c.json(errorResponse('Username atau password salah'), 401);
});

auth.post('/partners-login', partnerLoginHandler);
auth.post('/partners-register', registerPetugasHandler);
auth.post('/masjid/by-event', getMasjidByEventIdHandler)

export default auth;
