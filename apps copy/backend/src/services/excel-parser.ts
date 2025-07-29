// backend/src/services/excel-parser.ts

import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

export interface GherkinUserStory {
  id: string;
  description: string;
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: string;
  requirements: string;
  notes?: string;
  acId?: string;
  given: string;
  when: string;
  then: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface ParseResult {
  success: boolean;
  userStories: GherkinUserStory[];
  errors: string[];
  summary: {
    totalRows: number;
    validStories: number;
    errors: number;
    fileName: string;
  };
}

export class ExcelParser {
  private workbook: XLSX.WorkBook | null = null;
  private worksheet: XLSX.WorkSheet | null = null;

  /**
   * Parse Excel file containing Gherkin user stories
   */
  async parseGherkinFile(filePath: string): Promise<ParseResult> {
    try {
      const buffer = fs.readFileSync(filePath);
      this.workbook = XLSX.read(buffer, {
        cellStyles: true,
        cellFormula: true,
        cellDates: true,
        cellNF: true,
        sheetStubs: true
      });

      if (!this.workbook.SheetNames.length) {
        return {
          success: false,
          userStories: [],
          errors: ['No worksheets found in the Excel file'],
          summary: {
            totalRows: 0,
            validStories: 0,
            errors: 1,
            fileName: path.basename(filePath)
          }
        };
      }

      // Use the first sheet
      const sheetName = this.workbook.SheetNames[0];
      this.worksheet = this.workbook.Sheets[sheetName];

      console.log(`📊 Parsing Excel sheet: ${sheetName}`);

      // Parse the worksheet
      const parseResult = this.parseWorksheet();
      
      return {
        ...parseResult,
        summary: {
          ...parseResult.summary,
          fileName: path.basename(filePath)
        }
      };

    } catch (error) {
      console.error('Excel parsing error:', error);
      return {
        success: false,
        userStories: [],
        errors: [`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`],
        summary: {
          totalRows: 0,
          validStories: 0,
          errors: 1,
          fileName: path.basename(filePath)
        }
      };
    }
  }

  /**
   * Parse worksheet and extract user stories
   */
  private parseWorksheet(): Omit<ParseResult, 'summary'> & { summary: Omit<ParseResult['summary'], 'fileName'> } {
    if (!this.worksheet) {
      return {
        success: false,
        userStories: [],
        errors: ['No worksheet available'],
        summary: { totalRows: 0, validStories: 0, errors: 1 }
      };
    }

    const userStories: GherkinUserStory[] = [];
    const errors: string[] = [];

    // Convert worksheet to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(this.worksheet, { 
      header: 1,
      defval: '',
      blankrows: false 
    }) as any[][];

    if (jsonData.length < 2) {
      return {
        success: false,
        userStories: [],
        errors: ['Excel file must contain at least a header row and one data row'],
        summary: { totalRows: jsonData.length, validStories: 0, errors: 1 }
      };
    }

    // Detect column mapping
    const headerRow = jsonData[0];
    const columnMapping = this.detectColumnMapping(headerRow);
    
    if (!columnMapping) {
      return {
        success: false,
        userStories: [],
        errors: ['Could not detect valid Gherkin format columns. Please check your Excel structure.'],
        summary: { totalRows: jsonData.length, validStories: 0, errors: 1 }
      };
    }

    console.log('📋 Detected column mapping:', columnMapping);

