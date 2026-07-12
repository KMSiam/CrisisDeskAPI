import { PrismaClient, Category, Urgency, Status, Language } from '@prisma/client';
import AppError from '../utils/appError.js';
import logger from '../utils/logger.js';
import TranslationService from './translationService.js';
import AIProviderManager from './aiProviderManager.js';
import EmbeddingService from './embeddingService.js';
import DuplicateService from './duplicateService.js';

const prisma = new PrismaClient();

export class ReportService {
  /**
   * Pipeline for submitting a report.
   * Handles translation, classification, embedding, duplicate detection, and database storage.
   */
  public static async createReport(data: {
    name?: string;
    contact?: string;
    location: string;
    description: string;
    language?: Language;
  }) {
    logger.info(`Processing new report submission from location: "${data.location}"`);

    // 1. Language detection & translation
    let detectedLang: Language = data.language || 'unknown';
    let translatedDescription = data.description;

    try {
      const translationResult = await TranslationService.translateAndDetect(data.description);
      translatedDescription = translationResult.translatedDescription;
      if (detectedLang === 'unknown') {
        detectedLang = translationResult.language;
      }
    } catch (err) {
      logger.error('Translation step failed, proceeding with original description:', err);
    }

    // 2. AI Classification using Provider Manager (Circuit Breaker failover)
    let category: Category = 'other';
    let urgency: Urgency = 'medium';
    let summary = 'Failed to generate summary.';
    let suggestedAction = 'Check description and dispatch responder.';
    let confidence = 0.5;
    let providerUsed = 'unknown';

    try {
      const classification = await AIProviderManager.getInstance().classifyReport(
        translatedDescription,
        data.location
      );
      category = classification.category;
      urgency = classification.urgency;
      summary = classification.summary;
      suggestedAction = classification.suggestedAction;
      confidence = classification.confidence;
      providerUsed = classification.provider;
    } catch (err) {
      logger.error('Classification step failed, using default triage values:', err);
    }

    // 3. Vector Embeddings Generation (using translated/English description)
    let embedding: number[] | null = null;
    try {
      embedding = await EmbeddingService.generateEmbedding(translatedDescription);
    } catch (err) {
      logger.error('Embedding generation step failed, duplicate detection bypassed:', err);
    }

    // 4. Duplicate Detection (pgvector Cosine Similarity)
    let possibleDuplicate = false;
    let matchedReportId: string | null = null;

    if (embedding) {
      try {
        const duplicateCheck = await DuplicateService.findDuplicate(
          embedding,
          category,
          data.location
        );
        possibleDuplicate = duplicateCheck.possibleDuplicate;
        matchedReportId = duplicateCheck.matchedReportId;
      } catch (err) {
        logger.error('Duplicate detection check failed:', err);
      }
    }

    // 5. Store report in database
    try {
      const report = await prisma.report.create({
        data: {
          name: data.name || null,
          contact: data.contact || null,
          location: data.location,
          description: data.description,
          language: detectedLang,
          category,
          urgency,
          summary,
          suggestedAction,
          confidence,
          possibleDuplicate,
          matchedReportId,
          status: 'pending',
        },
      });

      // Update vector embedding in db (Prisma Unsupported column)
      if (embedding) {
        const vectorString = `[${embedding.join(',')}]`;
        await prisma.$executeRaw`
          UPDATE "Report"
          SET embedding = ${vectorString}::vector
          WHERE id = ${report.id}
        `;
      }

      logger.info(`Report saved successfully. ID: ${report.id} | AI Provider: ${providerUsed}`);
      return report;
    } catch (dbError) {
      logger.error('Database write operation failed:', dbError);
      throw new AppError('Failed to save report to database.', 500);
    }
  }

  /**
   * Retrieves a single report details by ID.
   */
  public static async getReportById(id: string) {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        matchedReport: true,
        duplicates: true,
      },
    });

    if (!report) {
      throw new AppError('Report not found.', 404);
    }

    return report;
  }

  /**
   * Lists reports matching various filters with pagination support.
   */
  public static async listReports(filters: {
    category?: Category;
    urgency?: Urgency;
    status?: Status;
    search?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const { category, urgency, status, search, startDate, endDate, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (category) where.category = category;
    if (urgency) where.urgency = urgency;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.report.count({ where }),
    ]);

    return {
      reports,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Updates a report status.
   */
  public static async updateReportStatus(id: string, status: Status) {
    // Check if report exists
    const exists = await prisma.report.findUnique({ where: { id } });
    if (!exists) {
      throw new AppError('Report not found.', 404);
    }

    const updated = await prisma.report.update({
      where: { id },
      data: { status },
    });

    logger.info(`Report status updated. ID: ${id} | New Status: ${status}`);
    return updated;
  }

  /**
   * Soft/hard deletes a report.
   */
  public static async deleteReport(id: string) {
    const exists = await prisma.report.findUnique({ where: { id } });
    if (!exists) {
      throw new AppError('Report not found.', 404);
    }

    await prisma.report.delete({ where: { id } });
    logger.info(`Report deleted. ID: ${id}`);
  }

  /**
   * Generates summary statistics and breakdowns.
   */
  public static async getStatsSummary() {
    // Run counts using Prisma aggregates
    const [
      totalReports,
      criticalCount,
      pendingCount,
      resolvedCount,
      categories,
      urgencies,
    ] = await Promise.all([
      prisma.report.count(),
      prisma.report.count({ where: { urgency: 'critical' } }),
      prisma.report.count({ where: { status: 'pending' } }),
      prisma.report.count({ where: { status: 'resolved' } }),
      prisma.report.groupBy({
        by: ['category'],
        _count: { category: true },
      }),
      prisma.report.groupBy({
        by: ['urgency'],
        _count: { urgency: true },
      }),
    ]);

    // Build breakdown mappings
    const categoryBreakdown: Record<string, number> = {};
    categories.forEach((group) => {
      if (group.category) {
        categoryBreakdown[group.category] = group._count.category;
      }
    });

    const urgencyBreakdown: Record<string, number> = {};
    urgencies.forEach((group) => {
      if (group.urgency) {
        urgencyBreakdown[group.urgency] = group._count.urgency;
      }
    });

    // Make sure standard fields exist even if count is 0
    const defaultCategories: Category[] = [
      'medical', 'fire', 'accident', 'crime', 'flood', 'utility',
      'public_service', 'infrastructure', 'other'
    ];
    defaultCategories.forEach((cat) => {
      if (!(cat in categoryBreakdown)) {
        categoryBreakdown[cat] = 0;
      }
    });

    const defaultUrgencies: Urgency[] = ['low', 'medium', 'high', 'critical'];
    defaultUrgencies.forEach((urg) => {
      if (!(urg in urgencyBreakdown)) {
        urgencyBreakdown[urg] = 0;
      }
    });

    return {
      totalReports,
      criticalReports: criticalCount,
      pendingReports: pendingCount,
      resolvedReports: resolvedCount,
      categoryBreakdown,
      urgencyBreakdown,
    };
  }
}

export default ReportService;
