import { GoogleGenAI } from '@google/genai';
import { AIProvider, ClassificationResult } from './baseProvider.js';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';
import { Category, Urgency } from '@prisma/client';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export class GeminiProvider implements AIProvider {
  public readonly name = 'gemini';

  public async classifyReport(description: string, location: string): Promise<ClassificationResult> {
    try {
      const prompt = `
You are an advanced emergency triage dispatch system. Analyze the following emergency report description and location. Classify it into one of the designated categories and determine its urgency.

Report Details:
- Location: ${location}
- Description: ${description}

Designated Categories:
1. medical: Medical emergencies, heart attacks, breathing difficulties, health crises.
2. fire: Active fires, smoke, gas leaks, explosions.
3. accident: Road traffic accidents, derailments, vehicle crashes.
4. crime: Active crimes, robbery, assault, theft, violence.
5. flood: Floods, severe water-logging, river overflow, drowning.
6. utility: Power line down, water main break, sewage leak.
7. public_service: Standard non-emergency city services.
8. infrastructure: Damaged bridges, collapsed roads, building structural issues.
9. other: Unrelated or unclassified issues.

Urgency Levels:
- low: Minor issues, can wait.
- medium: Requires response but not immediately life-threatening.
- high: Serious emergency, potential threat to life or major property.
- critical: Immediate life-threatening situation (trapped people, active fire in building, active violence).

Provide your response in JSON format.
CRITICAL: Do NOT include any markdown markup blocks, markdown formatting, intro or outro text. Return only the JSON object.

JSON Schema:
{
  "category": "one of the categories above",
  "urgency": "one of the urgency levels above",
  "summary": "a brief 1-2 sentence English summary of the situation",
  "suggestedAction": "recommended immediate response action",
  "confidence": a number between 0 and 1 representing your classification confidence
}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const text = response.text?.trim();
      if (!text) {
        throw new Error('Gemini returned an empty response.');
      }

      const result = JSON.parse(text);

      // Validate categories and urgency
      const validCategories: Category[] = [
        'medical', 'fire', 'accident', 'crime', 'flood', 'utility', 
        'public_service', 'infrastructure', 'other'
      ];
      const validUrgencies: Urgency[] = ['low', 'medium', 'high', 'critical'];

      let category: Category = 'other';
      if (validCategories.includes(result.category)) {
        category = result.category as Category;
      }

      let urgency: Urgency = 'medium';
      if (validUrgencies.includes(result.urgency)) {
        urgency = result.urgency as Urgency;
      }

      return {
        category,
        urgency,
        summary: result.summary || 'No summary generated.',
        suggestedAction: result.suggestedAction || 'No action specified.',
        confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
      };
    } catch (error) {
      logger.error('Gemini classification failed:', error);
      throw error;
    }
  }
}

export default GeminiProvider;