    // Process data rows
    for (let rowIndex = 1; rowIndex < jsonData.length; rowIndex++) {
      const row = jsonData[rowIndex];
      
      try {
        const userStory = this.parseUserStoryRow(row, columnMapping, rowIndex + 1);
        if (userStory) {
          userStories.push(userStory);
        }
      } catch (error) {
        const errorMsg = `Row ${rowIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.warn('⚠️', errorMsg);
      }
    }

    const success = userStories.length > 0;
    console.log(`✅ Parsed ${userStories.length} user stories with ${errors.length} errors`);

    return {
      success,
      userStories,
      errors,
      summary: {
        totalRows: jsonData.length - 1, // Exclude header
        validStories: userStories.length,
        errors: errors.length
      }
    };
  }

  /**
   * Detect column mapping from header row
   */
  private detectColumnMapping(headerRow: any[]): Record<string, number> | null {
    const mapping: Record<string, number> = {};
    
    // Common column patterns for Gherkin format
    const patterns = {
      id: /^(id|story.?id|user.?story.?id)$/i,
      description: /^(description|story|title|summary)$/i,
      asA: /^(as.?a|role|user.?type|actor)$/i,
      iWant: /^(i.?want|want|goal|objective)$/i,
      soThat: /^(so.?that|benefit|value|outcome)$/i,
      acceptanceCriteria: /^(acceptance.?criteria|ac|criteria|acceptance)$/i,
      requirements: /^(requirements?|req|business.?rules?)$/i,
      notes: /^(notes?|comments?|remarks?)$/i,
      acId: /^(ac.?id|criteria.?id|acceptance.?id)$/i,
      given: /^(given|precondition|setup)$/i,
      when: /^(when|action|trigger|event)$/i,
      then: /^(then|expected|result|outcome)$/i,
      tags: /^(tags?|labels?|categories?)$/i,
      priority: /^(priority|importance|level)$/i
    };

    // Find column indices for each pattern
    headerRow.forEach((header, index) => {
      if (!header || typeof header !== 'string') return;
      
      const cleanHeader = header.toString().trim();
      
      for (const [key, pattern] of Object.entries(patterns)) {
        if (pattern.test(cleanHeader) && !mapping[key]) {
          mapping[key] = index;
          break;
        }
      }
    });

    // Check if we have minimum required columns
    const requiredColumns = ['description', 'given', 'when', 'then'];
    const hasRequired = requiredColumns.every(col => mapping[col] !== undefined);

    if (!hasRequired) {
      console.warn('⚠️ Missing required columns. Found:', Object.keys(mapping));
      return null;
    }

    return mapping;
  }

  /**
   * Parse individual user story row
   */
  private parseUserStoryRow(
    row: any[], 
    columnMapping: Record<string, number>, 
    rowNumber: number
  ): GherkinUserStory | null {
    const getValue = (key: string): string => {
      const index = columnMapping[key];
      return index !== undefined ? (row[index] || '').toString().trim() : '';
    };

    // Get required fields
    const description = getValue('description');
    const given = getValue('given');
    const when = getValue('when');
    const then = getValue('then');

    // Skip empty rows
    if (!description && !given && !when && !then) {
      return null;
    }

    // Validate required fields
    if (!description) {
      throw new Error('Description is required');
    }
    if (!given) {
      throw new Error('Given clause is required');
    }
    if (!when) {
      throw new Error('When clause is required');
    }
    if (!then) {
      throw new Error('Then clause is required');
    }

    // Generate ID if not provided
    const id = getValue('id') || `US-${rowNumber.toString().padStart(3, '0')}`;

    // Parse priority
    const priorityText = getValue('priority').toLowerCase();
    let priority: GherkinUserStory['priority'] = 'medium';
    if (['high', 'critical', 'low'].includes(priorityText)) {
      priority = priorityText as GherkinUserStory['priority'];
    }

    // Parse tags
    const tagsText = getValue('tags');
    const tags = tagsText ? tagsText.split(',').map(tag => tag.trim()).filter(Boolean) : [];

    const userStory: GherkinUserStory = {
      id,
      description,
      asA: getValue('asA'),
      iWant: getValue('iWant'),
      soThat: getValue('soThat'),
      acceptanceCriteria: getValue('acceptanceCriteria'),
      requirements: getValue('requirements'),
      notes: getValue('notes'),
      acId: getValue('acId'),
      given,
      when,
      then,
      tags,
      priority
    };

    return userStory;
  }

  /**
   * Validate Gherkin format
   */
  static validateGherkinStory(story: GherkinUserStory): string[] {
    const errors: string[] = [];

    if (!story.description) errors.push('Description is required');
    if (!story.given) errors.push('Given clause is required');
    if (!story.when) errors.push('When clause is required');
    if (!story.then) errors.push('Then clause is required');

    // Validate Gherkin syntax
    if (story.given && !story.given.toLowerCase().startsWith('given')) {
      errors.push('Given clause should start with "Given"');
    }
    if (story.when && !story.when.toLowerCase().startsWith('when')) {
      errors.push('When clause should start with "When"');
    }
    if (story.then && !story.then.toLowerCase().startsWith('then')) {
      errors.push('Then clause should start with "Then"');
    }

    return errors;
  }
}