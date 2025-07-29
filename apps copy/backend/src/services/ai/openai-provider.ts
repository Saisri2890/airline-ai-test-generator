import OpenAI from 'openai';

export class OpenAIProvider extends BaseAIProvider {
  name = 'OpenAI';
  model = 'gpt-4';
  apiKey: string;
  private client: OpenAI;

  constructor(apiKey: string, model: string = 'gpt-4') {
    super();
    this.apiKey = apiKey;
    this.model = model;
    this.client = new OpenAI({ apiKey });
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      console.error('OpenAI validation failed:', error);
      return false;
    }
  }

  async generateTestCases(context: TestGenerationContext): Promise<TestGenerationResult> {
    const startTime = Date.now();
    
    try {
      const prompt = this.buildAirlinePrompt(context);
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert airline software test case generator. Generate comprehensive, realistic test cases following airline industry standards.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      });

      const generationTime = Date.now() - startTime;
      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      const parsedResponse = JSON.parse(content);
      const testCases = parsedResponse.testCases || [];

      return {
        testCases,
        generationTime,
        tokensUsed: response.usage?.total_tokens,
        model: this.model,
        provider: this.name,
        metadata: {
          totalGenerated: testCases.length,
          successful: testCases.length,
          failed: 0,
          warnings: []
        }
      };
    } catch (error) {
      const generationTime = Date.now() - startTime;
      console.error('OpenAI generation failed:', error);
      
      return {
        testCases: [],
        generationTime,
        provider: this.name,
        metadata: {
          totalGenerated: 0,
          successful: 0,
          failed: 1,
          warnings: [`Generation failed: ${error.message}`]
        }
      };
    }
  }
}