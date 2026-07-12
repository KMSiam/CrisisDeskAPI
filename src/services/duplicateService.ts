import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

export class DuplicateService {
  /**
   * Checks if a new report is a duplicate of a recent report using pgvector cosine similarity.
   * Compares the new report's embedding against other reports submitted in the last 72 hours
   * that are not resolved or rejected.
   */
  public static async findDuplicate(
    embedding: number[],
    category: string,
    location: string
  ): Promise<{ possibleDuplicate: boolean; matchedReportId: string | null }> {
    try {
      const threshold = 0.85; // Cosine similarity threshold
      const vectorString = `[${embedding.join(',')}]`;

      // Query reports in the last 72 hours that are not resolved or rejected using pgvector cosine similarity
      const results = await prisma.$queryRaw<Array<{ id: string; similarity: number }>>`
        SELECT id, 1 - (embedding <=> ${vectorString}::vector) AS similarity
        FROM "Report"
        WHERE status::text NOT IN ('resolved', 'rejected')
          AND "createdAt" > NOW() - INTERVAL '72 hours'
        ORDER BY similarity DESC
        LIMIT 1;
      `;

      if (results && results.length > 0) {
        const bestMatch = results[0];
        logger.info(`Closest duplicate match found: ID=${bestMatch.id}, Similarity=${bestMatch.similarity}`);

        if (bestMatch.similarity > threshold) {
          return {
            possibleDuplicate: true,
            matchedReportId: bestMatch.id,
          };
        }
      }

      return {
        possibleDuplicate: false,
        matchedReportId: null,
      };
    } catch (error) {
      logger.error('Failed to run duplicate detection query:', error);
      // Fallback: return false so that the API doesn't crash if pgvector has issues
      return {
        possibleDuplicate: false,
        matchedReportId: null,
      };
    }
  }
}

export default DuplicateService;
