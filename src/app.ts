import { Hono } from 'hono';
import auth from './routes/auth';
import privateRoute from './routes/private';
import cron from 'node-cron';
import { generateAndStoreDailyContent } from './jobs/aiContent';

const app = new Hono();

app.route('/auth', auth);
app.route('/api', privateRoute);

app.get('/', (c) => c.text('Hello from Bun + Hono API'));

cron.schedule('*/15 * * * *', async () => {
  console.log('⏰ Cron jalan setiap 15 menit!');
  await generateAndStoreDailyContent(); // Fungsi yang kamu buat sendiri
});

// (async () => {
// 	console.log('🚀 Pertama kali jalan, generate konten AI sekarang...');
// 	await generateAndStoreDailyContent();
// })();

export default app;
