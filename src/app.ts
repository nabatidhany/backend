import { Hono } from 'hono'
import { swaggerUI } from '@hono/swagger-ui'
import { openApiDoc } from './utils/openapi'

import auth from './routes/auth'
import privateRoute from './routes/private'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('*', cors({ origin: '*' }))

// Serve OpenAPI JSON
app.get('/doc', (c) => c.json(openApiDoc))

// Swagger UI di /ui
app.get('/ui', swaggerUI({ url: '/doc' }))

// Route asli kamu
app.route('/auth', auth)
app.route('/api', privateRoute)

app.get('/', (c) => c.text('Hello from Hono + Bun Shollu Corp'))

export default app
