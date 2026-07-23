const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Real-Time Messenger API',
      version: '1.0.0',
      description:
        'REST API for a full-stack real-time messaging platform (auth, users, friends, chats, groups, messages, media, notifications, admin). Real-time events (messages, typing, calls) are delivered via Socket.IO — see README.md for the event reference.',
    },
    servers: [
      { url: 'http://localhost:5000/api/v1', description: 'Local development' },
      { url: '/api/v1', description: 'Current host' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token returned from /auth/login or /auth/register',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            avatar: {
              type: 'object',
              properties: { url: { type: 'string' }, publicId: { type: 'string' } },
            },
            bio: { type: 'string' },
            isOnline: { type: 'boolean' },
            lastSeen: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'fail' },
            message: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  // Scans these files for `@swagger` JSDoc comment blocks
  apis: ['./routes/*.js'],
};

module.exports = swaggerJsdoc(options);
