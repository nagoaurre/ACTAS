/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { FileDown, Upload, Link2, AlertTriangle, CheckCircle2, RotateCw } from 'lucide-react';
import { parseCSV, processRawData, transformGoogleSheetsUrl } from '../lib/sheets';
import { SheetData } from '../types';

interface DataLoaderProps {
  onDataLoaded: (data: SheetData) => void;
  onClear: () => void;
  isDark: boolean;
}

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1YDCjClzPGpicpCpYqve6jWTaUtMMRQDjBrPc0rvmKPo/edit?usp=sharing";

export default function DataLoader({ onDataLoaded, onClear, isDark }: DataLoaderProps) {
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [gid, setGid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loadedSource, setLoadedSource] = useState<'sheet' | 'file' | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatically fetch the default spreadsheet on mount
  useEffect(() => {
    fetchFromSheetUrl(DEFAULT_SHEET_URL, '');
  }, []);

  const fetchFromSheetUrl = async (url: string, sheetGid: string) => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const csvExportUrl = transformGoogleSheetsUrl(url, sheetGid);
      
      // Try Direct Client API Fetch (works for sheets shared as public link)
      const res = await fetch(csvExportUrl);
      if (!res.ok) {
        throw new Error(`Error de red: ${res.status} ${res.statusText}`);
      }
      const text = await res.text();
      
      if (!text || text.trim().startsWith('<!doctype html') || text.trim().startsWith('<html')) {
        throw new Error(
          "La hoja de cálculo no se pudo descargar como CSV. Asegúrate de que el documento de Google Sheets esté configurado como 'Cualquier persona con el enlace puede leer' o esté publicado como página web en formato CSV (Archivo > Compartir > Publicar en la Web)."
        );
      }

      const parsed = parseCSV(text);
      if (parsed.length <= 1) {
        throw new Error("La hoja de cálculo está vacía o solo contiene los encabezados.");
      }

      const processed = processRawData(parsed);
      onDataLoaded(processed);
      setLoadedSource('sheet');
    } catch (err: any) {
      console.error(err);
      setError(
        err.message || 
        "Hubo un problema al conectar con Google Sheets. Comprueba que el enlace es correcto y que tiene permisos públicos para visualizar."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFromSheetUrl(sheetUrl, gid);
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const parseFile = (file: File) => {
    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.length <= 1) {
          throw new Error("El archivo CSV importado está vacío o no tiene registros válidos.");
        }
        const processed = processRawData(parsed);
        onDataLoaded(processed);
        setLoadedSource('file');
      } catch (err: any) {
        setError(err.message || "No se pudo procesar el archivo CSV. Asegúrate de que tiene un formato válido.");
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError("Error al leer el archivo.");
      setLoading(false);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv') || file.type === "text/csv") {
        parseFile(file);
      } else {
        setError("El archivo seleccionado no es un CSV válido (debe terminar en .csv).");
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`rounded-2xl border p-6 transition-all duration-300 ${
      isDark 
        ? "bg-slate-900/60 border-slate-800 text-slate-100" 
        : "bg-white border-slate-100 shadow-xs text-slate-800"
    }`} id="data-loader-container">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Conector de Datos</h2>
          <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Conéctate a una hoja de cálculo pública de Google Sheets o arrastra tu archivo CSV.
          </p>
        </div>
        
        {loadedSource && (
          <div className="flex items-center gap-2 self-start md:self-auto bg-emerald-500/15 text-emerald-500 px-3 py-1.5 rounded-full text-xs font-medium">
            <CheckCircle2 size={14} />
            <span>
              {loadedSource === 'sheet' ? 'Conectado a Google Sheets' : 'CSV Local Importado'}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* URL Controller */}
        <form onSubmit={handleUrlSubmit} className="lg:col-span-7 space-y-4" id="google-sheets-form">
          <div className="space-y-2">
            <label htmlFor="sheet-url" className="block text-xs font-medium uppercase tracking-wider text-slate-400">
              Enlace de Google Sheets o CSV directo
            </label>
            <div className="flex rounded-lg shadow-xs">
              <div className={`flex items-center pl-3 pointer-events-none border-y border-l rounded-l-lg ${
                isDark ? "bg-slate-950 border-slate-800 text-slate-500" : "bg-slate-50 border-slate-200 text-slate-400"
              }`}>
                <Link2 size={18} />
              </div>
              <input
                id="sheet-url"
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className={`flex-1 min-w-0 block w-full px-3 py-2.5 text-sm border-y rounded-r-lg lg:rounded-r-none focus:outline-hidden ${
                  isDark 
                    ? "bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-600 focus:border-indigo-500" 
                    : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500"
                }`}
              />
              <button
                type="submit"
                disabled={loading}
                className="hidden lg:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-r-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? <RotateCw className="animate-spin" size={14} /> : <FileDown size={14} />}
                Cargar Hoja
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="w-full sm:w-auto flex-1 min-w-[140px] space-y-1">
              <label htmlFor="sheet-gid" className="block text-xs text-slate-400 font-medium">
                GID de la pestaña <span className="text-slate-500">(Opcional, por ej: 0)</span>
              </label>
              <input
                id="sheet-gid"
                type="text"
                placeholder="Por ej: 0 o dejar vacío"
                value={gid}
                onChange={(e) => setGid(e.target.value)}
                className={`block w-full px-3 py-1.5 text-xs rounded-md border focus:outline-hidden ${
                  isDark 
                    ? "bg-slate-950 border-slate-800 text-slate-200 focus:border-slate-700" 
                    : "bg-white border-slate-200 text-slate-800 focus:border-slate-300"
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="lg:hidden w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm py-2 px-4 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? <RotateCw className="animate-spin" size={16} /> : <FileDown size={16} />}
              Cargar Hoja de Cálculo
            </button>
          </div>
        </form>

        {/* Drag and Drop Zone */}
        <div className="lg:col-span-5" id="drag-drop-zone-wrapper">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInput}
            accept=".csv"
            className="hidden"
            id="csv-file-input"
          />
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className={`h-full flex flex-col justify-center items-center p-4 border-2 border-dashed rounded-xl cursor-pointer text-center transition-all ${
              dragActive 
                ? "border-indigo-500 bg-indigo-500/10" 
                : isDark 
                  ? "border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/80" 
                  : "border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50"
            }`}
          >
            <Upload className={`mb-2 ${dragActive ? "text-indigo-500 animate-bounce" : "text-slate-400"}`} size={24} />
            <p className="text-xs font-semibold">Importar Archivo CSV Local</p>
            <p className="text-[10px] text-slate-400 mt-1">Arrastra el archivo aquí o haz clic para buscarlo</p>
          </div>
        </div>
      </div>

      {/* Error View */}
      {error && (
        <div className="mt-4 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs leading-relaxed flex items-start gap-2.5" id="loader-error-message">
          <AlertTriangle className="shrink-0 text-rose-500 mt-0.5" size={16} />
          <div className="flex-1">
            <p className="font-semibold mb-1">Error al obtener los datos:</p>
            <p className={isDark ? "text-slate-350" : "text-slate-600"}>{error}</p>
            <div className="mt-2 pl-4 border-l border-rose-300 space-y-1 text-[11px]">
              <p>📌 <strong>¿Cómo compartir tu documento de Google Sheets?</strong></p>
              <p>1. Ve al menú <strong>Compartir</strong> (arriba a la derecha en Sheets).</p>
              <p>2. En el acceso general, cambia a <strong>"Cualquier usuario con el enlace"</strong> como lector.</p>
              <p>3. También puedes ir a <strong>Archivo &gt; Compartir &gt; Publicar en la Web</strong>, seleccionar "Hoja completa" y el formato "Valores separados por comas (.csv)" y pegar el enlace generado aquí.</p>
            </div>
          </div>
        </div>
      )}

      {/* Manual Config Tips */}
      <div className={`mt-4 pt-4 border-t text-[11px] flex flex-wrap justify-between gap-2 ${
        isDark ? "border-slate-800 text-slate-500" : "border-slate-100 text-slate-400"
      }`}>
        <span>💡 El ID de la hoja actual es: <code className="font-mono text-[10px] bg-indigo-500/15 py-0.5 px-1 rounded-sm text-indigo-400">1Y...Po</code></span>
        <span>⚡ Puedes cambiar el enlace para cargar tus propias hojas de cálculo</span>
      </div>
    </div>
  );
}
