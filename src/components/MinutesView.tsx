/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  FileText, 
  Settings2, 
  UserCheck, 
  Award, 
  Calendar, 
  Layers, 
  Search,
  BookOpen,
  Scale
} from 'lucide-react';
import { ColumnMetadata } from '../types';
import { formatCellValue } from '../lib/sheets';

interface MinutesViewProps {
  columns: ColumnMetadata[];
  rows: Record<string, any>[];
  isDark: boolean;
}

export default function MinutesView({ columns, rows, isDark }: MinutesViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewType, setViewType] = useState<'single' | 'all'>('single');
  const [forceWhitePage, setForceWhitePage] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  // Editable fields for corporate/formal personalization of the "Acta"
  const [actaTitle, setActaTitle] = useState('ACTA OFICIAL DE REGISTRO');
  const [actaSub, setActaSub] = useState('REPORTE CONSOLIDADO DE INFORMACIÓN');
  const [institution, setInstitution] = useState('DIRECCIÓN DE OPERACIONES');
  const [signatory1, setSignatory1] = useState('ADMINISTRADOR DE SISTEMAS');
  const [signatory2, setSignatory2] = useState('RESPONSABLE DE AUDITORÍA');

  // Local state search query to quickly jump to records
  const [searchTerm, setSearchTerm] = useState('');

  // Sift rows based on mini-search in Acta mode
  const filteredRows = React.useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter(row => {
      return columns.some(col => {
        const val = String(row[col.id] || '').toLowerCase();
        return val.includes(term);
      });
    });
  }, [rows, columns, searchTerm]);

  // Handle safe index bounds as data changes
  React.useEffect(() => {
    if (currentIndex >= filteredRows.length) {
      setCurrentIndex(Math.max(0, filteredRows.length - 1));
    }
  }, [filteredRows, currentIndex]);

  const handlePrint = () => {
    window.print();
  };

  const currentItem = filteredRows[currentIndex];

  // Helper to categorize columns for a more elegant vertical layout
  // Rather than just a list of keys, separate them by type or importance
  const mainIdentifiers = columns.filter(c => c.id.includes('id') || c.id.includes('name') || c.id.includes('nombre') || c.id.includes('codigo') || c.id.includes('fecha') || c.type === 'fecha');
  const numericMetrics = columns.filter(c => c.type === 'numero' || c.type === 'porcentaje');
  const otherAttributes = columns.filter(c => !mainIdentifiers.includes(c) && !numericMetrics.includes(c));

  return (
    <div className="space-y-6" id="minutes-view-root">
      
      {/* Print-specific CSS styles */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          #app-header,
          #app-footer-notice,
          #dashboard-content-main > *:not(#minutes-view-root),
          #minutes-view-root > *:not(.printable-document-area),
          #black-mode-toggle-btn,
          #theme-toggle-btn,
          #tabular-dashboard-tabs {
            display: none !important;
          }
          .printable-document-area {
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .printable-page-break {
            page-break-after: always;
          }
        }
      `}</style>

      {/* 1. Controller Bar */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isDark 
          ? "bg-slate-900/60 border-slate-800" 
          : "bg-white border-slate-200"
      }`}>
        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggles */}
          <button
            onClick={() => setViewType('single')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              viewType === 'single'
                ? "bg-indigo-600 text-white"
                : isDark 
                  ? "bg-slate-950 text-slate-400 hover:text-slate-200" 
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            Ver Uno a Uno (Ficha)
          </button>
          <button
            onClick={() => setViewType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              viewType === 'all'
                ? "bg-indigo-600 text-white"
                : isDark 
                  ? "bg-slate-950 text-slate-400 hover:text-slate-200" 
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            Ver Todas las Actas (Continuo)
          </button>
          
          <div className="h-4 w-px bg-slate-850 mx-1 hidden sm:block" />

          {/* Quick Setup Modal Toggle */}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              showConfig 
                ? "bg-indigo-550/20 text-indigo-400 border border-indigo-500/30" 
                : isDark 
                  ? "border border-slate-800 hover:bg-slate-950 text-slate-300" 
                  : "border border-slate-250 hover:bg-slate-50 text-slate-600"
            }`}
          >
            <Settings2 size={13} />
            Configurar Acta
          </button>

          {/* Document Aesthetics Toggle */}
          <label className="flex items-center gap-1.5 ml-1 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={forceWhitePage}
              onChange={(e) => setForceWhitePage(e.target.checked)}
              className="rounded-sm accent-indigo-500"
            />
            <span className={isDark ? "text-slate-400" : "text-slate-600"}>Estilo Papel Impreso (Blanco)</span>
          </label>
        </div>

        {/* Action Elements: Printable & Counter */}
        <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
          {/* Dynamic Row Counter */}
          <div className="text-xs font-mono text-slate-400">
            {filteredRows.length === 0 ? "0 registros" : `Total: ${filteredRows.length} actas`}
          </div>

          <button
            onClick={handlePrint}
            disabled={filteredRows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md active:scale-95 disabled:opacity-40 cursor-pointer"
            title="Abre el diálogo de impresión optimizado de tu navegador"
          >
            <Printer size={13} />
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      {/* 2. Collapsible Customisation Form */}
      {showConfig && (
        <div className={`p-5 rounded-2xl border space-y-4 animate-in fade-in duration-200 ${
          isDark 
            ? "bg-slate-900/40 border-slate-800" 
            : "bg-slate-50 border-slate-200"
        }`}>
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">Ajustes del Documento / Acta</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-400">Título Principal</label>
              <input
                type="text"
                value={actaTitle}
                onChange={(e) => setActaTitle(e.target.value)}
                className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-hidden ${
                  isDark ? "bg-slate-950 border-slate-800 text-slate-200 focus:border-indigo-500" : "bg-white border-slate-250 text-slate-800"
                }`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-400">Subtítulo / Reporte</label>
              <input
                type="text"
                value={actaSub}
                onChange={(e) => setActaSub(e.target.value)}
                className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-hidden ${
                  isDark ? "bg-slate-950 border-slate-800 text-slate-200 focus:border-indigo-500" : "bg-white border-slate-250 text-slate-800"
                }`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-400">Entidad / Organismo Emisor</label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-hidden ${
                  isDark ? "bg-slate-950 border-slate-800 text-slate-200 focus:border-indigo-500" : "bg-white border-slate-250 text-slate-800"
                }`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-400">Firma 1 (Rol/Cargo)</label>
              <input
                type="text"
                value={signatory1}
                onChange={(e) => setSignatory1(e.target.value)}
                className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-hidden ${
                  isDark ? "bg-slate-950 border-slate-800 text-slate-200 focus:border-indigo-500" : "bg-white border-slate-250 text-slate-800"
                }`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-400">Firma 2 (Rol/Cargo)</label>
              <input
                type="text"
                value={signatory2}
                onChange={(e) => setSignatory2(e.target.value)}
                className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-hidden ${
                  isDark ? "bg-slate-950 border-slate-800 text-slate-200 focus:border-indigo-500" : "bg-white border-slate-250 text-slate-800"
                }`}
              />
            </div>
            <div className="space-y-1.5 justify-end flex flex-col">
              <span className="text-[9px] text-slate-500">
                Tip: Las firmas y títulos configurados aparecerán en la parte superior e inferior de cada acta oficial impresa.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Search and Pagination Panel (Only relevant for Single Mode) */}
      {viewType === 'single' && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Local Document Query Jump */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Buscar registro específico..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentIndex(0);
              }}
              className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border focus:outline-hidden ${
                isDark 
                  ? "bg-slate-900/60 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-indigo-500" 
                  : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500"
              }`}
            />
          </div>

          {/* Page browsable controls */}
          {filteredRows.length > 0 && (
            <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto ml-auto">
              <button
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  currentIndex === 0
                    ? "opacity-30 cursor-not-allowed"
                    : isDark 
                      ? "border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-300" 
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
              >
                <ChevronLeft size={16} />
              </button>

              <span className="text-xs font-semibold">
                Acta <span className="font-mono text-indigo-500">{currentIndex + 1}</span> de <span className="font-mono">{filteredRows.length}</span>
              </span>

              <button
                onClick={() => setCurrentIndex(prev => Math.min(filteredRows.length - 1, prev + 1))}
                disabled={currentIndex === filteredRows.length - 1}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  currentIndex === filteredRows.length - 1
                    ? "opacity-30 cursor-not-allowed"
                    : isDark 
                      ? "border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-300" 
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. Document Rendering Stage */}
      {filteredRows.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border flex flex-col items-center justify-center ${
          isDark ? "bg-slate-900/10 border-slate-800" : "bg-white border-slate-200"
        }`}>
          <FileText className="text-slate-500 mb-3 animate-pulse" size={32} />
          <p className="text-sm font-bold">No se encontraron registros para generar el acta</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Modifica tu término de búsqueda o limpia los filtros en el panel principal para reabastecer el visualizador.
          </p>
        </div>
      ) : (
        <div className="printable-document-area space-y-8">
          {viewType === 'single' ? (
            // A. Single Record Mode
            <div className="flex justify-center">
              {renderRecordDocument(currentItem, currentIndex + 1, filteredRows.length)}
            </div>
          ) : (
            // B. Multi Continuous Report Mode
            <div className="space-y-10">
              {filteredRows.map((row, idx) => (
                <div key={idx} className="printable-page-break flex justify-center">
                  {renderRecordDocument(row, idx + 1, filteredRows.length)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  /**
   * Main nested component that models the authentic A4 printable letter "Acta" layout
   */
  function renderRecordDocument(row: Record<string, any>, internalIndex: number, totalCount: number) {
    const documentBg = forceWhitePage 
      ? "bg-white text-slate-950 shadow-xl border-dashed border-2 border-slate-300"
      : isDark 
        ? "bg-slate-900 text-slate-100 border border-slate-800 shadow-xl" 
        : "bg-white text-slate-900 border border-slate-200 shadow-xl";

    const labelColor = forceWhitePage ? "text-slate-500" : "text-slate-400";
    const titleSectionBorder = forceWhitePage ? "border-slate-300" : "border-slate-800";
    const cardSectionBg = forceWhitePage ? "bg-slate-50 border border-slate-200" : isDark ? "bg-slate-950/60 border border-slate-853/30" : "bg-slate-50 border border-slate-100";

    return (
      <div className={`w-full max-w-[800px] p-8 md:p-12 rounded-xs select-text transition-colors duration-200 ${documentBg}`}>
        
        {/* Header Block with Formal Crest Mock / Title */}
        <div className={`border-b-2 pb-6 flex flex-col md:flex-row md:items-start justify-between gap-4 ${titleSectionBorder}`}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Scale size={16} className={forceWhitePage ? "text-slate-700" : "text-indigo-400"} />
              <span className={`text-[10px] font-bold tracking-widest uppercase ${forceWhitePage ? "text-slate-600" : "text-slate-400"}`}>
                {institution}
              </span>
            </div>
            <h3 className="text-lg md:text-xl font-extrabold tracking-tight uppercase leading-none">
              {actaTitle}
            </h3>
            <p className="text-xs font-medium tracking-wide mt-1.5 opacity-80 uppercase text-slate-500">
              {actaSub}
            </p>
          </div>

          <div className="text-left md:text-right font-mono text-[10px] space-y-1 mt-1 shrink-0">
            <div className="flex md:justify-end items-center gap-1">
              <span className="opacity-60">REGISTRO S-ID:</span>
              <span className="font-bold">#AC-{10000 + internalIndex}</span>
            </div>
            <div className="flex md:justify-end items-center gap-1">
              <span className="opacity-60 font-sans uppercase">Expedición:</span>
              <span className="font-bold font-sans">
                {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="text-[9px] opacity-50 font-sans uppercase">
              Orden de fila: {internalIndex} de {totalCount}
            </div>
          </div>
        </div>

        {/* Introduction Clause */}
        <div className="my-6">
          <p className="text-xs leading-relaxed text-justify indent-8">
            En la fecha de emisión señalada, se deja constancia formal y de carácter oficial sobre la recogida de información del registro procesado correspondiente a la base de datos de origen general. A continuación, se detallan sistemáticamente las variables identificadoras estructurales, así como las magnitudes y agregados de datos inferidos para este registro específico.
          </p>
        </div>

        {/* Segment A: Main Identifiers (Title, Id, Dates) */}
        {mainIdentifiers.length > 0 && (
          <div className="space-y-3 mb-6">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
              <Calendar size={12} />
              I. Datos Identificativos y Cronológicos
            </h4>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg ${cardSectionBg}`}>
              {mainIdentifiers.map(col => {
                const val = row[col.id];
                return (
                  <div key={col.id} className="space-y-0.5">
                    <span className={`text-[9px] font-extrabold uppercase ${labelColor}`}>{col.name}</span>
                    <p className="text-xs font-semibold font-mono truncate">{formatCellValue(val, col.type)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Segment B: Numerical Ledger / Quantities */}
        {numericMetrics.length > 0 ? (
          <div className="space-y-3 mb-6">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-teal-600 flex items-center gap-1.5">
              <Award size={12} />
              II. Magnitudes y Cuantificaciones Numéricas
            </h4>
            <div className={`rounded-lg overflow-hidden border ${forceWhitePage ? "border-slate-200" : "border-slate-800"}`}>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={forceWhitePage ? "bg-slate-100/80 border-b border-slate-200" : "bg-slate-950 border-b border-slate-800"}>
                    <th className="px-4 py-2 font-bold uppercase text-[9px]">Concepto / Variable</th>
                    <th className="px-4 py-2 font-bold uppercase text-[9px] text-right">Magnitud Registrada</th>
                    <th className="px-4 py-2 font-bold uppercase text-[9px] text-right">Rango Relativo</th>
                  </tr>
                </thead>
                <tbody>
                  {numericMetrics.map(col => {
                    const cellValStr = row[col.id];
                    const numVal = row[`_parsed_${col.id}`];
                    const min = col.min ?? 0;
                    const max = col.max ?? 100;
                    
                    // Simple progress ratio calculation to highlight numeric position in overall set
                    let ratio = 0;
                    if (numVal !== undefined && max !== min) {
                      ratio = Math.max(0, Math.min(100, ((numVal - min) / (max - min)) * 100));
                    }

                    return (
                      <tr key={col.id} className={`border-b last:border-0 ${forceWhitePage ? "border-slate-150" : "border-slate-850"}`}>
                        <td className="px-4 py-3 font-semibold">{col.name}</td>
                        <td className="px-4 py-3 font-mono text-right font-bold">
                          {formatCellValue(cellValStr, col.type)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2 w-full">
                            <span className="text-[10px] font-mono text-slate-500">{Math.round(ratio)}%</span>
                            <div className={`w-16 h-1.5 rounded-full overflow-hidden ${forceWhitePage ? "bg-slate-200" : "bg-slate-800"}`}>
                              <div 
                                className="bg-indigo-600 h-full rounded-full" 
                                style={{ width: `${ratio}%` }} 
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* Segment C: Qualitative Attributes (Categories, text fields) */}
        {otherAttributes.length > 0 && (
          <div className="space-y-3 mb-8">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
              <BookOpen size={12} />
              III. Características Declarativas y Descriptivas
            </h4>
            <div className={`p-4 rounded-lg space-y-3 ${cardSectionBg}`}>
              {otherAttributes.map(col => {
                const val = row[col.id];
                const textValue = String(val || '').trim();

                return (
                  <div key={col.id} className="grid grid-cols-1 md:grid-cols-3 items-start gap-1 md:gap-4 border-b last:border-0 pb-2 last:pb-0 border-dashed border-slate-200">
                    <span className={`text-[9px] font-extrabold uppercase md:pt-0.5 ${labelColor}`}>{col.name}</span>
                    <div className="md:col-span-2 text-xs md:pl-2">
                      {textValue.length > 50 ? (
                        <p className="text-justify leading-relaxed">{val}</p>
                      ) : (
                        <span className="font-semibold">{formatCellValue(val, col.type)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer closing declaration */}
        <div className="my-8 text-[11px] leading-relaxed text-slate-500 text-justify border-t pt-4">
          Para que surta los efectos oportunos donde corresponda, se expide y certifica la veracidad de la información contenida en este registro, quedando archivada en los sistemas integrados de hojas de cálculo del visualizador corporativo en conformidad con los parámetros reglamentados.
        </div>

        {/* Signature Blocks */}
        <div className="mt-14 pt-8 grid grid-cols-1 sm:grid-cols-2 gap-12 text-center text-xs">
          <div className="space-y-1 flex flex-col items-center">
            <div className={`w-40 border-b ${forceWhitePage ? "border-slate-400" : "border-slate-700"}`} />
            <span className="font-bold tracking-wide text-[10px] uppercase pt-2">{signatory1}</span>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest">Responsable Emisión</span>
          </div>

          <div className="space-y-1 flex flex-col items-center">
            <div className={`w-40 border-b ${forceWhitePage ? "border-slate-400" : "border-slate-700"}`} />
            <span className="font-bold tracking-wide text-[10px] uppercase pt-2">{signatory2}</span>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest">Revisor Certificado</span>
          </div>
        </div>

        {/* Formal Stamp Indicator */}
        <div className="flex justify-end mt-12 opacity-30">
          <div className={`border-2 p-1.5 rounded text-[10px] font-extrabold font-mono uppercase tracking-widest leading-none rotate-6 ${forceWhitePage ? "border-indigo-650 text-indigo-650" : "border-indigo-400 text-indigo-400"}`}>
            SISTEMA DIGITAL<br/>APROBADO
          </div>
        </div>

      </div>
    );
  }
}
