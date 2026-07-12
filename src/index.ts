import app from './app.js';
import env from './config/env.js';
import logger from './utils/logger.js';

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  logger.info(`🚀 CrisisDeskAI API Server running on port ${PORT}`);
  logger.info(`📝 API Documentation available at http://localhost:${PORT}/api/docs`);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection at Promise', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception thrown', error);
  process.exit(1);
});
