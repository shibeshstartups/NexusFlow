import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';

import connectDB from './config/database.js';
import { initializeR2Service } from './config/r2Upload.js';
import databaseOptimizationService from './services/databaseOptimization.js';
import redisService from './services/redisService.js';
import backgroundJobService from './services/backgroundJobService.js';
import realTimeNotificationService from './services/realTimeNotificationService.js';
import performanceMonitoringService from './services/performanceMonitoringService.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import securityMiddleware from './middleware/securityMiddleware.js';
import { logger } from './utils/logger.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import folderRoutes from './routes/folderRoutes.js';
import shareRoutes from './routes/shareRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import analyticsController from './controllers/analyticsController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server for Socket.IO
const httpServer = createServer(app);

// Connect to MongoDB and initialize services
connectDB();

// Initialize R2 Storage Service
initializeR2Service().catch((error) => {
  logger.error('Failed to initialize R2 service:', error);
  process.exit(1);
});

// Initialize Database Optimization Service
databaseOptimizationService.initialize().catch((error) => {
  logger.error('Failed to initialize database optimization service:', error);
  // Don't exit on optimization failure, just log
});

// Initialize Redis Caching Service
redisService.initialize().catch((error) => {
  logger.error('Failed to initialize Redis service:', error);
  // Don't exit on Redis failure in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Initialize Background Job Service
backgroundJobService.initialize().catch((error) => {
  logger.error('Failed to initialize background job service:', error);
  // Don't exit on job service failure in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Initialize Real-time Notification Service
realTimeNotificationService.initialize(httpServer).catch((error) => {
  logger.error('Failed to initialize real-time notification service:', error);
  // Don't exit on real-time service failure in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Initialize Performance Monitoring Service
performanceMonitoringService.initialize().catch((error) => {
  logger.error('Failed to initialize performance monitoring service:', error);
  // Don't exit on monitoring failure, just continue without it
});

// Security middleware with enhanced configuration
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      childSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// File upload rate limiting (stricter)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 uploads per 15 minutes
  message: 'Too many upload requests, please try again later.'
});

// Enhanced CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000', // Development fallback
  'https://nexusflow.com', // Production domain
  'https://www.nexusflow.com' // Production www domain
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log suspicious requests
    logger.warn('Blocked CORS request from unauthorized origin', {
      origin,
      timestamp: new Date().toISOString()
    });
    
    return callback(new Error('Not allowed by CORS policy'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
}));

// Body parsing middleware with enhanced security
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for signature verification if needed
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply comprehensive security middleware
app.use(securityMiddleware.requestSizeLimit(10)); // 10MB limit
app.use(securityMiddleware.sqlInjectionProtection);
app.use(securityMiddleware.noSQLInjectionProtection);
app.use(securityMiddleware.xssProtection);
app.use(securityMiddleware.suspiciousUserAgentDetection);
app.use(securityMiddleware.honeypotProtection);
app.use(securityMiddleware.contentTypeValidation(['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded']));
app.use(securityMiddleware.progressiveDelay);

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Performance monitoring middleware
app.use(performanceMonitoringService.getHttpMetricsMiddleware());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'NexusFlow API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/files', uploadLimiter, fileRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/analytics', analyticsController);

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    const metrics = await performanceMonitoringService.getMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error retrieving metrics');
  }
});

// Health check for R2 storage
app.get('/api/health/storage', async (req, res) => {
  try {
    const r2StorageService = (await import('./services/r2Storage.js')).default;
    await r2StorageService.client; // Basic connection check
    res.status(200).json({
      success: true,
      message: 'R2 storage is healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'R2 storage connection failed',
      error: error.message
    });
  }
});

// Health check for database optimization
app.get('/api/health/database', async (req, res) => {
  try {
    const metrics = await databaseOptimizationService.getPerformanceMetrics();
    res.status(200).json({
      success: true,
      message: 'Database optimization is active',
      timestamp: new Date().toISOString(),
      metrics
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Database optimization check failed',
      error: error.message
    });
  }
});

// Health check for Redis caching
app.get('/api/health/redis', async (req, res) => {
  try {
    const stats = await redisService.getStats();
    res.status(200).json({
      success: true,
      message: 'Redis caching service is healthy',
      timestamp: new Date().toISOString(),
      stats
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Redis connection failed',
      error: error.message
    });
  }
});

// Health check for background jobs
app.get('/api/health/jobs', async (req, res) => {
  try {
    const queueStats = await backgroundJobService.getQueueStats();
    res.status(200).json({
      success: true,
      message: 'Background job service is healthy',
      timestamp: new Date().toISOString(),
      queueStats
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Background job service check failed',
      error: error.message
    });
  }
});

// Health check for real-time notifications
app.get('/api/health/realtime', async (req, res) => {
  try {
    const stats = realTimeNotificationService.getStats();
    res.status(200).json({
      success: true,
      message: 'Real-time notification service is healthy',
      timestamp: new Date().toISOString(),
      stats
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Real-time notification service check failed',
      error: error.message
    });
  }
});

// Health check for performance monitoring
app.get('/api/health/performance', async (req, res) => {
  try {
    const health = await performanceMonitoringService.healthCheck();
    const summary = await performanceMonitoringService.getPerformanceSummary();
    
    res.status(health.status === 'healthy' ? 200 : 503).json({
      success: health.status === 'healthy',
      message: 'Performance monitoring service status',
      timestamp: new Date().toISOString(),
      health,
      summary
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Performance monitoring service check failed',
      error: error.message
    });
  }
});

// Note: Static file serving removed - files now served from R2

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  
  try {
    // Close real-time notification service
    await realTimeNotificationService.shutdown();
    logger.info('Real-time notification service closed');
    
    // Close background job service
    await backgroundJobService.shutdown();
    logger.info('Background job service closed');
    
    // Close performance monitoring service
    await performanceMonitoringService.shutdown();
    logger.info('Performance monitoring service closed');
    
    // Close Redis connections
    await redisService.shutdown();
    logger.info('Redis connections closed');
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
  }
  
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

httpServer.listen(PORT, () => {
  logger.info(`NexusFlow backend server running on port ${PORT}`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO server ready for real-time connections`);
});

export default app;