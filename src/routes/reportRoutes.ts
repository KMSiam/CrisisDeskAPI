import { Router } from 'express';
import ReportController from '../controllers/reportController.js';
import validate from '../middleware/validate.js';
import auth from '../middleware/auth.js';
import {
  createReportSchema,
  updateStatusSchema,
  getReportSchema,
  listReportsQuerySchema
} from '../schemas/reportSchema.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Emergency report triage and management endpoints
 */

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: Submit a new emergency report
 *     tags: [Reports]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - location
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Rahim"
 *               contact:
 *                 type: string
 *                 example: "017xxxxxxxx"
 *               location:
 *                 type: string
 *                 example: "Sylhet Bondor Bazar"
 *               description:
 *                 type: string
 *                 example: "There is a fire near a shop and people are trapped."
 *               language:
 *                 type: string
 *                 enum: [bn, en, unknown]
 *                 example: "bn"
 *     responses:
 *       201:
 *         description: Report submitted and triaged successfully
 *       400:
 *         description: Description and location are required
 */
router.post('/', validate(createReportSchema), ReportController.createReport);

/**
 * @swagger
 * /api/reports/stats/summary:
 *   get:
 *     summary: Get dashboard statistics and breakdowns
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Analytics summary retrieved successfully
 */
router.get('/stats/summary', ReportController.getStatsSummary);

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: List reports with filtering and pagination
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [medical, fire, accident, crime, flood, utility, public_service, infrastructure, other]
 *       - in: query
 *         name: urgency
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_review, assigned, resolved, rejected]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           description: Free-text search in description, location, or summary
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Reports listed successfully
 */
router.get('/', validate(listReportsQuerySchema), ReportController.listReports);

/**
 * @swagger
 * /api/reports/{id}:
 *   get:
 *     summary: Retrieve details of a single report
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report details retrieved successfully
 *       404:
 *         description: Report not found
 */
router.get('/:id', validate(getReportSchema), ReportController.getReportById);

/**
 * @swagger
 * /api/reports/{id}/status:
 *   patch:
 *     summary: Update the triage status of a report (Admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in_review, assigned, resolved, rejected]
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Report not found
 */
router.patch('/:id/status', auth, validate(updateStatusSchema), ReportController.updateReportStatus);

/**
 * @swagger
 * /api/reports/{id}:
 *   delete:
 *     summary: Soft/hard delete a report (Admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Report not found
 */
router.delete('/:id', auth, validate(getReportSchema), ReportController.deleteReport);

export default router;
