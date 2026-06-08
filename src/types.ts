/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DataType = 'texto' | 'numero' | 'fecha' | 'porcentaje' | 'categoria';

export interface ColumnMetadata {
  id: string;        // Unique identifier (sanitized column name)
  name: string;      // Original display name of the column
  type: DataType;    // Inferred data type
  uniqueValues: string[]; // List of all unique non-empty string values (useful for dropdowns)
  min?: number;      // Min value for 'numero' or 'porcentaje'
  max?: number;      // Max value for 'numero' or 'porcentaje'
  minDate?: string;  // Min date string (ISO format or similar)
  maxDate?: string;  // Max date string
}

export interface SheetData {
  columns: ColumnMetadata[];
  rows: Record<string, any>[]; // Structured rows where numeric attributes are actual numbers
  rawRows: string[][];         // Two-dimensional raw CSV data
}

export interface ColumnFilter {
  id: string;
  type: DataType;
  textSearch?: string;         // For text/category filtering
  selectedCategories?: string[]; // For 'categoria' multi-select filtering
  numericRange?: {
    min?: number;
    max?: number;
  };
  dateRange?: {
    min?: string;
    max?: string;
  };
}

export type ChartType = 'bar' | 'line' | 'pie' | 'hbar' | 'area';
export type MetricType = 'suma' | 'promedio' | 'conteo' | 'min' | 'max';

export interface ChartConfig {
  xAxisColumnId: string;
  yAxisColumnId: string;
  chartType: ChartType;
  metric: MetricType;
}
