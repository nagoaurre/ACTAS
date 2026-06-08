/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Database, Sigma, Award, TrendingUp, Sparkles, Filter } from 'lucide-react';
import { ColumnMetadata } from '../types';
import { computeAggregate, formatCellValue } from '../lib/sheets';

interface KPICardsProps {
  columns: ColumnMetadata[];
  filteredRows: Record<string, any>[];
  totalRows: Record<string, any>[];
  isDark: boolean;
}

export default function KPICards({ columns, filteredRows, totalRows, isDark }: KPICardsProps) {
  // Find first numeric columns for Sum and Average representation
  const numericColumns = columns.filter(c => c.type === 'numero' || c.type === 'porcentaje');
  const categoricalColumns = columns.filter(c => c.type === 'categoria');

  const firstNumCol = numericColumns[0];
  const secondNumCol = numericColumns[1] || numericColumns[0];

  // Calculate sum for first numeric column
  const sumVal = firstNumCol ? computeAggregate(filteredRows, firstNumCol.id, 'suma') : 0;
  // Calculate average for second numeric column
  const avgVal = secondNumCol ? computeAggregate(filteredRows, secondNumCol.id, 'promedio') : 0;

  // Calculate most frequent category
  let topCategoryInfo = { columnName: '', value: '-', count: 0 };
  if (categoricalColumns.length > 0) {
    const firstCatCol = categoricalColumns[0];
    const freqMap: Record<string, number> = {};
    
    filteredRows.forEach((row) => {
      const val = String(row[firstCatCol.id] || '').trim();
      if (val) {
        freqMap[val] = (freqMap[val] || 0) + 1;
      }
    });

    let topVal = '-';
    let maxCount = 0;
    Object.entries(freqMap).forEach(([val, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topVal = val;
      }
    });

    if (maxCount > 0) {
      topCategoryInfo = {
        columnName: firstCatCol.name,
        value: topVal,
        count: maxCount
      };
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" id="kpi-cards-grid">
      
      {/* KPI 1: Registros Totales */}
      <div className={`p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden flex items-center justify-between ${
        isDark 
          ? "bg-slate-900/60 border-slate-800 text-slate-100" 
          : "bg-white border-slate-100 shadow-xs text-slate-800"
      }`}>
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total de Registros</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight">{filteredRows.length}</span>
            {filteredRows.length < totalRows.length && (
              <span className="text-xs text-amber-500 font-semibold flex items-center gap-0.5" title="Sujeto a filtros">
                <Filter size={10} />
                Filtrado
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400">Total en la hoja: {totalRows.length}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${isDark ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}>
          <Database size={20} />
        </div>
      </div>

      {/* KPI 2: Suma de Columna Numérica */}
      <div className={`p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden flex items-center justify-between ${
        isDark 
          ? "bg-slate-900/60 border-slate-800 text-slate-100" 
          : "bg-white border-slate-100 shadow-xs text-slate-800"
      }`}>
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">
            Suma total {firstNumCol ? `(${firstNumCol.name})` : ''}
          </p>
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-3xl font-extrabold tracking-tight truncate">
              {firstNumCol ? formatCellValue(sumVal, firstNumCol.type) : '0'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 truncate">
            {firstNumCol ? `Inferencia: ${firstNumCol.type === 'porcentaje' ? 'Porcentaje' : 'Numérico'}` : 'Sin datos numéricos'}
          </p>
        </div>
        <div className={`p-2.5 rounded-xl ${isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
          <Sigma size={20} />
        </div>
      </div>

      {/* KPI 3: Promedio de Columna Numérica */}
      <div className={`p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden flex items-center justify-between ${
        isDark 
          ? "bg-slate-900/60 border-slate-800 text-slate-100" 
          : "bg-white border-slate-100 shadow-xs text-slate-800"
      }`}>
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">
            Promedio {secondNumCol ? `(${secondNumCol.name})` : ''}
          </p>
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-3xl font-extrabold tracking-tight truncate">
              {secondNumCol ? formatCellValue(avgVal, secondNumCol.type) : '0'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 truncate">
            {secondNumCol ? `Inferencia: ${secondNumCol.type === 'porcentaje' ? 'Porcentaje' : 'Numérico'}` : 'Sin datos numéricos'}
          </p>
        </div>
        <div className={`p-2.5 rounded-xl ${isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
          <TrendingUp size={20} />
        </div>
      </div>

      {/* KPI 4: Categoría Frecuente */}
      <div className={`p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden flex items-center justify-between ${
        isDark 
          ? "bg-slate-900/60 border-slate-800 text-slate-100" 
          : "bg-white border-slate-100 shadow-xs text-slate-800"
      }`}>
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">
            Frecuente {topCategoryInfo.columnName ? `(${topCategoryInfo.columnName})` : ''}
          </p>
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-xl font-bold tracking-tight truncate block" title={topCategoryInfo.value}>
              {topCategoryInfo.value}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 truncate">
            {topCategoryInfo.count > 0 ? `Aparece ${topCategoryInfo.count} veces` : 'Sin categorías detectadas'}
          </p>
        </div>
        <div className={`p-2.5 rounded-xl ${isDark ? "bg-purple-500/10 text-purple-400" : "bg-purple-50 text-purple-600"}`}>
          <Award size={20} />
        </div>
      </div>

    </div>
  );
}
