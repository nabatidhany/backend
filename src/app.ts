import { Hono } from 'hono';
import auth from './routes/auth';
import privateRoute from './routes/private';

const app = new Hono();

app.route('/auth', auth);
app.route('/api', privateRoute);

app.get('/', (c) => c.text('Hello from Bun + Hono API'));

export default app;
