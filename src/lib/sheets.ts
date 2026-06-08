/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SheetData, ColumnMetadata, DataType, ColumnFilter, MetricType } from '../types';

/**
 * Robust RFC 4180-compliant CSV parser.
 * Handles quoted fields, embedded commas, double quotes, and assorted newlines.
 */
export function parseCSV(csvText: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentValue = "";

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        i++; // Skip the second quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentValue);
      currentValue = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip \n in \r\n
      }
      row.push(currentValue);
      result.push(row);
      row = [];
      currentValue = "";
    } else {
      currentValue += char;
    }
  }

  if (row.length > 0 || currentValue !== "") {
    row.push(currentValue);
    result.push(row);
  }

  // Filter out completely empty rows
  return result.filter(r => r.some(cell => cell.trim() !== ""));
}

/**
 * Format dynamic Sheets URL to a direct CSV Export URL.
 */
export function transformGoogleSheetsUrl(url: string, gid?: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Check if it's already a direct CSV export or pub link
  if (trimmed.includes('pub?output=csv') || trimmed.includes('/export?format=csv')) {
    return trimmed;
  }

  // Match spreadsheet key from standard spreadsheet URLs
  // e.g., https://docs.google.com/spreadsheets/d/1YDCjClzPGpicpCpYqve6jWTaUtMMRQDjBrPc0rvmKPo/edit...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    const key = match[1];
    let exportUrl = `https://docs.google.com/spreadsheets/d/${key}/export?format=csv`;
    if (gid) {
      exportUrl += `&gid=${gid}`;
    } else {
      // Look if there's a gid inside the URL
      const gidMatch = trimmed.match(/[#&]gid=([0-9]+)/);
      if (gidMatch && gidMatch[1]) {
        exportUrl += `&gid=${gidMatch[1]}`;
      }
    }
    return exportUrl;
  }

  return trimmed;
}

/**
 * Parse a date from a cell string.
 */
export function parseDate(val: string): Date | null {
  const trimmed = val.trim();
  if (!trimmed) return null;

  // 1. Check standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Check DD/MM/YYYY or DD-MM-YYYY
  let match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-based
    let year = parseInt(match[3], 10);
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // 3. Try standard JS Date parsing (excluding pure integers)
  if (!/^\d+$/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime()) && trimmed.length > 5) {
      return d;
    }
  }

  return null;
}

/**
 * Parse a percentage from a cell string (e.g. "45.2%" or "-10%").
 */
export function parsePercentage(val: string): number | null {
  const trimmed = val.trim();
  if (!trimmed) return null;
  if (/^-?\d+(?:[.,]\d+)?\s*%$/.test(trimmed)) {
    const numStr = trimmed.replace('%', '').replace(',', '.').trim();
    return parseFloat(numStr) / 100;
  }
  return null;
}

/**
 * Parse a standard or currency number from a cell string, tolerating formatting.
 */
export function parseNumber(val: string): number | null {
  const trimmed = val.trim();
  if (!trimmed) return null;

  // Remove currencies, spaces, and percent sign
  const clean = trimmed.replace(/[$€£\s%]/g, '');

  let standardized = clean;

  // Determine thousand separators vs decimals
  // e.g. European format: 1.234,56 (period as thousand, comma as decimal)
  if (/^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(clean)) {
    standardized = clean.replace(/\./g, '').replace(',', '.');
  } 
  // e.g. US format: 1,234.56 (comma as thousand, period as decimal)
  else if (/^-?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(clean)) {
    standardized = clean.replace(/,/g, '');
  } 
  // Simple check if only one comma and no dots, treat as decimal
  else if (clean.includes(',') && !clean.includes('.')) {
    standardized = clean.replace(',', '.');
  }

  const parsed = Number(standardized);
  return !isNaN(parsed) && isFinite(parsed) ? parsed : null;
}

/**
 * Infer data structures, column metadata, and types from a raw string matrix.
 */
