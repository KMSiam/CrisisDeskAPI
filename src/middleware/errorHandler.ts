import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import AppError from '../utils/appError.js';
import logger from '../utils/logger.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error
  logger.error(`[ErrorHandler] Error name: ${err.name || 'Error'} | Message: ${err.message}`, err);

  // If it's a custom application operational error
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }

  // If it's a Zod validation error
  if (err instanceof ZodError) {
    // Return standard validation error message format from description (e.g. Description and location are required.)
    // We will extract a user friendly summary.
    const message = err.errors.map((e) => e.message).join('. ');
    return res.status(400).json({
      success: false,
      message: message || 'Validation failed'
    });
  }

  // Handle Prisma unique constraint error
  if (err.code === 'P2002') {
    const fields = (err.meta?.target as string[]) || [];
    return res.status(409).json({
      success: false,
      message: `An account with this ${fields.join(', ')} already exists.`
    });
  }

  // Default internal server error
  return res.status(500).json({
    success: false,
    message: 'An unexpected error occurred. Please try again.'
  });
};

export default errorHandler;
