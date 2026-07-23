const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const logger = require('./utils/logger');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const friendRoutes = require('./routes/friendRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const groupRoutes = require('./routes/groupRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const linkPreviewRoutes = require('./routes/linkPreviewRoutes');
const pushRoutes = require('./routes/pushRoutes');
const AppError = require('./utils/AppError');
const globalErrorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();

// Security headers
app.use(helmet());

// CORS — only allow the configured client origin, with credentials for cookies
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Body & cookie parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Sanitize against NoSQL query injection
app.use(mongoSanitize());

// Request logging: readable format in dev, combined format piped through
// winston (structured JSON) in production for log aggregation services.
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Rate limit all API routes
app.use('/api', generalLimiter);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'API is healthy' });
});

// Interactive API documentation (OpenAPI/Swagger)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/friends', friendRoutes);
app.use('/api/v1/chats', chatRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/link-preview', linkPreviewRoutes);
app.use('/api/v1/push', pushRoutes);

// Unhandled routes
app.all('*', (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server.`, 404));
});

// Global error handler (must be last)
app.use(globalErrorHandler);

module.exports = app;
