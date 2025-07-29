import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiProvider extends BaseAIProvider {
  name = 'Google Gemini';
  model = 'gemini-pro';
  apiKey: string;
  private client: GoogleGenerativeAI;

  constructor(apiKey: string, model: string = 'gemini-pro') {
    super();
    this.apiKey = apiKey;
    this.model = model;
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      const model = this.client.getGenerativeModel({ model: this.model });
      await model.generateContent('test');
      return true;
    } catch (error) {
      console.error('Gemini validation failed:', error);
      return false;
    }
  }

  async generateTestCases(context: TestGenerationContext): Promise<TestGenerationResult> {
    const startTime = Date.now();
    
    try {
      const model = this.client.getGenerativeModel({ 
        model: this.model,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
        }
      });

      const prompt = this.buildAirlinePrompt(context);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();

      const generationTime = Date.now() - startTime;

      // Clean JSON response (Gemini sometimes adds markdown formatting)
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const parsedResponse = JSON.parse(cleanedContent);
      const testCases = parsedResponse.testCases || [];

      return {
        testCases,
        generationTime,
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
      console.error('Gemini generation failed:', error);
      
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
