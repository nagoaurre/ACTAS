/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Filter, X, SlidersHorizontal, ChevronDown, ChevronUp, Calendar, Info, Check } from 'lucide-react';
import { ColumnMetadata, ColumnFilter } from '../types';
import { formatCellValue } from '../lib/sheets';

interface FiltersPanelProps {
  columns: ColumnMetadata[];
  filters: ColumnFilter[];
  onFiltersChange: (newFilters: ColumnFilter[]) => void;
  globalSearch: string;
  onGlobalSearchChange: (val: string) => void;
  onClearFilters: () => void;
  totalCount: number;
  filteredCount: number;
  isDark: boolean;
}

export default function FiltersPanel({
  columns,
  filters,
  onFiltersChange,
  globalSearch,
  onGlobalSearchChange,
  onClearFilters,
  totalCount,
  filteredCount,
  isDark
}: FiltersPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeDropdownColId, setActiveDropdownColId] = useState<string | null>(null);

  // Safely find the filter configuration for a column
  const getFilterForColumn = (columnId: string): ColumnFilter | undefined => {
    return filters.find(f => f.id === columnId);
  };

  // Build or update filters
  const updateColumnFilter = (columnId: string, patch: Partial<ColumnFilter>) => {
    const colMeta = columns.find(c => c.id === columnId);
    if (!colMeta) return;

    let existing = filters.find(f => f.id === columnId);
    let updatedFilters: ColumnFilter[];

    if (!existing) {
      const newFilter: ColumnFilter = {
        id: columnId,
        type: colMeta.type,
        ...patch
      };
      updatedFilters = [...filters, newFilter];
    } else {
      updatedFilters = filters.map(f => {
        if (f.id === columnId) {
          const merged = { ...f, ...patch };
          // Trim filters that become empty
          return merged;
        }
        return f;
      });
    }

    // Filter out completely inactive filters to avoid overhead
    updatedFilters = updatedFilters.filter(f => {
      const hasText = f.textSearch && f.textSearch.trim() !== "";
      const hasCats = f.selectedCategories && f.selectedCategories.length > 0;
      const hasNumMin = f.numericRange && f.numericRange.min !== undefined && f.numericRange.min !== null;
      const hasNumMax = f.numericRange && f.numericRange.max !== undefined && f.numericRange.max !== null;
      const hasDateMin = f.dateRange && f.dateRange.min && f.dateRange.min !== "";
      const hasDateMax = f.dateRange && f.dateRange.max && f.dateRange.max !== "";
      
      return hasText || hasCats || hasNumMin || hasNumMax || hasDateMin || hasDateMax;
    });

    onFiltersChange(updatedFilters);
  };

  const removeFilterForColumn = (columnId: string) => {
    onFiltersChange(filters.filter(f => f.id !== columnId));
  };

  // Toggle categories for multi-select column types
  const toggleCategory = (columnId: string, categoryValue: string) => {
    const existingFilter = getFilterForColumn(columnId);
    const selected = existingFilter?.selectedCategories || [];
    
    let updated: string[];
    if (selected.includes(categoryValue)) {
      updated = selected.filter(c => c !== categoryValue);
    } else {
      updated = [...selected, categoryValue];
    }

    updateColumnFilter(columnId, { selectedCategories: updated });
  };

  const hasAnyFilters = filters.length > 0 || globalSearch.trim() !== "";

  return (
    <div className={`rounded-2xl border p-4 transition-all duration-300 ${
      isDark 
        ? "bg-slate-900/60 border-slate-800 text-slate-100" 
        : "bg-white border-slate-100 shadow-xs text-slate-800"
    }`} id="filters-panel-wrapper">
      
      {/* Header and Counters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="text-indigo-500" size={18} />
          <h3 className="font-semibold text-sm tracking-tight">Filtros y Búsqueda</h3>
          
          <div className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            filteredCount < totalCount
              ? "bg-amber-500/15 text-amber-500"
              : isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
          }`}>
            {filteredCount} de {totalCount} filas
          </div>
        </div>

        {/* Global Search and Reset button */}
        <div className="flex flex-wrap items-center gap-2">
          {hasAnyFilters && (
            <button
              onClick={onClearFilters}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 ${
                isDark 
                  ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20" 
                  : "bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-150"
              }`}
              id="clear-all-filters-btn"
            >
              <X size={12} />
              Limpiar Filtros
            </button>
          )}

          <div className="relative shadow-2xs">
            <input
              type="text"
              placeholder="Buscar en toda la tabla..."
              value={globalSearch}
              onChange={(e) => onGlobalSearchChange(e.target.value)}
              className={`w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs rounded-lg border focus:outline-hidden transition-all duration-200 ${
                isDark 
                  ? "bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-indigo-500/50" 
                  : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500/50"
              }`}
              id="global-search-input"
            />
            <Search className="absolute left-2.5 top-2.5 text-slate-450" size={12} />
            {globalSearch && (
              <button 
                onClick={() => onGlobalSearchChange('')} 
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-200"
              >
                <X size={10} />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
              isDark 
                ? "border-slate-800 hover:bg-slate-800/50 text-slate-400" 
                : "border-slate-200 hover:bg-slate-50 text-slate-500"
            }`}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded Grid Filters */}
      {isExpanded && columns.length > 0 && (
        <div className={`mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${
          isDark ? "border-slate-800" : "border-slate-100"
        }`} id="filters-expanded-grid">
          {columns.map((col) => {
            const filterState = getFilterForColumn(col.id);
            const activeFilterCount = 
              (filterState?.textSearch ? 1 : 0) + 
              (filterState?.selectedCategories?.length || 0) + 
              ((filterState?.numericRange?.min !== undefined || filterState?.numericRange?.max !== undefined) ? 1 : 0) +
              ((filterState?.dateRange?.min || filterState?.dateRange?.max) ? 1 : 0);

            return (
              <div 
                key={col.id} 
                className={`relative p-3 rounded-xl border transition-all ${
                  activeFilterCount > 0 
                    ? isDark ? "border-indigo-500/40 bg-indigo-500/5" : "border-indigo-200 bg-indigo-50/20"
                    : isDark ? "border-slate-800 bg-slate-950/20" : "border-slate-100 bg-slate-50/20"
                }`}
              >
                {/* Column Headline */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase ${
                      col.type === 'numero' || col.type === 'porcentaje'
                        ? "bg-blue-500/10 text-blue-400"
                        : col.type === 'fecha'
                          ? "bg-amber-500/10 text-amber-400"
                          : col.type === 'categoria'
                            ? "bg-purple-500/10 text-purple-400"
                            : "bg-emerald-500/10 text-emerald-400"
                    }`}>
                      {col.type === 'numero' ? 'Núm' : col.type === 'porcentaje' ? 'Pct' : col.type === 'fecha' ? 'Fec' : col.type === 'categoria' ? 'Cat' : 'Txt'}
                    </span>
                    <span className="text-xs font-semibold truncate text-slate-500 dark:text-slate-350" title={col.name}>
                      {col.name}
                    </span>
                  </div>

                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => removeFilterForColumn(col.id)}
                      className="text-rose-400 hover:text-rose-500 p-0.5 rounded-xs hover:bg-rose-500/10"
                      title="Quitar filtro de esta columna"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>

                {/* Filter Controls based on datatype */}
                
                {/* 1. Category filter (multi-select dropdown) */}
                {col.type === 'categoria' && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveDropdownColId(activeDropdownColId === col.id ? null : col.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md border text-left cursor-pointer transition-colors ${
                        isDark 
                          ? "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700" 
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <span className="truncate pr-1">
                        {filterState?.selectedCategories && filterState.selectedCategories.length > 0
                          ? `${filterState.selectedCategories.length} seleccionados`
                          : "Todos los valores"}
                      </span>
                      <ChevronDown size={12} className="text-slate-450 ml-1 flex-shrink-0" />
                    </button>

                    {/* Popover list of categories */}
                    {activeDropdownColId === col.id && (
                      <div className={`absolute z-30 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border shadow-lg p-1.5 space-y-0.5 ${
                        isDark ? "bg-slate-950 border-slate-800 text-slate-200" : "bg-white border-slate-200 text-slate-800"
                      }`}>
                        <div className="text-[9px] text-slate-400 font-bold px-1.5 py-0.5 border-b border-slate-800/30 uppercase tracking-widest flex items-center justify-between">
                          <span>Categorías</span>
                          {filterState?.selectedCategories && filterState.selectedCategories.length > 0 && (
                            <button
                              onClick={() => updateColumnFilter(col.id, { selectedCategories: [] })}
                              className="text-rose-500 hover:underline"
                            >
                              Ninguno
                            </button>
                          )}
                        </div>
                        {col.uniqueValues.map((val) => {
                          const isChecked = filterState?.selectedCategories?.includes(val) || false;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => toggleCategory(col.id, val)}
                              className={`w-full flex items-center justify-between px-2 py-1 text-left text-xs rounded-sm cursor-pointer transition-colors ${
                                isChecked 
                                  ? "bg-indigo-500/10 text-indigo-400 font-medium" 
                                  : isDark ? "hover:bg-slate-900 text-slate-400" : "hover:bg-slate-100 text-slate-600"
                              }`}
                            >
                              <span className="truncate">{val || '(Vacío)'}</span>
                              {isChecked && <Check size={12} className="text-indigo-400" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Numeric / percentage filter (min, max inputs) */}
                {(col.type === 'numero' || col.type === 'porcentaje') && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="number"
                        step="any"
                        placeholder={`Mín (${col.min !== undefined ? formatCellValue(col.min, col.type) : '-'})`}
                        value={filterState?.numericRange?.min ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? undefined : Number(e.target.value);
                          updateColumnFilter(col.id, {
                            numericRange: {
                              ...filterState?.numericRange,
                              min: val
                            }
                          });
                        }}
                        className={`w-full px-2 py-1 text-xs rounded-md border focus:outline-hidden ${
                          isDark 
                            ? "bg-slate-950 border-slate-800 text-slate-200 focus:border-slate-700 placeholder-slate-650" 
                            : "bg-white border-slate-200 text-slate-800 focus:border-slate-300 placeholder-slate-400"
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        step="any"
                        placeholder={`Máx (${col.max !== undefined ? formatCellValue(col.max, col.type) : '-'})`}
                        value={filterState?.numericRange?.max ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? undefined : Number(e.target.value);
                          updateColumnFilter(col.id, {
                            numericRange: {
                              ...filterState?.numericRange,
                              max: val
                            }
                          });
                        }}
                        className={`w-full px-2 py-1 text-xs rounded-md border focus:outline-hidden ${
                          isDark 
                            ? "bg-slate-950 border-slate-800 text-slate-200 focus:border-slate-700 placeholder-slate-650" 
                            : "bg-white border-slate-200 text-slate-800 focus:border-slate-300 placeholder-slate-400"
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* 3. Date range filter (min, max inputs) */}
                {col.type === 'fecha' && (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <Calendar size={11} className="text-slate-450 shrink-0" />
                      <input
                        type="date"
                        min={col.minDate}
                        max={col.maxDate}
                        value={filterState?.dateRange?.min ?? ''}
                        onChange={(e) => {
                          updateColumnFilter(col.id, {
                            dateRange: {
                              ...filterState?.dateRange,
                              min: e.target.value
                            }
                          });
                        }}
                        className={`w-full px-1.5 py-0.5 text-[10px] rounded-md border focus:outline-hidden ${
                          isDark 
                            ? "bg-slate-950 border-slate-800 text-slate-200 focus:border-slate-700" 
                            : "bg-white border-slate-200 text-slate-800 focus:border-slate-300"
                        }`}
                      />
                    </div>
                    <div className="text-[9px] text-slate-450 text-center">a</div>
                    <div className="flex items-center gap-1">
                      <Calendar size={11} className="text-slate-450 shrink-0" />
                      <input
                        type="date"
                        min={col.minDate}
                        max={col.maxDate}
                        value={filterState?.dateRange?.max ?? ''}
                        onChange={(e) => {
                          updateColumnFilter(col.id, {
                            dateRange: {
                              ...filterState?.dateRange,
                              max: e.target.value
                            }
                          });
                        }}
                        className={`w-full px-1.5 py-0.5 text-[10px] rounded-md border focus:outline-hidden ${
                          isDark 
                            ? "bg-slate-950 border-slate-800 text-slate-200 focus:border-slate-700" 
                            : "bg-white border-slate-200 text-slate-800 focus:border-slate-300"
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* 4. Text/Fallback filter */}
                {col.type === 'texto' && (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Contiene texto..."
                      value={filterState?.textSearch ?? ''}
                      onChange={(e) => {
                        updateColumnFilter(col.id, { textSearch: e.target.value });
                      }}
                      className={`w-full px-2.5 py-1.5 text-xs rounded-md border focus:outline-hidden ${
                        isDark 
                          ? "bg-slate-950 border-slate-800 text-slate-200 focus:border-slate-700" 
                          : "bg-white border-slate-200 text-slate-800 focus:border-slate-300"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* active filters badges list */}
      {filters.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] uppercase font-bold text-slate-400">Activos:</span>
          {filters.map((f) => {
            const col = columns.find(c => c.id === f.id);
            if (!col) return null;
            return (
              <span
                key={f.id}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border text-indigo-400 ${
                  isDark ? "bg-indigo-500/10 border-indigo-500/25 text-indigo-300" : "bg-indigo-50 border-indigo-200 text-indigo-650"
                }`}
              >
                <span>{col.name}</span>
                <button
                  onClick={() => removeFilterForColumn(f.id)}
                  className="hover:bg-indigo-500/20 rounded-full p-0.5 text-indigo-400 hover:text-indigo-650"
                >
                  <X size={8} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Popovers backdrop close layer */}
      {activeDropdownColId && (
        <div 
          className="fixed inset-0 z-20 bg-transparent" 
          onClick={() => setActiveDropdownColId(null)} 
        />
      )}
    </div>
  );
}