export function processRawData(rawRows: string[][]): SheetData {
  if (rawRows.length === 0) {
    return { columns: [], rows: [], rawRows: [] };
  }

  // First row elements represent our header columns
  const headerRow = rawRows[0];
  const columns: ColumnMetadata[] = [];
  const rows: Record<string, any>[] = [];

  // Generate unique IDs for headers
  const colDetails = headerRow.map((colName, index) => {
    const trimmed = colName.trim() || `Columna_${index + 1}`;
    const cleanId = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || `col_${index}`;
    
    // Ensure uniqueness
    let finalId = cleanId;
    let count = 1;
    while (columns.some(col => col.id === finalId)) {
      finalId = `${cleanId}_${count}`;
      count++;
    }

    return {
      index,
      rawName: trimmed,
      id: finalId,
    };
  });

  const dataRows = rawRows.slice(1);
  const sampleCount = Math.min(dataRows.length, 100);

  // Perform type inference for each column
  colDetails.forEach(({ index, rawName, id }) => {
    let dateHits = 0;
    let percentHits = 0;
    let numHits = 0;
    let nonEmptyCount = 0;
    const valuesList: string[] = [];
    const uniqueRawValues = new Set<string>();

    for (let r = 0; r < dataRows.length; r++) {
      const cellVal = dataRows[r][index];
      if (cellVal !== undefined) {
        const strVal = cellVal.trim();
        if (strVal !== "") {
          uniqueRawValues.add(strVal);
          if (r < sampleCount) {
            nonEmptyCount++;
            if (parseDate(strVal) !== null) dateHits++;
            if (parsePercentage(strVal) !== null) percentHits++;
            if (parseNumber(strVal) !== null) numHits++;
          }
        }
      }
    }

    // Default column type
    let inferredType: DataType = 'texto';

    if (nonEmptyCount > 0) {
      if (dateHits / nonEmptyCount >= 0.8) {
        inferredType = 'fecha';
      } else if (percentHits / nonEmptyCount >= 0.8) {
        inferredType = 'porcentaje';
      } else if (numHits / nonEmptyCount >= 0.8) {
        inferredType = 'numero';
      } else {
        // Evaluate if it qualifies as a category
        const uniqueCount = uniqueRawValues.size;
        const totalRows = dataRows.length;

        // Low cardinality threshold (e.g. at most 15 unique values or less than 35% of total entries)
        if (uniqueCount > 0 && (uniqueCount <= 15 || (totalRows > 10 && uniqueCount / totalRows <= 0.35))) {
          inferredType = 'categoria';
        }
      }
    }

    // Sort unique values elegantly
    const sortedUniqueValues = Array.from(uniqueRawValues).sort((a, b) => {
      const numA = parseNumber(a);
      const numB = parseNumber(b);
      if (numA !== null && numB !== null) return numA - numB;
      return a.localeCompare(b, 'es', { numeric: true });
    });

    columns.push({
      id,
      name: rawName,
      type: inferredType,
      uniqueValues: sortedUniqueValues,
    });
  });

  // Convert row structures into typed rows
  dataRows.forEach((rawRow) => {
    const rowObj: Record<string, any> = {};
    let hasData = false;

    colDetails.forEach(({ index, id }) => {
      const colMeta = columns.find(c => c.id === id);
      const value = rawRow[index] !== undefined ? rawRow[index].trim() : "";
      
      if (value !== "") {
        hasData = true;
      }

      rowObj[id] = value; // Keep string represented by default

      if (colMeta) {
        if (colMeta.type === 'numero') {
          const parsed = parseNumber(value);
          rowObj[`_parsed_${id}`] = parsed !== null ? parsed : undefined;
        } else if (colMeta.type === 'porcentaje') {
          const parsed = parsePercentage(value);
          rowObj[`_parsed_${id}`] = parsed !== null ? parsed : undefined;
        } else if (colMeta.type === 'fecha') {
          const parsed = parseDate(value);
          rowObj[`_parsed_${id}`] = parsed !== null ? parsed.toISOString() : undefined;
        }
      }
    });

    if (hasData) {
      rows.push(rowObj);
    }
  });

  // Calculate limits (min, max, dates) for numerical and date columns
  columns.forEach((col) => {
    if (col.type === 'numero' || col.type === 'porcentaje') {
      const parsedValues = rows
        .map(r => r[`_parsed_${col.id}`])
        .filter((v): v is number => v !== undefined);

      if (parsedValues.length > 0) {
        col.min = Math.min(...parsedValues);
        col.max = Math.max(...parsedValues);
      }
    } else if (col.type === 'fecha') {
      const parsedDates = rows
        .map(r => r[`_parsed_${col.id}`])
        .filter((v): v is string => v !== undefined)
        .map(dStr => new Date(dStr));

      if (parsedDates.length > 0) {
        const timestamps = parsedDates.map(d => d.getTime());
        col.minDate = new Date(Math.min(...timestamps)).toISOString().split('T')[0];
        col.maxDate = new Date(Math.max(...timestamps)).toISOString().split('T')[0];
      }
    }
  });

  return { columns, rows, rawRows };
}

/**
 * Filter rows based on a list of active filters and global search.
 */
