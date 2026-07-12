import { GoogleGenAI } from '@google/genai';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export class EmbeddingService {
  /**
   * Generates a 768-dimensional vector embedding for the given text.
   */
  public static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: text,
        config: {
          outputDimensionality: 768,
        },
      });

      if (!response.embeddings || response.embeddings.length === 0) {
        throw new Error('No embeddings returned from Gemini API.');
      }

      const values = response.embeddings[0].values;
      if (!values || values.length !== 768) {
        throw new Error(`Invalid embedding dimension. Expected 768, got ${values?.length}`);
      }

      return values;
    } catch (error) {
      logger.error('Failed to generate embedding:', error);
      throw error;
    }
  }
}

export default EmbeddingService;
