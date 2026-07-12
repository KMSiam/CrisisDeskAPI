import { Router } from 'express';
import AuthController from '../controllers/authController.js';
import validate from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../schemas/authSchema.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Admin authentication and registration endpoints
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new admin user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@crisisdesk.com
 *               password:
 *                 type: string
 *                 example: password123
 *               name:
 *                 type: string
 *                 example: Admin User
 *     responses:
 *       201:
 *         description: Admin registered successfully
 *       409:
 *         description: Email already in use
 */
router.post('/register', validate(registerSchema), AuthController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in as admin and receive JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@crisisdesk.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful, returns token
 *       401:
 *         description: Invalid email or password
 */
router.post('/login', validate(loginSchema), AuthController.login);

export default router;
