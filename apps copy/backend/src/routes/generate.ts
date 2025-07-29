// backend/src/routes/generate.ts

import express from 'express';
import { AIService, TestGenerationContext } from '../services/ai-service';
import { ExcelParser, GherkinUserStory } from '../services/excel-parser';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const aiService = new AIService();

// Generate test cases from user stories and modules
router.post('/tests', async (req, res) => {
  try {
    const {
      fileId,
      selectedModules,
      selectedStoryIds,
      userType,
      testingScope = 'full',
      includeNegativeTests = true,
      includePerformanceTests = false,
      includeSecurityTests = false,
      aiProvider = 'mock'
    } = req.body;

    // Validation
    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'File ID is required'
      });
    }

    if (!selectedModules || selectedModules.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one module must be selected'
      });
    }

    if (!selectedStoryIds || selectedStoryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one user story must be selected'
      });
    }

    console.log(`🎯 Generating tests for ${selectedStoryIds.length} stories across ${selectedModules.length} modules`);

    // Find and parse the uploaded file
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const files = fs.readdirSync(uploadsDir);
    const matchingFile = files.find(file => file.includes(fileId));
    
    if (!matchingFile) {
      return res.status(404).json({
        success: false,
        message: 'Uploaded file not found'
      });
    }
    
    const filePath = path.join(uploadsDir, matchingFile);
    
    // Parse the Excel file to get user stories
    const parser = new ExcelParser();
    const parseResult = await parser.parseGherkinFile(filePath);
    
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to parse Excel file',
        errors: parseResult.errors
      });
    }

    // Filter user stories by selected IDs
    const selectedStories = parseResult.userStories.filter(story => 
      selectedStoryIds.includes(story.id)
    );

    if (selectedStories.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid user stories found for the selected IDs'
      });
    }

    // Create test generation context
    const context: TestGenerationContext = {
      userStories: selectedStories,
      selectedModules,
      userType: userType || 'AIRLINE_USER',
      testingScope,
      includeNegativeTests,
      includePerformanceTests,
      includeSecurityTests
    };

    console.log(`📋 Context: ${selectedStories.length} stories, ${selectedModules.length} modules, ${userType} user type`);

    // Generate test cases using AI service
    const result = await aiService.generateTestCases(context, aiProvider);

    if (result.success) {
      console.log(`✅ Successfully generated ${result.testCases.length} test cases`);
    } else {
      console.log(`❌ Test generation failed: ${result.errors.join(', ')}`);
    }

    res.json({
      success: result.success,
      message: result.success 
        ? `Successfully generated ${result.testCases.length} test cases`
        : 'Test generation completed with errors',
      data: {
        testCases: result.testCases,
        summary: result.summary,
        metadata: result.metadata
      },
      errors: result.errors
    });

  } catch (error) {
    console.error('Test generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate test cases',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get available AI providers
router.get('/providers', async (req, res) => {
  try {
    const providers = aiService.getAvailableProviders();
    
    // Get provider status
    const providerStatus = await Promise.all(
      providers.map(async (name) => ({
        name,
        available: await aiService.validateProvider(name),
        displayName: name === 'mock' ? 'Mock AI (Development)' : name
      }))
    );

    res.json({
      success: true,
      providers: providerStatus
    });

  } catch (error) {
    console.error('Providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI providers'
    });
  }
});

// Export test cases in different formats
router.post('/export/:format', async (req, res) => {
  try {
    const { format } = req.params;
    const { testCases, fileName = 'test_cases' } = req.body;

    if (!testCases || testCases.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No test cases provided for export'
      });
    }

    console.log(`📁 Exporting ${testCases.length} test cases as ${format}`);

    switch (format.toLowerCase()) {
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}.json"`);
        res.json({
          exportedAt: new Date().toISOString(),
          totalTestCases: testCases.length,
          testCases
        });
        break;

      case 'csv':
        const csvData = convertToCSV(testCases);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}.csv"`);
        res.send(csvData);
        break;

      default:
        res.status(400).json({
          success: false,
          message: `Unsupported export format: ${format}`
        });
    }

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export test cases'
    });
  }
});

// Helper function to convert test cases to CSV
function convertToCSV(testCases: any[]): string {
  const headers = [
    'Test ID',
    'Title',
    'Description',
    'Module',
    'User Type',
    'Priority',
    'Tags',
    'Steps',
    'Expected Result',
    'Source Story ID'
  ];

  const rows = testCases.map(tc => [
    tc.id,
    tc.title,
    tc.description,
    tc.module,
    tc.userType,
    tc.priority,
    tc.tags.join('; '),
    tc.steps.map((step: any) => `${step.stepNumber}. ${step.action} -> ${step.expectedResult}`).join(' | '),
    tc.expectedResult,
    tc.sourceStoryId || ''
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  return csvContent;
}

export default router;