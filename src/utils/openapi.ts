export const openApiDoc = {
  openapi: '3.0.0',
  info: {
    title: 'Shollu APP',
    version: '1.0.0'
  },
  paths: {
    '/auth/login': {
      post: {
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' }
                },
                required: ['email', 'password']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login berhasil',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/profile': {
      get: {
        summary: 'Ambil data profile user',
        responses: {
          '200': {
            description: 'Profile ditemukan',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
