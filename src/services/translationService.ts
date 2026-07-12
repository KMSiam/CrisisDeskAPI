import { GoogleGenAI } from '@google/genai';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { Language } from '@prisma/client';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export class TranslationService {
  public static async translateAndDetect(description: string): Promise<{ translatedDescription: string, language: Language }> {
    try {
      const prompt = `
You are a multilingual emergency dispatch system. Analyze the following emergency report description.
Perform two tasks:
1. Detect if the language is Bangla (Bengali), English, or another language. (If it is phonetic Bangla / Banglish like "Sylhet e agun lagse" or "Bondor Bazar e accident hoyeche", classify it as Bangla "bn").
2. Translate the description to English. If it is already in English, return it exactly as is.

Provide your response in JSON format.
CRITICAL: Do NOT include any markdown markup blocks, markdown formatting, intro or outro text. Return only the JSON object.

JSON Schema:
{
  "language": "bn" or "en" or "unknown",
  "translatedText": "the text translated into English"
}

Report Description:
"${description}"
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const text = response.text?.trim();
      if (!text) {
        throw new Error('Gemini translation returned an empty response.');
      }

      const result = JSON.parse(text);

      let language: Language = 'unknown';
      if (result.language === 'bn') {
        language = 'bn';
      } else if (result.language === 'en') {
        language = 'en';
      }

      return {
        translatedDescription: result.translatedText || description,
        language
      };
    } catch (error) {
      logger.error('Failed to translate and detect language:', error);
      return {
        translatedDescription: description,
        language: 'unknown'
      };
    }
  }
}

export default TranslationService;
