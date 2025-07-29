export interface TestGenerationContext {
  userStories: GherkinUserStory[];
  selectedModules: string[];
  userType: 'airline_user' | 'travel_agent' | 'retail_user';
  testingScope: 'smoke' | 'regression' | 'full' | 'custom';
  includeNegativeTests: boolean;
  includePerformanceTests: boolean;
  includeSecurityTests: boolean;
  knowledgeBase?: KnowledgeBaseData;
  airlineContext?: AirlineBusinessRules;
}

export interface TestGenerationResult {
  testCases: TestCase[];
  generationTime: number;
  tokensUsed?: number;
  model?: string;
  provider: string;
  metadata: {
    totalGenerated: number;
    successful: number;
    failed: number;
    warnings: string[];
  };
}

export abstract class BaseAIProvider {
  abstract name: string;
  abstract model: string;
  abstract apiKey: string;
  
  abstract validateConfiguration(): Promise<boolean>;
  abstract generateTestCases(context: TestGenerationContext): Promise<TestGenerationResult>;
  
  protected buildAirlinePrompt(context: TestGenerationContext): string {
    const moduleContext = this.getModuleContext(context.selectedModules);
    const userTypeContext = this.getUserTypeContext(context.userType);
    const businessRules = this.getAirlineBusinessRules();
    
    return `
You are an expert airline software test case generator specializing in booking systems.

AIRLINE DOMAIN CONTEXT:
${businessRules}

USER TYPE: ${context.userType}
${userTypeContext}

MODULES: ${context.selectedModules.join(', ')}
${moduleContext}

TESTING SCOPE: ${context.testingScope}
- Include Negative Tests: ${context.includeNegativeTests}
- Include Performance Tests: ${context.includePerformanceTests}
- Include Security Tests: ${context.includeSecurityTests}

USER STORIES TO CONVERT:
${context.userStories.map(story => `
ID: ${story.id}
Description: ${story.description}
As a: ${story.asA}
I want: ${story.iWant}
So that: ${story.soThat}
Given: ${story.given}
When: ${story.when}
Then: ${story.then}
Acceptance Criteria: ${story.acceptanceCriteria}
---
`).join('\n')}

REQUIREMENTS:
1. Generate comprehensive test cases for each user story
2. Include positive and negative scenarios based on settings
3. Use airline industry terminology and standards
4. Consider PNR, booking references, fare rules, and payment processing
5. Include data validation for passenger details, routes, dates
6. Test workflow transitions between modules
7. Consider user role permissions and access controls

OUTPUT FORMAT:
Return a JSON array of test cases with this exact structure:
{
  "testCases": [
    {
      "id": "TC_001",
      "title": "Test case title",
      "description": "Detailed description",
      "module": "module_name",
      "userType": "${context.userType}",
      "priority": "high|medium|low|critical",
      "tags": ["tag1", "tag2"],
      "preconditions": ["Precondition 1", "Precondition 2"],
      "steps": [
        {
          "stepNumber": 1,
          "action": "Action to perform",
          "expectedResult": "Expected outcome",
          "testData": "Test data if needed"
        }
      ],
      "expectedResult": "Overall expected result",
      "sourceStoryId": "${context.userStories[0]?.id}"
    }
  ]
}
`;
  }

  private getModuleContext(modules: string[]): string {
    const moduleDescriptions = {
      'new_request': 'Initial booking request creation with passenger details, route selection, and fare calculation',
      'request_processing': 'Processing booking requests through workflow states and validation',
      'fare_approval': 'Fare validation, approval workflow, and pricing rule verification',
      'fare_quotation': 'Fare quoting for negotiated requests and special pricing',
      'rm_review': 'Revenue management review and approval processes',
      'payment_processing': 'Payment handling including single and split payments, PCI compliance',
      'name_list_update': 'Passenger name modifications and PNR updates',
      'ticketing': 'Ticket issuance, e-ticket generation, and delivery',
      'upsize': 'Adding passengers to existing bookings',
      'downsize': 'Removing passengers from bookings',
      'divide': 'Splitting bookings into separate PNRs',
      'change_itinerary': 'Route and schedule modifications',
      'partial_modify': 'Partial booking modifications',
      'negotiation': 'Fare negotiation workflows and approval chains'
    };
    
    return modules.map(m => `${m}: ${moduleDescriptions[m] || 'Module functionality'}`).join('\n');
  }

  private getUserTypeContext(userType: string): string {
    const contexts = {
      'airline_user': 'Full system access - can quote fares, approve requests, process payments, issue tickets, and perform all modifications',
      'travel_agent': 'Can raise requests, accept bookings, process payments, update name lists, and issue tickets',
      'retail_user': 'Limited access to basic booking functions and modifications'
    };
    return contexts[userType] || '';
  }

  private getAirlineBusinessRules(): string {
    return `
AIRLINE BUSINESS RULES:
- PNR (Passenger Name Record) must be unique 6-character alphanumeric
- Booking references follow IATA standards
- Payment processing must comply with PCI DSS
- Fare rules include advance purchase, minimum stay, change penalties
- Route validation against published schedules and aircraft capacity
- Passenger names must match travel documents exactly
- Date format: ISO 8601 for system processing, localized for display
- Currency handling with proper exchange rates and rounding
- Seat inventory management and overbooking controls
- Check-in and boarding pass generation workflows
`;
  }
}