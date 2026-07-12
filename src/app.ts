import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

const app = express();

// Security and parsing
app.use(helmet());
app.use(cors());
app.use(express.json());

// Global Rate Limiting
app.use(rateLimiter);

// API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routers
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);

// 404 Route
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Resource not found' });
});

// Error handling middleware
app.use(errorHandler);

export default app;
