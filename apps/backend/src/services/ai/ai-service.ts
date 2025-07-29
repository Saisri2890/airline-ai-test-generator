export class AIService {
  private providers: Map<string, BaseAIProvider> = new Map();
  private defaultProvider: string = 'mock';

  constructor() {
    // Initialize providers from environment variables
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // OpenAI Provider
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const openaiProvider = new OpenAIProvider(openaiKey, process.env.OPENAI_MODEL || 'gpt-4');
      this.providers.set('openai', openaiProvider);
      this.defaultProvider = 'openai';
    }

    // Gemini Provider
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const geminiProvider = new GeminiProvider(geminiKey, process.env.GEMINI_MODEL || 'gemini-pro');
      this.providers.set('gemini', geminiProvider);
      if (this.defaultProvider === 'mock') {
        this.defaultProvider = 'gemini';
      }
    }

    // Mock Provider (always available)
    this.providers.set('mock', new MockAIProvider());
  }

  async generateTestCases(
    providerName: string,
    context: TestGenerationContext
  ): Promise<TestGenerationResult> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    const isValid = await provider.validateConfiguration();
    if (!isValid) {
      throw new Error(`Provider ${providerName} configuration is invalid`);
    }

    return await provider.generateTestCases(context);
  }

  async getAvailableProviders(): Promise<string[]> {
    const providers = Array.from(this.providers.keys());
    const validProviders = [];

    for (const providerName of providers) {
      const provider = this.providers.get(providerName);
      if (provider && await provider.validateConfiguration()) {
        validProviders.push(providerName);
      }
    }

    return validProviders;
  }

  getDefaultProvider(): string {
    return this.defaultProvider;
  }
}