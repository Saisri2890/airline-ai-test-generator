// backend/src/routes/parse.ts
import express from 'express';
import path from 'path';
import fs from 'fs';
import { excelParser, GherkinUserStory } from '../services/excel-parser';

const router = express.Router();

// Parse uploaded Excel file
router.post('/excel/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // Construct file path
    const uploadsDir = path.join(__dirname, '../../uploads');
    const filePath = path.join(uploadsDir, fileId);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Read file buffer
    const fileBuffer = fs.readFileSync(filePath);
    
    // Parse the Excel file using the correct method name
    const parseResult = await excelParser.parseExcelFile(fileBuffer);
    
    // Return results with correct property names
    res.json({
      success: parseResult.success,
      message: parseResult.success 
        ? `Successfully parsed ${parseResult.data.length} user stories`
        : 'Parsing completed with errors',
      data: {
        userStories: parseResult.data, // Map 'data' to 'userStories' for frontend compatibility
        errors: parseResult.errors,
        summary: {
          fileName: fileId,
          totalRows: parseResult.totalRows,
          validRows: parseResult.validRows,
          errorCount: parseResult.errors.length
        }
      },
      stats: {
        totalStoriesFound: parseResult.data.length,
        validStories: parseResult.validRows,
        fileName: fileId
      }
    });
    
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during parsing'
    });
  }
});

// Validate single user story
router.post('/validate', async (req, res) => {
  try {
    const { userStory } = req.body;
    
    if (!userStory) {
      return res.status(400).json({
        success: false,
        error: 'User story is required'
      });
    }
    
    // Use the correct validation method
    const validation = excelParser.validateUserStory(userStory);
    
    res.json({
      success: validation.valid,
      valid: validation.valid,
      errors: validation.errors
    });
    
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during validation'
    });
  }
});

// Get uploaded file details
router.get('/file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const uploadsDir = path.join(__dirname, '../../uploads');
    const filePath = path.join(uploadsDir, fileId);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    const stats = fs.statSync(filePath);
    res.json({
      success: true,
      file: {
        id: fileId,
        name: fileId,
        size: stats.size,
        uploadedAt: stats.birthtime
      }
    });
    
  } catch (error) {
    console.error('File details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get file details'
    });
  }
});

// Preview uploaded file (just basic info)
router.get('/preview/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const uploadsDir = path.join(__dirname, '../../uploads');
    const filePath = path.join(uploadsDir, fileId);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Read file buffer
    const fileBuffer = fs.readFileSync(filePath);
    
    // Parse the file to get preview
    const result = await excelParser.parseExcelFile(fileBuffer);
    
    res.json({
      success: true,
      preview: {
        totalRows: result.totalRows,
        validRows: result.validRows,
        errorCount: result.errors.length,
        hasErrors: result.errors.length > 0,
        sampleStories: result.data.slice(0, 3) // First 3 stories as preview
      }
    });
    
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview file'
    });
  }
});

// Get parse format help
router.get('/format-help', (req, res) => {
  res.json({
    success: true,
    format: {
      requiredColumns: [
        'Description',
        'Given',
        'When', 
        'Then'
      ],
      optionalColumns: [
        'ID',
        'As A',
        'I Want',
        'So That',
        'Acceptance Criteria',
        'Requirements',
        'Notes',
        'AC ID'
      ],
      columnPatterns: {
        id: ['id', 'story id', 'user story id'],
        description: ['description', 'story description', 'title'],
        asA: ['as a', 'role', 'user role', 'persona'],
        iWant: ['i want', 'want', 'goal', 'objective'],
        soThat: ['so that', 'benefit', 'value', 'outcome'],
        given: ['given', 'precondition', 'setup'],
        when: ['when', 'action', 'step'],
        then: ['then', 'expected', 'result', 'outcome'],
        acceptanceCriteria: ['acceptance criteria', 'ac', 'criteria'],
        requirements: ['requirements', 'req', 'specification'],
        notes: ['notes', 'comments', 'remarks']
      },
      example: {
        id: 'US-001',
        description: 'User login to airline system',
        asA: 'Travel Agent',
        iWant: 'to login to the system',
        soThat: 'I can access booking functionality',
        given: 'Given I am on the login page',
        when: 'When I enter valid credentials',
        then: 'Then I should be logged in successfully',
        acceptanceCriteria: 'User should see dashboard after login',
        requirements: 'Must support multi-factor authentication'
      }
    }
  });
});

export default router;