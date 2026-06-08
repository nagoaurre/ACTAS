/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sun, Moon, Table, BarChart2, FileSpreadsheet, EyeOff, LayoutGrid, HelpCircle } from 'lucide-react';
import { SheetData, ColumnFilter } from './types';
import { filterRows } from './lib/sheets';
import DataLoader from './components/DataLoader';
import FiltersPanel from './components/FiltersPanel';
import TableView from './components/TableView';
import KPICards from './components/KPICards';
import ChartsView from './components/ChartsView';

export default function App() {
  const [data, setData] = useState<SheetData | null>(null);
  const [filters, setFilters] = useState<ColumnFilter[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'tabla' | 'graficas'>('tabla');
  const [isDark, setIsDark] = useState(true);

  // Synchronously filter data as filters or search text evolves
  const filteredRows = React.useMemo(() => {
    if (!data) return [];
    return filterRows(data.rows, data.columns, filters, globalSearch);
  }, [data, filters, globalSearch]);

  const handleDataLoaded = (loadedData: SheetData) => {
    setData(loadedData);
    setFilters([]);
    setGlobalSearch('');
  };

  const handleClearData = () => {
    setData(null);
    setFilters([]);
    setGlobalSearch('');
  };

  const handleClearFilters = () => {
    setFilters([]);
    setGlobalSearch('');
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col ${
      isDark 
        ? "bg-slate-950 text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200" 
        : "bg-slate-50/50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-800"
    }`}>
      
      {/* 1. Header Bar */}
      <header className={`border-b transition-colors duration-300 sticky top-0 z-40 backdrop-blur-md ${
        isDark ? "bg-slate-950/80 border-slate-900" : "bg-white/80 border-slate-100"
      }`} id="app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-650 text-white p-2 rounded-xl flex items-center justify-center">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">SheetsBoard</h1>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">Core Analytics</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Switcher */}
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isDark 
                  ? "border-slate-900 bg-slate-900/60 hover:bg-slate-900 text-amber-400" 
                  : "border-slate-150 bg-slate-50 hover:bg-slate-100 text-slate-600"
              }`}
              title={isDark ? "Activar modo claro" : "Activar modo oscuro"}
              id="theme-toggle-btn"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Body Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6" id="app-main-content">
        
        {/* Descriptive Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
              Visualizador de Google Sheets
            </h2>
            <p className={`text-xs mt-1 max-w-xl leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Analiza, filtra y genera reportes gráficos dinámicos a partir de cualquier hoja de cálculo compartida públicamente. La aplicación se encarga de inferir tipos de datos y agrupar la información estructuradamente en tiempo real.
            </p>
          </div>
        </div>

        {/* 3. CSV / Google Sheets Data Connector Component */}
        <DataLoader 
          onDataLoaded={handleDataLoaded} 
          onClear={handleClearData} 
          isDark={isDark} 
        />

        {/* 4. Display Content once dataset is loaded */}
        {!data ? (
          <div className={`p-12 text-center rounded-2xl border flex flex-col items-center justify-center ${
            isDark ? "bg-slate-900/10 border-slate-900" : "bg-white border-slate-200"
          }`} id="empty-state-welcome">
            <LayoutGrid className="text-slate-600 animate-pulse mb-3" size={36} />
            <span className="text-xs uppercase font-extrabold text-indigo-400 tracking-wider">Cargando datos iniciales</span>
            <p className="text-sm font-semibold text-slate-400 mt-2">Conectando con la hoja de cálculo de Google Sheets...</p>
            <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
              Estamos descargando y analizando los datos por defecto. Asegúrate de tener conexión de red o arrastra un archivo CSV local para comenzar de forma inmediata.
            </p>
          </div>
        ) : (
          <div className="space-y-6" id="dashboard-content-main">
            
            {/* Filters panel (shared among views) */}
            <FiltersPanel
              columns={data.columns}
              filters={filters}
              onFiltersChange={setFilters}
              globalSearch={globalSearch}
              onGlobalSearchChange={setGlobalSearch}
              onClearFilters={handleClearFilters}
              totalCount={data.rows.length}
              filteredCount={filteredRows.length}
              isDark={isDark}
            />

            {/* KPI statistics summary cards */}
            <KPICards
              columns={data.columns}
              filteredRows={filteredRows}
              totalRows={data.rows}
              isDark={isDark}
            />

            {/* Tabs Navigation Select */}
            <div className="flex border-b border-slate-800/30 gap-1" id="tabular-dashboard-tabs">
              <button
                type="button"
                onClick={() => setActiveTab('tabla')}
                className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold cursor-pointer border-b-2 transition-all ${
                  activeTab === 'tabla'
                    ? "border-indigo-500 text-indigo-400 font-bold"
                    : `border-transparent ${isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"}`
                }`}
              >
                <Table size={14} />
                Tabla de Datos
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('graficas')}
                className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold cursor-pointer border-b-2 transition-all ${
                  activeTab === 'graficas'
                    ? "border-indigo-500 text-indigo-400 font-bold"
                    : `border-transparent ${isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"}`
                }`}
              >
                <BarChart2 size={14} />
                Gráficas / Dashboard
              </button>
            </div>

            {/* Dynamic Views switch */}
            {activeTab === 'tabla' ? (
              <TableView
                columns={data.columns}
                rows={filteredRows}
                isDark={isDark}
              />
            ) : (
              <ChartsView
                columns={data.columns}
                filteredRows={filteredRows}
                isDark={isDark}
              />
            )}

          </div>
        )}
      </main>

      {/* 5. Footer */}
      <footer className={`mt-auto py-8 border-t text-center text-xs ${
        isDark ? "border-slate-900 bg-slate-950/40 text-slate-500" : "border-slate-100 bg-slate-50/20 text-slate-400"
      }`} id="app-footer-notice">
        <p className="max-w-xl mx-auto px-4 leading-relaxed">
          SheetsBoard &bull; Un desarrollo de visualización robusto e inteligente. Conexión de hoja de cálculo mediante exportación segura directa RFC 4180.
        </p>
      </footer>
    </div>
  );
}
