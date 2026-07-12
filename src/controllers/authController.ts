import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import AppError from '../utils/appError.js';
import { sendSuccess } from '../utils/apiResponse.js';

const prisma = new PrismaClient();

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name } = req.body;

      // Check if admin already exists
      const existing = await prisma.admin.findUnique({
        where: { email }
      });

      if (existing) {
        throw new AppError('An account with this email already exists.', 409);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create admin
      const admin = await prisma.admin.create({
        data: {
          email,
          password: hashedPassword,
          name
        }
      });

      // Generate JWT token
      const token = jwt.sign(
        { id: admin.id, email: admin.email, name: admin.name },
        env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return sendSuccess(res, {
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name
        }
      }, 'Admin registered successfully.', 201);
    } catch (error) {
      next(error);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      // Find admin
      const admin = await prisma.admin.findUnique({
        where: { email }
      });

      if (!admin) {
        throw new AppError('Invalid email or password.', 401);
      }

      // Compare password
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        throw new AppError('Invalid email or password.', 401);
      }

      // Generate JWT
      const token = jwt.sign(
        { id: admin.id, email: admin.email, name: admin.name },
        env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return sendSuccess(res, {
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name
        }
      }, 'Login successful.');
    } catch (error) {
      next(error);
    }
  }
}

export default AuthController;
