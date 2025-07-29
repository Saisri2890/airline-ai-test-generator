import express from 'express';
import path from 'path';
import fs from 'fs';
import { ExcelParser } from '../services/excel-parser';

const router = express.Router();

// Parse uploaded Excel file
router.post('/excel/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    // Find the uploaded file
    const files = fs.readdirSync(uploadsDir);
    const matchingFile = files.find(file => file.includes(fileId));
    
    if (!matchingFile) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    const filePath = path.join(uploadsDir, matchingFile);
    
    console.log(`📊 Starting to parse file: ${matchingFile}`);
    
    // Parse the Excel file
    const parser = new ExcelParser();
    const parseResult = await parser.parseGherkinFile(filePath);
    
    if (parseResult.success) {
      console.log(`✅ Successfully parsed ${parseResult.userStories.length} user stories`);
    } else {
      console.log(`❌ Parsing failed with ${parseResult.errors.length} errors`);
    }
    
    res.json({
      success: parseResult.success,
      message: parseResult.success 
        ? `Successfully parsed ${parseResult.userStories.length} user stories`
        : 'Parsing completed with errors',
      data: {
        userStories: parseResult.userStories,
        errors: parseResult.errors,
        summary: parseResult.summary
      }
    });
    
  } catch (error) {
    console.error('Parse endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to parse Excel file',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get parsing status/result for a file
router.get('/result/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // In a real app, you'd store parsing results in database
    // For now, we'll just indicate that parsing is available
    res.json({
      success: true,
      message: 'Parsing endpoint ready',
      fileId,
      status: 'ready'
    });
    
  } catch (error) {
    console.error('Parse result error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get parsing result'
    });
  }
});

// Validate Gherkin format without full parsing
router.post('/validate', async (req, res) => {
  try {
    const { userStory } = req.body;
    
    if (!userStory) {
      return res.status(400).json({
        success: false,
        message: 'User story is required'
      });
    }
    
    const errors = ExcelParser.validateGherkinStory(userStory);
    
    res.json({
      success: errors.length === 0,
      valid: errors.length === 0,
      errors,
      message: errors.length === 0 
        ? 'User story is valid' 
        : 'User story has validation errors'
    });
    
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate user story'
    });
  }
});

export default router;