export function filterRows(
  rows: Record<string, any>[],
  columns: ColumnMetadata[],
  filters: ColumnFilter[],
  globalSearch: string
): Record<string, any>[] {
  const normSearch = globalSearch.toLowerCase().trim();

  return rows.filter((row) => {
    // 1. Global Search
    if (normSearch) {
      const matchesSearch = columns.some((col) => {
        const cellValue = String(row[col.id] || '').toLowerCase();
        return cellValue.includes(normSearch);
      });
      if (!matchesSearch) return false;
    }

    // 2. Column-specific filters
    for (const filter of filters) {
      const cellValueRaw = row[filter.id] || '';
      const cellValueStr = String(cellValueRaw);
      const parsedVal = row[`_parsed_${filter.id}`];

      // Text search in specific column
      if (filter.textSearch) {
        const term = filter.textSearch.toLowerCase().trim();
        if (!cellValueStr.toLowerCase().includes(term)) {
          return false;
        }
      }

      // Multi-select categories
      if (filter.selectedCategories && filter.selectedCategories.length > 0) {
        const valChar = cellValueStr.trim();
        if (!filter.selectedCategories.includes(valChar)) {
          return false;
        }
      }

      // Numeric range numeric values
      if (filter.type === 'numero' || filter.type === 'porcentaje') {
        const numVal = parsedVal;
        if (numVal === undefined) return false; // If empty or unparseable, exclude
        if (filter.numericRange) {
          const { min, max } = filter.numericRange;
          if (min !== undefined && numVal < min) return false;
          if (max !== undefined && numVal > max) return false;
        }
      }

      // Date range filtering
      if (filter.type === 'fecha') {
        if (!parsedVal) return false; // Exclude empty dates
        const cellTime = new Date(parsedVal).getTime();
        if (filter.dateRange) {
          const { min, max } = filter.dateRange;
          if (min) {
            const minTime = new Date(min).getTime();
            if (cellTime < minTime) return false;
          }
          if (max) {
            const maxTime = new Date(max).getTime();
            if (cellTime > maxTime) return false;
          }
        }
      }
    }

    return true;
  });
}

/**
 * Formats values beautifully according to their types for the user.
 */
export function formatCellValue(value: any, type: DataType, locale: string = 'es-ES'): string {
  if (value === undefined || value === null || value === '') return '-';

  if (type === 'numero') {
    const num = typeof value === 'number' ? value : parseNumber(String(value));
    if (num !== null) {
      return num.toLocaleString(locale, { maximumFractionDigits: 2 });
    }
  } else if (type === 'porcentaje') {
    const pct = typeof value === 'number' ? value : parsePercentage(String(value));
    if (pct !== null) {
      return (pct * 100).toLocaleString(locale, { maximumFractionDigits: 1 }) + '%';
    }
  } else if (type === 'fecha') {
    const d = parseDate(String(value));
    if (d) {
      return d.toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  }

  return String(value);
}

/**
 * Perform metric computations over selected numeric columns.
 */
export function computeAggregate(
  rows: Record<string, any>[],
  columnId: string,
  metric: MetricType
): number {
  if (rows.length === 0) return 0;

  // Retrieve numeric representations
  const numericValues = rows
    .map(r => r[`_parsed_${columnId}`] ?? parseNumber(String(r[columnId])))
    .filter((v): v is number => v !== null && v !== undefined);

  if (numericValues.length === 0) {
    if (metric === 'conteo') return rows.length;
    return 0;
  }

  switch (metric) {
    case 'suma':
      return numericValues.reduce((sum, v) => sum + v, 0);

    case 'promedio':
      return numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;

    case 'conteo':
      return rows.length;

    case 'min':
      return Math.min(...numericValues);

    case 'max':
      return Math.max(...numericValues);

    default:
      return 0;
  }
}

/**
 * Export structured rows into a standard CSV string for client download.
 */
export function downloadCSV(
  rows: Record<string, any>[],
  columns: ColumnMetadata[],
  visibleColumnIds: string[]
): string {
  const selectedCols = columns.filter(c => visibleColumnIds.includes(c.id));
  
  // Create header row
  const header = selectedCols.map(c => `"${c.name.replace(/"/g, '""')}"`).join(',');
  
  // Create data rows
  const csvLines = rows.map((row) => {
    return selectedCols.map((col) => {
      const rawVal = row[col.id] || '';
      // Escape inner quotes
      const escVal = String(rawVal).replace(/"/g, '""');
      return `"${escVal}"`;
    }).join(',');
  });

  return [header, ...csvLines].join('\n');
}
