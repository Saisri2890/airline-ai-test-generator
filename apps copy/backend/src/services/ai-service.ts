
import { GherkinUserStory } from './excel-parser';

export interface TestCase {
  id: string;
  title: string;
  description: string;
  module: string;
  userType: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  steps: TestStep[];
  expectedResult: string;
  testData?: any;
  preconditions?: string[];
  postconditions?: string[];
  sourceStoryId?: string;
}

export interface TestStep {
  stepNumber: number;
  action: string;
  expectedResult: string;
  testData?: string;
}

export interface TestGenerationContext {
  userStories: GherkinUserStory[];
  selectedModules: string[];
  userType: string;
  testingScope: 'smoke' | 'regression' | 'full' | 'custom';
  includeNegativeTests: boolean;
  includePerformanceTests: boolean;
  includeSecurityTests: boolean;
}

export interface TestGenerationResult {
  success: boolean;
  testCases: TestCase[];
  summary: {
    totalGenerated: number;
    byModule: Record<string, number>;
    byPriority: Record<string, number>;
    generationTime: number;
  };
  errors: string[];
  metadata: {
    provider: string;
    model: string;
    timestamp: string;
    context: TestGenerationContext;
  };
}

export abstract class BaseAIProvider {
  abstract name: string;
  abstract model: string;

  abstract generateTestCases(context: TestGenerationContext): Promise<TestGenerationResult>;
  abstract validateConfiguration(): Promise<boolean>;
}

// Mock AI Provider for development and testing
export class MockAIProvider extends BaseAIProvider {
  name = 'Mock AI Provider';
  model = 'mock-v1.0';

  async validateConfiguration(): Promise<boolean> {
    return true; // Mock provider is always available
  }

