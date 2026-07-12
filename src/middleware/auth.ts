import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import AppError from '../utils/appError.js';

export interface AuthRequest extends Request {
  admin?: {
    id: string;
    email: string;
    name: string;
  };
}

export const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Unauthorized. Missing or invalid token.', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError('Unauthorized. Missing token.', 401);
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      email: string;
      name: string;
    };

    req.admin = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Unauthorized. Invalid token.', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Unauthorized. Token has expired.', 401));
    } else {
      next(error);
    }
  }
};

export default auth;
