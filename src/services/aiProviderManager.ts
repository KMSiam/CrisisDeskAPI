import { AIProvider, ClassificationResult } from './providers/baseProvider.js';
import GeminiProvider from './providers/geminiProvider.js';
import OpenRouterProvider from './providers/openrouterProvider.js';
import logger from '../utils/logger.js';

export class AIProviderManager {
  private static instance: AIProviderManager;
  private providers: AIProvider[] = [];
  private failureCounts = new Map<string, number>();
  private lastFailureTimes = new Map<string, Date>();
  
  private readonly MAX_FAILURES = 3;
  private readonly COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.providers = [
      new GeminiProvider(),
      new OpenRouterProvider()
    ];
  }

  public static getInstance(): AIProviderManager {
    if (!AIProviderManager.instance) {
      AIProviderManager.instance = new AIProviderManager();
    }
    return AIProviderManager.instance;
  }

  private isCircuitOpen(providerName: string): boolean {
    const failures = this.failureCounts.get(providerName) || 0;
    if (failures < this.MAX_FAILURES) {
      return false;
    }

    const lastFailure = this.lastFailureTimes.get(providerName);
    if (!lastFailure) {
      return false;
    }

    const elapsed = Date.now() - lastFailure.getTime();
    if (elapsed > this.COOLDOWN_MS) {
      logger.info(`Circuit breaker cooldown passed for ${providerName}. Resetting circuit.`);
      this.failureCounts.set(providerName, 0);
      return false;
    }

    return true;
  }

  private recordFailure(providerName: string) {
    const failures = (this.failureCounts.get(providerName) || 0) + 1;
    this.failureCounts.set(providerName, failures);
    this.lastFailureTimes.set(providerName, new Date());
    logger.warn(`Provider ${providerName} recorded failure #${failures}.`);
  }

  private resetFailureCount(providerName: string) {
    this.failureCounts.set(providerName, 0);
  }

  public async classifyReport(description: string, location: string): Promise<ClassificationResult & { provider: string }> {
    for (const provider of this.providers) {
      if (this.isCircuitOpen(provider.name)) {
        logger.warn(`Circuit is OPEN for provider ${provider.name}. Skipping...`);
        continue;
      }

      try {
        logger.info(`Attempting classification with provider: ${provider.name}`);
        const result = await provider.classifyReport(description, location);
        this.resetFailureCount(provider.name);
        return {
          ...result,
          provider: provider.name
        };
      } catch (error) {
        this.recordFailure(provider.name);
        logger.error(`Provider ${provider.name} failed. Attempting next fallback...`);
      }
    }

    logger.error('CRITICAL: All AI providers failed. Returning safe defaults.');
    return {
      category: 'other',
      urgency: 'medium',
      summary: 'Report received. AI classification unavailable due to system outages.',
      suggestedAction: 'Dispatcher check required immediately.',
      confidence: 0.0,
      provider: 'fallback_default'
    };
  }
}

export default AIProviderManager;