  async generateTestCases(context: TestGenerationContext): Promise<TestGenerationResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🤖 Mock AI generating tests for ${context.userStories.length} user stories...`);
      
      const testCases: TestCase[] = [];
      
      // Generate test cases for each user story
      for (const story of context.userStories) {
        for (const module of context.selectedModules) {
          // Positive test case
          const positiveTest = this.createPositiveTestCase(story, module, context);
          testCases.push(positiveTest);
          
          // Negative test case (if enabled)
          if (context.includeNegativeTests) {
            const negativeTest = this.createNegativeTestCase(story, module, context);
            testCases.push(negativeTest);
          }
          
          // Edge case test
          const edgeTest = this.createEdgeCaseTest(story, module, context);
          testCases.push(edgeTest);
        }
      }
      
      const endTime = Date.now();
      const generationTime = endTime - startTime;
      
      // Generate summary statistics
      const summary = {
        totalGenerated: testCases.length,
        byModule: this.countByModule(testCases),
        byPriority: this.countByPriority(testCases),
        generationTime
      };
      
      console.log(`✅ Generated ${testCases.length} test cases in ${generationTime}ms`);
      
      return {
        success: true,
        testCases,
        summary,
        errors: [],
        metadata: {
          provider: this.name,
          model: this.model,
          timestamp: new Date().toISOString(),
          context
        }
      };
      
    } catch (error) {
      const endTime = Date.now();
      const generationTime = endTime - startTime;
      
      console.error('Mock AI generation error:', error);
      
      return {
        success: false,
        testCases: [],
        summary: {
          totalGenerated: 0,
          byModule: {},
          byPriority: {},
          generationTime
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        metadata: {
          provider: this.name,
          model: this.model,
          timestamp: new Date().toISOString(),
          context
        }
      };
    }
  }

  private createPositiveTestCase(story: GherkinUserStory, module: string, context: TestGenerationContext): TestCase {
    const testId = `TC_${story.id}_${module}_POS_${Date.now()}`;
    
    return {
      id: testId,
      title: `Positive Test: ${story.description} - ${module}`,
      description: `Verify that ${story.description.toLowerCase()} works correctly for ${module} module`,
      module,
      userType: context.userType,
      priority: story.priority || 'medium',
      tags: ['positive', 'functional', module, ...(story.tags || [])],
      steps: [
        {
          stepNumber: 1,
          action: `Navigate to ${module} section`,
          expectedResult: `${module} page loads successfully`
        },
        {
          stepNumber: 2,
          action: story.given.replace(/^given\s*/i, ''),
          expectedResult: 'Preconditions are met'
        },
        {
          stepNumber: 3,
          action: story.when.replace(/^when\s*/i, ''),
          expectedResult: 'Action is performed successfully'
        },
        {
          stepNumber: 4,
          action: 'Verify the result',
          expectedResult: story.then.replace(/^then\s*/i, '')
        }
      ],
      expectedResult: story.then.replace(/^then\s*/i, ''),
      sourceStoryId: story.id,
      preconditions: [
        'User is logged in with appropriate permissions',
        `Access to ${module} module is available`,
        'System is in stable state'
      ]
    };
  }

  private createNegativeTestCase(story: GherkinUserStory, module: string, context: TestGenerationContext): TestCase {
    const testId = `TC_${story.id}_${module}_NEG_${Date.now()}`;
    
    return {
      id: testId,
      title: `Negative Test: ${story.description} - ${module}`,
      description: `Verify error handling when ${story.description.toLowerCase()} fails in ${module} module`,
      module,
      userType: context.userType,
      priority: story.priority || 'medium',
      tags: ['negative', 'error-handling', module, ...(story.tags || [])],
      steps: [
        {
          stepNumber: 1,
          action: `Navigate to ${module} section`,
          expectedResult: `${module} page loads successfully`
        },
        {
          stepNumber: 2,
          action: 'Set up invalid preconditions',
          expectedResult: 'Invalid state is established'
        },
        {
          stepNumber: 3,
          action: story.when.replace(/^when\s*/i, ''),
          expectedResult: 'System shows appropriate error message'
        },
        {
          stepNumber: 4,
          action: 'Verify error handling',
          expectedResult: 'Appropriate error message is displayed and system remains stable'
        }
      ],
      expectedResult: 'System handles error gracefully and shows meaningful error message',
      sourceStoryId: story.id,
      preconditions: [
        'User is logged in with appropriate permissions',
        'Invalid or insufficient data is prepared'
      ]
    };
  }

  private createEdgeCaseTest(story: GherkinUserStory, module: string, context: TestGenerationContext): TestCase {
    const testId = `TC_${story.id}_${module}_EDGE_${Date.now()}`;
    
    return {
      id: testId,
      title: `Edge Case: ${story.description} - ${module}`,
      description: `Test boundary conditions for ${story.description.toLowerCase()} in ${module} module`,
      module,
      userType: context.userType,
      priority: 'low',
      tags: ['edge-case', 'boundary', module, ...(story.tags || [])],
      steps: [
        {
          stepNumber: 1,
          action: `Navigate to ${module} section`,
          expectedResult: `${module} page loads successfully`
        },
        {
          stepNumber: 2,
          action: 'Set up boundary conditions (max/min values)',
          expectedResult: 'Boundary data is prepared'
        },
        {
          stepNumber: 3,
          action: story.when.replace(/^when\s*/i, '') + ' with boundary values',
          expectedResult: 'Action completes with boundary data'
        },
        {
          stepNumber: 4,
          action: 'Verify boundary behavior',
          expectedResult: 'System handles boundary conditions correctly'
        }
      ],
      expectedResult: 'System processes boundary conditions appropriately',
      sourceStoryId: story.id,
      preconditions: [
        'User is logged in with appropriate permissions',
        'Boundary test data is available'
      ]
    };
  }

  private countByModule(testCases: TestCase[]): Record<string, number> {
    return testCases.reduce((acc, test) => {
      acc[test.module] = (acc[test.module] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private countByPriority(testCases: TestCase[]): Record<string, number> {
    return testCases.reduce((acc, test) => {
      acc[test.priority] = (acc[test.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

// AI Service Manager
export class AIService {
  private providers: Map<string, BaseAIProvider> = new Map();
  private defaultProvider: string = 'mock';

  constructor() {
    // Register default mock provider
    this.registerProvider('mock', new MockAIProvider());
  }

  registerProvider(name: string, provider: BaseAIProvider): void {
    this.providers.set(name, provider);
    console.log(`🤖 Registered AI provider: ${name}`);
  }

  async generateTestCases(
    context: TestGenerationContext,
    providerName?: string
  ): Promise<TestGenerationResult> {
    const selectedProvider = providerName || this.defaultProvider;
    const provider = this.providers.get(selectedProvider);

    if (!provider) {
      throw new Error(`AI provider '${selectedProvider}' not found`);
    }

    console.log(`🚀 Generating test cases using ${provider.name}...`);
    
    // Validate provider configuration
    const isValid = await provider.validateConfiguration();
    if (!isValid) {
      throw new Error(`AI provider '${selectedProvider}' is not properly configured`);
    }

    return provider.generateTestCases(context);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async validateProvider(providerName: string): Promise<boolean> {
    const provider = this.providers.get(providerName);
    if (!provider) return false;
    
    return provider.validateConfiguration();
  }
}