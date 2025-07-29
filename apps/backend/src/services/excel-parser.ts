// backend/src/services/excel-parser.ts
import * as XLSX from 'xlsx';

export interface GherkinUserStory {
  id: string;
  description: string;
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: string;
  requirements: string;
  given: string;
  when: string;
  then: string;
  notes?: string;
  acId?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface ParseResult {
  success: boolean;
  data: GherkinUserStory[];
  errors: string[];
  totalRows: number;
  validRows: number;
}

export interface ColumnMapping {
  id: number | null;
  description: number | null;
  asA: number | null;
  iWant: number | null;
  soThat: number | null;
  acceptanceCriteria: number | null;
  requirements: number | null;
  given: number | null;
  when: number | null;
  then: number | null;
  notes: number | null;
  acId: number | null;
}

export class ExcelParser {
  private columnPatterns = {
    id: /^(id|story.?id|user.?story.?id)$/i,
    description: /^(description|story.?description|title)$/i,
    asA: /^(as.?a|role|user.?role|persona)$/i,
    iWant: /^(i.?want|want|goal|objective)$/i,
    soThat: /^(so.?that|benefit|value|outcome)$/i,
    acceptanceCriteria: /^(acceptance.?criteria|ac|criteria)$/i,
    requirements: /^(requirements?|req|specification)$/i,
    given: /^(given|precondition|setup)$/i,
    when: /^(when|action|step)$/i,
    then: /^(then|expected|result|outcome)$/i,
    notes: /^(notes?|comments?|remarks?)$/i,
    acId: /^(ac.?id|criteria.?id)$/i
  };

  async parseExcelFile(buffer: Buffer): Promise<ParseResult> {
    try {
      // Fix: Remove defval from XLSX.read options
      const workbook = XLSX.read(buffer, {
        type: 'buffer',
        cellText: false,
        cellDates: true,
        cellFormula: false,
        sheetStubs: true
      });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Fix: Use defval in sheet_to_json where it belongs
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        blankrows: false,
        defval: '' // This is the correct place for defval
      });

      if (jsonData.length < 2) {
        return {
          success: false,
          data: [],
          errors: ['File must contain at least a header row and one data row'],
          totalRows: jsonData.length,
          validRows: 0
        };
      }

      const headerRow = jsonData[0] as string[];
      const dataRows = jsonData.slice(1) as string[][];

      // Detect column mapping
      const columnMapping = this.detectColumnMapping(headerRow);
      if (!columnMapping) {
        return {
          success: false,
          data: [],
          errors: ['Unable to detect required columns. Please ensure your Excel file has proper headers.'],
          totalRows: jsonData.length,
          validRows: 0
        };
      }

      // Parse data rows
      const parseResult = this.parseDataRows(dataRows, columnMapping);
      
      return {
        success: parseResult.errors.length === 0,
        data: parseResult.stories,
        errors: parseResult.errors,
        totalRows: dataRows.length,
        validRows: parseResult.stories.length
      };

    } catch (error) {
      console.error('Excel parsing error:', error);
      return {
        success: false,
        data: [],
        errors: [`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`],
        totalRows: 0,
        validRows: 0
      };
    }
  }

  private detectColumnMapping(headerRow: string[]): ColumnMapping | null {
    const mapping: ColumnMapping = {
      id: null,
      description: null,
      asA: null,
      iWant: null,
      soThat: null,
      acceptanceCriteria: null,
      requirements: null,
      given: null,
      when: null,
      then: null,
      notes: null,
      acId: null
    };

    // Map headers to columns
    headerRow.forEach((header, index) => {
      if (!header || typeof header !== 'string') return;
      
      const cleanHeader = header.trim().toLowerCase();
      
      for (const [field, pattern] of Object.entries(this.columnPatterns)) {
        if (pattern.test(cleanHeader)) {
          (mapping as any)[field] = index;
          break;
        }
      }
    });

    // Check if we have minimum required columns
    const requiredFields = ['description', 'given', 'when', 'then'];
    const hasRequiredFields = requiredFields.every(field => 
      (mapping as any)[field] !== null
    );

    return hasRequiredFields ? mapping : null;
  }

  private parseDataRows(dataRows: string[][], mapping: ColumnMapping) {
    const stories: GherkinUserStory[] = [];
    const errors: string[] = [];

    dataRows.forEach((row, rowIndex) => {
      try {
        const story = this.parseRow(row, mapping, rowIndex + 2);
        if (story) {
          stories.push(story);
        }
      } catch (error) {
        errors.push(`Row ${rowIndex + 2}: ${error instanceof Error ? error.message : 'Parse error'}`);
      }
    });

    return { stories, errors };
  }

  private parseRow(row: string[], mapping: ColumnMapping, rowNumber: number): GherkinUserStory | null {
    const getCellValue = (columnIndex: number | null): string => {
      if (columnIndex === null || columnIndex >= row.length) return '';
      const value = row[columnIndex];
      return value ? String(value).trim() : '';
    };

    const description = getCellValue(mapping.description);
    const given = getCellValue(mapping.given);
    const when = getCellValue(mapping.when);
    const then = getCellValue(mapping.then);

    if (!description && !given && !when && !then) {
      return null;
    }

    if (!description) throw new Error('Description is required');
    if (!given) throw new Error('Given condition is required');
    if (!when) throw new Error('When action is required');
    if (!then) throw new Error('Then result is required');

    const id = getCellValue(mapping.id) || `US-${String(rowNumber).padStart(3, '0')}`;
    const asA = getCellValue(mapping.asA) || 'User';
    const iWant = getCellValue(mapping.iWant) || description;
    const soThat = getCellValue(mapping.soThat) || 'I can achieve my goal';

    return {
      id,
      description,
      asA,
      iWant,
      soThat,
      acceptanceCriteria: getCellValue(mapping.acceptanceCriteria),
      requirements: getCellValue(mapping.requirements),
      given,
      when,
      then,
      notes: getCellValue(mapping.notes),
      acId: getCellValue(mapping.acId),
      tags: [],
      priority: 'medium'
    };
  }

  validateUserStory(story: Partial<GherkinUserStory>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!story.description?.trim()) errors.push('Description is required');
    if (!story.given?.trim()) errors.push('Given condition is required');
    if (!story.when?.trim()) errors.push('When action is required');
    if (!story.then?.trim()) errors.push('Then result is required');

    if (story.given && !story.given.toLowerCase().startsWith('given')) {
      errors.push('Given condition should start with "Given"');
    }
    if (story.when && !story.when.toLowerCase().startsWith('when')) {
      errors.push('When action should start with "When"');
    }
    if (story.then && !story.then.toLowerCase().startsWith('then')) {
      errors.push('Then result should start with "Then"');
    }

    return { valid: errors.length === 0, errors };
  }
}

export const excelParser = new ExcelParser();