/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Eye, ChevronLeft, ChevronRight, Download, SlidersHorizontal, Settings } from 'lucide-react';
import { ColumnMetadata } from '../types';
import { formatCellValue, downloadCSV } from '../lib/sheets';

interface TableViewProps {
  columns: ColumnMetadata[];
  rows: Record<string, any>[];
  isDark: boolean;
}

type SortOrder = 'asc' | 'desc' | null;

interface SortState {
  columnId: string | null;
  direction: SortOrder;
}

export default function TableView({ columns, rows, isDark }: TableViewProps) {
  // Column visibility state
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>([]);
  const [showColSettings, setShowColSettings] = useState(false);

  // Sorting state
  const [sort, setSort] = useState<SortState>({ columnId: null, direction: null });

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset columns visibility when new columns are loaded
  useEffect(() => {
    if (columns.length > 0) {
      setVisibleColumnIds(columns.map(c => c.id));
    }
  }, [columns]);

  // Reset page when rows or page size changes
  useEffect(() => {
    setPage(1);
  }, [rows, pageSize]);

  const handleSort = (columnId: string) => {
    setSort(prev => {
      if (prev.columnId !== columnId) {
        return { columnId, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { columnId, direction: 'desc' };
      }
      return { columnId: null, direction: null };
    });
  };

  // 1. Sort logic
  const sortedRows = React.useMemo(() => {
    if (!sort.columnId || !sort.direction) return rows;

    const colMeta = columns.find(c => c.id === sort.columnId);
    if (!colMeta) return rows;

    return [...rows].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (colMeta.type === 'numero' || colMeta.type === 'porcentaje' || colMeta.type === 'fecha') {
        valA = a[`_parsed_${colMeta.id}`];
        valB = b[`_parsed_${colMeta.id}`];
      } else {
        valA = String(a[colMeta.id] || '').trim();
        valB = String(b[colMeta.id] || '').trim();
      }

      // Handle empty and undefined gracefully
      if (valA === undefined || valA === null) return sort.direction === 'asc' ? 1 : -1;
      if (valB === undefined || valB === null) return sort.direction === 'asc' ? -1 : 1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sort.direction === 'asc' ? valA - valB : valB - valA;
      }

      // Date sorting
      if (colMeta.type === 'fecha') {
        const timeA = new Date(valA).getTime();
        const timeB = new Date(valB).getTime();
        return sort.direction === 'asc' ? timeA - timeB : timeB - timeA;
      }

      // Default locale string comparison
      return sort.direction === 'asc'
        ? String(valA).localeCompare(String(valB), 'es', { sensitivity: 'base', numeric: true })
        : String(valB).localeCompare(String(valA), 'es', { sensitivity: 'base', numeric: true });
    });
  }, [rows, columns, sort]);

  // 2. Pagination calculation
  const totalRows = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  
  // Safe bounds check
  const currentPage = Math.min(page, totalPages);
  
  const startIdx = (currentPage - 1) * pageSize;
  const paginatedRows = sortedRows.slice(startIdx, startIdx + pageSize);

  const toggleColumnVisibility = (colId: string) => {
    setVisibleColumnIds(prev => {
      if (prev.includes(colId)) {
        // Prevent hiding all columns
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== colId);
      } else {
        return [...prev, colId];
      }
    });
  };

  const handleExportCSV = () => {
    if (rows.length === 0) return;
    const csvContent = downloadCSV(rows, columns, visibleColumnIds);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' }); // UTF-8 BOM
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `google_sheets_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`rounded-2xl border p-4 transition-all duration-300 ${
      isDark 
        ? "bg-slate-900/60 border-slate-800 text-slate-100" 
        : "bg-white border-slate-100 shadow-xs text-slate-800"
    }`} id="table-view-section">
      
      {/* Table Toolbar controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4" id="table-toolbar">
        <div>
          <h3 className="font-semibold text-base leading-tight">Registros Obtenidos</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Mostrando {Math.min(totalRows, startIdx + 1)}-{Math.min(totalRows, startIdx + pageSize)} de {totalRows}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Columns Visibility Selector */}
          <div className="relative">
            <button
              onClick={() => setShowColSettings(!showColSettings)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${
                isDark 
                  ? "border-slate-800 bg-slate-950/40 text-slate-350 hover:bg-slate-950" 
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
              id="columns-visibility-toggle-btn"
            >
              <Eye size={12} />
              Columnas ({visibleColumnIds.length}/{columns.length})
            </button>

            {showColSettings && (
              <>
                <div 
                  className="fixed inset-0 z-25 bg-transparent" 
                  onClick={() => setShowColSettings(false)} 
                />
                <div className={`absolute right-0 mt-1.5 z-30 w-56 rounded-lg border shadow-lg p-2 space-y-1 ${
                  isDark ? "bg-slate-950 border-slate-800 text-slate-200" : "bg-white border-slate-200 text-slate-800"
                }`}>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold px-2 py-1 border-b border-slate-800/30">
                    Mostrar/ocultar columnas
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1 space-y-0.5">
                    {columns.map((col) => {
                      const isVisible = visibleColumnIds.includes(col.id);
                      return (
                        <button
                          key={col.id}
                          onClick={() => toggleColumnVisibility(col.id)}
                          className={`w-full flex items-center gap-2.5 px-2 py-1.5 text-left text-xs rounded-md transition-colors cursor-pointer ${
                            isVisible 
                              ? isDark ? "hover:bg-slate-900 text-slate-250" : "hover:bg-slate-100 text-slate-800" 
                              : "text-slate-500 hover:bg-slate-900/40"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isVisible}
                            readOnly
                            className="rounded-sm accent-indigo-600 dark:accent-indigo-400 cursor-pointer pointer-events-none"
                          />
                          <span className="truncate">{col.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* CSV Export Button */}
          <button
            onClick={handleExportCSV}
            disabled={rows.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              isDark 
                ? "bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-indigo-950/40" 
                : "bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-indigo-300/40"
            }`}
            id="export-csv-btn"
          >
            <Download size={12} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Main Responsive Table */}
      <div className={`overflow-x-auto rounded-xl border relative ${
        isDark ? "border-slate-800 bg-slate-950/20" : "border-slate-100 bg-slate-50/10"
      }`} id="table-scroll-container">
        
        {paginatedRows.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center justify-center">
            <Settings className="text-indigo-500 animate-spin duration-3000 mb-2" size={32} />
            <p className="text-sm font-semibold">Sin resultados</p>
            <p className="text-xs text-slate-400 mt-1">Modifica o limpia los filtros para visualizar registros.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className={`border-b ${
                isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-100 bg-slate-50/70"
              }`}>
                {columns
                  .filter(col => visibleColumnIds.includes(col.id))
                  .map((col) => {
                    const isSorted = sort.columnId === col.id;
                    const isAsc = isSorted && sort.direction === 'asc';
                    const isDesc = isSorted && sort.direction === 'desc';

                    return (
                      <th
                        key={col.id}
                        onClick={() => handleSort(col.id)}
                        className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 cursor-pointer transition-colors whitespace-nowrap select-none sticky top-0`}
                      >
                        <div className="flex items-center gap-1.5 justify-between">
                          <span>{col.name}</span>
                          <span className={`shrink-0 ${isSorted ? "text-indigo-400" : "text-slate-600"}`}>
                            {isAsc ? <ArrowUp size={11} /> : isDesc ? <ArrowDown size={11} /> : <ArrowUpDown size={11} />}
                          </span>
                        </div>
                      </th>
                    );
                  })}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? "divide-slate-800/80" : "divide-slate-100"}`}>
              {paginatedRows.map((row, rIdx) => {
                return (
                  <tr 
                    key={rIdx} 
                    className={`transition-colors ${
                      isDark 
                        ? "hover:bg-slate-900/30 text-slate-300" 
                        : "hover:bg-slate-50/60 text-slate-700"
                    }`}
                  >
                    {columns
                      .filter(col => visibleColumnIds.includes(col.id))
                      .map((col) => {
                        const cellRaw = row[col.id];
                        const displayVal = formatCellValue(cellRaw, col.type);
                        
                        return (
                          <td 
                            key={col.id}
                            className={`px-4 py-2.5 text-xs truncate max-w-[240px]`}
                            title={String(cellRaw || '')}
                          >
                            <span className={
                              col.type === 'numero' || col.type === 'porcentaje'
                                ? "font-mono font-medium text-slate-400 dark:text-slate-350"
                                : col.type === 'fecha'
                                  ? "font-mono text-amber-600 dark:text-amber-400/90"
                                  : ""
                            }>
                              {displayVal}
                            </span>
                          </td>
                        );
                      })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination control footer */}
      {totalRows > 0 && (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 pt-4 border-t ${
          isDark ? "border-slate-800" : "border-slate-100"
        }`} id="table-pagination-footer">
          {/* Rows per page selector */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-slate-400">Filas por página:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className={`px-2 py-1 text-xs rounded-md border cursor-pointer focus:outline-hidden ${
                isDark 
                  ? "bg-slate-950 border-slate-800 text-slate-300 focus:border-slate-700" 
                  : "bg-white border-slate-200 text-slate-700 focus:border-slate-300"
              }`}
            >
              {[5, 10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          {/* Simple previous/next buttons */}
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <span className="text-xs text-slate-400">
              Página <strong className="font-semibold text-slate-300">{currentPage}</strong> de <strong className="font-semibold text-slate-300">{totalPages}</strong>
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  isDark 
                    ? "border-slate-800 hover:bg-slate-800 text-slate-350" 
                    : "border-slate-200 hover:bg-slate-100 text-slate-600"
                }`}
                title="Página anterior"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  isDark 
                    ? "border-slate-800 hover:bg-slate-800 text-slate-350" 
                    : "border-slate-200 hover:bg-slate-100 text-slate-600"
                }`}
                title="Página siguiente"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
