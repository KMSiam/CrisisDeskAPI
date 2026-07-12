import { Category, Urgency } from '@prisma/client';

export interface ClassificationResult {
  category: Category;
  urgency: Urgency;
  summary: string;
  suggestedAction: string;
  confidence: number;
}

export interface AIProvider {
  name: string;
  classifyReport(description: string, location: string): Promise<ClassificationResult>;
}
