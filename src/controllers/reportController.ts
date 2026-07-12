import { Request, Response, NextFunction } from 'express';
import ReportService from '../services/reportService.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { Category, Urgency, Status, Language } from '@prisma/client';

export class ReportController {
  public static async createReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, contact, location, description, language } = req.body;
      const report = await ReportService.createReport({
        name,
        contact,
        location,
        description,
        language: language as Language,
      });
      return sendSuccess(res, report, 'Report processed and created successfully.', 201);
    } catch (error) {
      next(error);
    }
  }

  public static async getReportById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const report = await ReportService.getReportById(id);
      return sendSuccess(res, report, 'Report retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  public static async listReports(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, urgency, status, search, startDate, endDate, page, limit } = req.query as any;
      const results = await ReportService.listReports({
        category: category as Category,
        urgency: urgency as Urgency,
        status: status as Status,
        search,
        startDate,
        endDate,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });
      return sendSuccess(res, results, 'Reports retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  public static async updateReportStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await ReportService.updateReportStatus(id, status as Status);
      return sendSuccess(res, updated, 'Report status updated successfully.');
    } catch (error) {
      next(error);
    }
  }

  public static async deleteReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await ReportService.deleteReport(id);
      return sendSuccess(res, null, 'Report deleted successfully.');
    } catch (error) {
      next(error);
    }
  }

  public static async getStatsSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await ReportService.getStatsSummary();
      // For stats/summary directly return the required structure as specified in the PDF or nested in data
      return sendSuccess(res, stats, 'Analytics summary retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }
}

export default ReportController;
