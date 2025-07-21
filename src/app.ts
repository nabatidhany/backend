import { Hono } from 'hono';
import auth from './routes/auth';
import privateRoute from './routes/private';
import { cors } from 'hono/cors'

// import cron from 'node-cron';
// import { generateAndStoreDailyContent } from './jobs/aiContent';

const app = new Hono();

app.use('/generate/*', cors({
  origin: '*', // Ganti ke domain frontend kalau ingin lebih aman
}))

app.route('/auth', auth);
app.route('/api', privateRoute);

app.get('/', (c) => c.text('Hello from Bun + Hono API'));

// cron.schedule('*/15 * * * *', async () => {
// cron.schedule('0 * * * *', async () => {
//   console.log('⏰ Cron jalan setiap 1 Jam!');
//   await generateAndStoreDailyContent(); // Fungsi yang kamu buat sendiri
// });

// (async () => {
// 	console.log('🚀 Pertama kali jalan, generate konten AI sekarang...');
// 	await generateAndStoreDailyContent();
// })();

export default app;
