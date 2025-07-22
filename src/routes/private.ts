import { Hono } from 'hono';
import { authMiddleware } from '../middlewares/auth';
import { db } from '../db/client';
import { successResponse } from '../utils/response';
import { getPagination } from '../utils/pagination';
import { getHome } from '../handlers/home/getHome';
import { createHabit } from '../handlers/habits/createHabit';
import { updateHabitCheck } from '../handlers/habits/updateHabitCheck';
import { checkLocation } from '../handlers/location/checkLocation';
import { generateCards } from '../handlers/partners/GenerateCards/generateCard';
import { approveSatgas, getPesertaByEvent, getUnapprovedSatgas, rejectSatgas } from '../handlers/partners/Satgas/satgas_controller';
import { createPesertaHandler } from '../handlers/partners/Peserta/pesertaController';
import { getTodayAbsensiSatgas } from '../handlers/partners/Satgas/statistikAbsen';
import { getDaftarRequestCetak, requestCetakKartu, updateStatusRequest } from '../handlers/partners/GenerateCards/qr_controller';
import { generateCardsByRequest } from '../handlers/partners/GenerateCards/generateCardsByRequest';

const privateRoute = new Hono();

privateRoute.use('*', authMiddleware);

privateRoute.get('/users', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '10');

  const { offset } = getPagination(page, limit);

  // Hitung total user
  const [countResult]: any = await db.query('SELECT COUNT(*) AS total FROM users');
  const total = countResult[0].total;
  const totalPages = Math.ceil(total / limit);

  // Ambil data user sesuai page
  const [rows]: any = await db.query(
    'SELECT id, username FROM users LIMIT ? OFFSET ?',
    [limit, offset]
  );

  return c.json(
    successResponse('List user', {
      users: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })
  );
});

privateRoute.get('/home', getHome);
privateRoute.post('/habits', createHabit);
privateRoute.post('/habits/:id/check', updateHabitCheck)
privateRoute.post('/location/check', checkLocation)
privateRoute.post('/partners/generate-cards', generateCards)
privateRoute.get('/partners/satgas/pending', getUnapprovedSatgas)
privateRoute.post('/partners/satgas/approve', approveSatgas)
privateRoute.post('/partners/satgas/reject', rejectSatgas)
privateRoute.get('/partners/satgas/get-peserta', getPesertaByEvent)
privateRoute.post('/partners/satgas/register-peserta', createPesertaHandler)
privateRoute.get('/partners/satgas/statistik-absen-satgas', getTodayAbsensiSatgas)
privateRoute.get('/partners/satgas/statistik-absen-satgas', getTodayAbsensiSatgas)
privateRoute.post('/partners/satgas/card/request', requestCetakKartu)
privateRoute.get('/partners/satgas/card/requests', getDaftarRequestCetak)
privateRoute.put('/partners/satgas/card/requests/:id/status', updateStatusRequest)
privateRoute.post('/partners/satgas/card/generate-by-request', generateCardsByRequest)

export default privateRoute;
