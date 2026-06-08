/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon, HelpCircle, AlignLeft, RefreshCw, Sparkles } from 'lucide-react';
import { ColumnMetadata, ChartType, MetricType, ChartConfig } from '../types';
import { computeAggregate, formatCellValue, parseNumber } from '../lib/sheets';

interface ChartsViewProps {
  columns: ColumnMetadata[];
  filteredRows: Record<string, any>[];
  isDark: boolean;
}

const RED_COLORS = ['#6366f1', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e', '#a855f7', '#06b6d4'];

export default function ChartsView({ columns, filteredRows, isDark }: ChartsViewProps) {
  const [config, setConfig] = useState<ChartConfig>({
    xAxisColumnId: '',
    yAxisColumnId: '',
    chartType: 'bar',
    metric: 'suma'
  });

  // Automatically configure best columns on mount or columns change
  useEffect(() => {
    if (columns.length > 0) {
      // Find suitable X axis: Prefer 'categoria' or 'fecha', else text, else first
      const xCandidate = 
        columns.find(c => c.type === 'categoria') || 
        columns.find(c => c.type === 'fecha') || 
        columns.find(c => c.type === 'texto') || 
        columns[0];

      // Find suitable Y axis: Prefer 'numero' or 'porcentaje', else first
      const yCandidate = 
        columns.find(c => c.type === 'numero') || 
        columns.find(c => c.type === 'porcentaje') || 
        columns[0];

      setConfig({
        xAxisColumnId: xCandidate ? xCandidate.id : '',
        yAxisColumnId: yCandidate ? yCandidate.id : '',
        chartType: 'bar',
        metric: yCandidate && yCandidate.type === 'categoria' ? 'conteo' : 'suma'
      });
    }
  }, [columns]);

  // Aggregate data based on current chart configuration
  const chartData = useMemo(() => {
    const { xAxisColumnId, yAxisColumnId, metric } = config;
    if (!xAxisColumnId || filteredRows.length === 0) return [];

    const xCol = columns.find(c => c.id === xAxisColumnId);
    if (!xCol) return [];

    // Grouping rows by X axis values
    const groups: Record<string, Record<string, any>[]> = {};
    filteredRows.forEach((row) => {
      const xValStr = String(row[xAxisColumnId] || '').trim();
      const xKey = xValStr === '' ? '(Vacío)' : xValStr;

      if (!groups[xKey]) {
        groups[xKey] = [];
      }
      groups[xKey].push(row);
    });

    // For each unique X key, calculate aggregated Y metric
    let dataPoints = Object.entries(groups).map(([xKey, rowsInGroup]) => {
      let aggregatedYValue = 0;

      if (metric === 'conteo') {
        aggregatedYValue = rowsInGroup.length;
      } else if (yAxisColumnId) {
        // Collect numeric parameters
        const numericValues = rowsInGroup
          .map(r => r[`_parsed_${yAxisColumnId}`] ?? parseNumber(String(r[yAxisColumnId])))
          .filter((v): v is number => v !== null && v !== undefined);

        if (numericValues.length > 0) {
          switch (metric) {
            case 'suma':
              aggregatedYValue = numericValues.reduce((sum, v) => sum + v, 0);
              break;
            case 'promedio':
              aggregatedYValue = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;
              break;
            case 'min':
              aggregatedYValue = Math.min(...numericValues);
              break;
            case 'max':
              aggregatedYValue = Math.max(...numericValues);
              break;
            default:
              aggregatedYValue = 0;
          }
        }
      }

      return {
        name: xKey,
        value: aggregatedYValue
      };
    });

    // If sorting by dates, let's sort chronologically if X is a date
    if (xCol.type === 'fecha') {
      dataPoints.sort((a, b) => {
        const dateA = new Date(a.name).getTime();
        const dateB = new Date(b.name).getTime();
        if (!isNaN(dateA) && !isNaN(dateB)) {
          return dateA - dateB;
        }
        return a.name.localeCompare(b.name);
      });
    } else {
      // Sort in descending order of value for clean ranking charts, except if there's a reason
      dataPoints.sort((a, b) => b.value - a.value);
    }

    // Pie chart grouping optimization: Limit to top 8 and label others
    if (config.chartType === 'pie' && dataPoints.length > 8) {
      const topPoints = dataPoints.slice(0, 7);
      const restPoints = dataPoints.slice(7);
      const otherValue = restPoints.reduce((sum, p) => sum + p.value, 0);
      
      return [
        ...topPoints,
        { name: 'Otros', value: otherValue }
      ];
    }

    return dataPoints;
  }, [config, filteredRows, columns]);

  // Determine Y column details
  const yColumnMeta = useMemo(() => {
    return columns.find(c => c.id === config.yAxisColumnId);
  }, [columns, config.yAxisColumnId]);

  const xColumnMeta = useMemo(() => {
    return columns.find(c => c.id === config.xAxisColumnId);
  }, [columns, config.xAxisColumnId]);

  const handleConfigChange = (patch: Partial<ChartConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...patch };
      // If client changes Y-axis column, we might want to auto-toggle sum or count
      const col = columns.find(c => c.id === updated.yAxisColumnId);
      if (col && col.type !== 'numero' && col.type !== 'porcentaje' && updated.metric !== 'conteo') {
        updated.metric = 'conteo';
      }
      return updated;
    });
  };

  const currentThemeHex = isDark ? "#1e293b" : "#f1f5f9";
  const labelColor = isDark ? "#94a3b8" : "#475569";
  const gridLineColor = isDark ? "rgba(51, 65, 85, 0.4)" : "rgba(226, 232, 240, 0.8)";

  // Format Y-axis tick values comfortably
  const formatYAxisTick = (val: number) => {
    if (config.metric === 'conteo') return val.toLocaleString('es-ES');
    if (yColumnMeta) {
      if (yColumnMeta.type === 'porcentaje') return (val * 100).toFixed(0) + '%';
      return val.toLocaleString('es-ES', { maximumSignificantDigits: 3 });
    }
    return val.toString();
  };

  // Human descriptive text for current settings
  const getChartDescription = () => {
    if (!xColumnMeta) return '';
    const metricStr = 
      config.metric === 'suma' ? 'Suma de' : 
      config.metric === 'promedio' ? 'Promedio de' : 
      config.metric === 'conteo' ? 'Conteo de registros por' : 
      config.metric === 'min' ? 'Valor mínimo de' : 'Valor máximo de';

    const yStr = config.metric === 'conteo' ? '' : ` ${yColumnMeta?.name || ''}`;
    return `${metricStr}${yStr} agrupado por ${xColumnMeta.name}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="charts-view-block">
      
      {/* 1. Selector Configuration side bar */}
      <div className={`lg:col-span-4 rounded-2xl border p-5 transition-all duration-300 flex flex-col justify-between ${
        isDark 
          ? "bg-slate-900/60 border-slate-800 text-slate-100" 
          : "bg-white border-slate-100 shadow-xs text-slate-800"
      }`}>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-sm tracking-tight flex items-center gap-1.5">
              <RefreshCw size={14} className="text-indigo-500 animate-pulse" />
              Configurador de Gráfico
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Elige dimensiones y métricas para analizar visualmente.</p>
          </div>

          {/* Form groups */}
          <div className="space-y-3 pt-2">
            
            {/* Chart Type Selection */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">Tipo de Gráfica</label>
              <div className="grid grid-cols-5 gap-1">
                {(['bar', 'line', 'pie', 'hbar', 'area'] as ChartType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleConfigChange({ chartType: type })}
                    className={`p-2 rounded-lg border text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                      config.chartType === type
                        ? isDark 
                          ? "border-indigo-500 bg-indigo-500/15 text-indigo-400" 
                          : "border-indigo-650 bg-indigo-50 text-indigo-700"
                        : isDark
                          ? "border-slate-800 hover:bg-slate-950 text-slate-400"
                          : "border-slate-200 hover:bg-slate-50 text-slate-550"
                    }`}
                    title={`Gráfico de ${type}`}
                  >
                    {type === 'bar' && <BarChart3 size={15} />}
                    {type === 'line' && <LineIcon size={15} />}
                    {type === 'pie' && <PieIcon size={15} />}
                    {type === 'hbar' && <AlignLeft size={15} />}
                    {type === 'area' && <HelpCircle size={15} />}
                    <span className="text-[8px] mt-1 font-semibold capitalize">
                      {type === 'bar' ? 'Barra' : type === 'line' ? 'Línea' : type === 'pie' ? 'Tarta' : type === 'hbar' ? 'Horiz' : 'Área'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* X-axis selection */}
            <div className="space-y-1">
              <label htmlFor="select-xaxis" className="block text-xs font-medium text-slate-400">Columna Eje X <span className="text-slate-500">(Agrupación)</span></label>
              <select
                id="select-xaxis"
                value={config.xAxisColumnId}
                onChange={(e) => handleConfigChange({ xAxisColumnId: e.target.value })}
                className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-hidden cursor-pointer ${
                  isDark 
                    ? "bg-slate-950 border-slate-800 text-slate-250 focus:border-indigo-500" 
                    : "bg-white border-slate-200 text-slate-700 focus:border-indigo-500"
                }`}
              >
                {columns.map(col => (
                  <option key={col.id} value={col.id}>
                    {col.name} ({col.type === 'categoria' ? 'Categoría' : col.type === 'fecha' ? 'Fecha' : 'Texto'})
                  </option>
                ))}
              </select>
            </div>

            {/* Y-axis selection */}
            {config.metric !== 'conteo' && (
              <div className="space-y-1">
                <label htmlFor="select-yaxis" className="block text-xs font-medium text-slate-400">Columna Eje Y <span className="text-slate-500">(Valor numérico)</span></label>
                <select
                  id="select-yaxis"
                  value={config.yAxisColumnId}
                  onChange={(e) => handleConfigChange({ yAxisColumnId: e.target.value })}
                  className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-hidden cursor-pointer ${
                    isDark 
                      ? "bg-slate-950 border-slate-800 text-slate-250 focus:border-indigo-500" 
                      : "bg-white border-slate-200 text-slate-700 focus:border-indigo-500"
                  }`}
                >
                  {columns
                    .filter(c => c.type === 'numero' || c.type === 'porcentaje')
                    .map(col => (
                      <option key={col.id} value={col.id}>
                        {col.name} ({col.type === 'porcentaje' ? 'Porcentaje' : 'Número'})
                      </option>
                    ))}
                  
                  {/* Keep fallback if no numeric columns */}
                  {columns.filter(c => c.type === 'numero' || c.type === 'porcentaje').length === 0 && (
                    columns.map(col => (
                      <option key={col.id} value={col.id}>{col.name}</option>
                    ))
                  )}
                </select>
              </div>
            )}

            {/* Metric / Aggregation */}
            <div className="space-y-1">
              <label htmlFor="select-metric" className="block text-xs font-medium text-slate-400">Métrica de Agregación</label>
              <select
                id="select-metric"
                value={config.metric}
                onChange={(e) => handleConfigChange({ metric: e.target.value as MetricType })}
                className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-hidden cursor-pointer ${
                  isDark 
                    ? "bg-slate-950 border-slate-800 text-slate-200 focus:border-indigo-500" 
                    : "bg-white border-slate-200 text-slate-700 focus:border-indigo-500"
                }`}
              >
                <option value="suma">Suma de valores</option>
                <option value="promedio">Promedio de valores</option>
                <option value="conteo">Conteo de frecuencias (apariciones)</option>
                <option value="min">Valor mínimo</option>
                <option value="max">Valor máximo</option>
              </select>
            </div>

          </div>
        </div>

        {/* Dynamic tips footer */}
        <div className={`mt-6 p-3 rounded-lg border border-dashed text-[10px] space-y-1 leading-relaxed ${
          isDark ? "border-slate-850 bg-slate-950/20 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-500"
        }`}>
          <div className="font-semibold text-slate-350 flex items-center gap-1">
            <Sparkles size={11} className="text-amber-400 shrink-0" />
            Sugerencia inteligente
          </div>
          <p>
            {config.chartType === 'pie' 
              ? "Las tartas se ven mejor con pocas categorías. Hemos agrupado el resto automáticamente bajo 'Otros' para facilitar tu lectura." 
              : "Las gráficas se actualizan en tiempo de ejecución de acuerdo a los filtros de tu tabla superiores de forma compartida."}
          </p>
        </div>
      </div>

      {/* 2. Main Chart Display canvas */}
      <div className={`lg:col-span-8 rounded-2xl border p-5 transition-all duration-300 flex flex-col justify-between min-h-[460px] ${
        isDark 
          ? "bg-slate-900/60 border-slate-800 text-slate-100" 
          : "bg-white border-slate-100 shadow-xs text-slate-800"
      }`} id="chart-display-container">
        
        {/* Info header */}
        <div className="mb-4">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Dashboard Visual</span>
          <h4 className="text-base font-semibold leading-snug mt-0.5">{getChartDescription()}</h4>
          <p className="text-[11px] text-slate-400 mt-1">
            Calculado sobre {filteredRows.length} registros válidos según filtros aplicados.
          </p>
        </div>

        {/* Main interactive Recharts rendering */}
        <div className="flex-1 w-full flex items-center justify-center p-1.5" id="chart-panel">
          {chartData.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="text-slate-600 animate-bounce duration-2500 mx-auto mb-2" size={32} />
              <p className="text-sm font-semibold">No es posible generar gráfico</p>
              <p className="text-xs text-slate-400 mt-1">Asegúrate de tener registros cargados y de que las columnas tengan datos válidos.</p>
            </div>
          ) : (
            <div className="w-full h-[320px] md:h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                {config.chartType === 'bar' ? (
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridLineColor} vertical={false} />
                    <XAxis dataKey="name" stroke={labelColor} fontSize={10} tickLine={false} />
                    <YAxis stroke={labelColor} fontSize={10} tickLine={false} tickFormatter={formatYAxisTick} />
                    <Tooltip 
                      contentStyle={{ borderColor: 'rgba(99, 102, 241, 0.2)', backgroundColor: isDark ? '#020617' : '#ffffff' }}
                      labelStyle={{ fontWeight: 'bold', fontSize: '11px', color: isDark ? '#fff' : '#000' }}
                      itemStyle={{ color: '#6366f1', fontSize: '11px' }}
                      formatter={(val: number) => [formatCellValue(val, config.metric === 'conteo' ? 'numero' : (yColumnMeta?.type || 'numero')), 'Valor']}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="value" name={yColumnMeta?.name || 'Métrica'} fill="#6366f1" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={RED_COLORS[index % RED_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : config.chartType === 'line' ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridLineColor} />
                    <XAxis dataKey="name" stroke={labelColor} fontSize={10} tickLine={false} />
                    <YAxis stroke={labelColor} fontSize={10} tickLine={false} tickFormatter={formatYAxisTick} />
                    <Tooltip 
                      contentStyle={{ borderColor: 'rgba(99, 102, 241, 0.2)', backgroundColor: isDark ? '#020617' : '#ffffff' }}
                      labelStyle={{ fontWeight: 'bold', fontSize: '11px', color: isDark ? '#fff' : '#000' }}
                      itemStyle={{ color: '#6366f1', fontSize: '11px' }}
                      formatter={(val: number) => [formatCellValue(val, config.metric === 'conteo' ? 'numero' : (yColumnMeta?.type || 'numero')), 'Valor']}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" dataKey="value" name={yColumnMeta?.name || 'Métrica'} stroke="#6366f1" strokeWidth={2.5} activeDot={{ r: 6 }} />
                  </LineChart>
                ) : config.chartType === 'area' ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridLineColor} />
                    <XAxis dataKey="name" stroke={labelColor} fontSize={10} tickLine={false} />
                    <YAxis stroke={labelColor} fontSize={10} tickLine={false} tickFormatter={formatYAxisTick} />
                    <Tooltip 
                      contentStyle={{ borderColor: 'rgba(99, 102, 241, 0.2)', backgroundColor: isDark ? '#020617' : '#ffffff' }}
                      labelStyle={{ fontWeight: 'bold', fontSize: '11px', color: isDark ? '#fff' : '#000' }}
                      itemStyle={{ color: '#6366f1', fontSize: '11px' }}
                      formatter={(val: number) => [formatCellValue(val, config.metric === 'conteo' ? 'numero' : (yColumnMeta?.type || 'numero')), 'Valor']}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Area type="monotone" dataKey="value" name={yColumnMeta?.name || 'Métrica'} stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorAreaGrad)" />
                  </AreaChart>
                ) : config.chartType === 'hbar' ? (
                  <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridLineColor} horizontal={false} />
                    <XAxis type="number" stroke={labelColor} fontSize={10} tickLine={false} tickFormatter={formatYAxisTick} />
                    <YAxis dataKey="name" type="category" stroke={labelColor} fontSize={9} tickLine={false} width={80} />
                    <Tooltip 
                      contentStyle={{ borderColor: 'rgba(99, 102, 241, 0.2)', backgroundColor: isDark ? '#020617' : '#ffffff' }}
                      labelStyle={{ fontWeight: 'bold', fontSize: '11px', color: isDark ? '#fff' : '#000' }}
                      itemStyle={{ color: '#6366f1', fontSize: '11px' }}
                      formatter={(val: number) => [formatCellValue(val, config.metric === 'conteo' ? 'numero' : (yColumnMeta?.type || 'numero')), 'Valor']}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="value" name={yColumnMeta?.name || 'Métrica'} fill="#10b981" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={RED_COLORS[index % RED_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <PieChart>
                    <Tooltip 
                      contentStyle={{ borderColor: 'rgba(99, 102, 241, 0.2)', backgroundColor: isDark ? '#020617' : '#ffffff' }}
                      itemStyle={{ color: '#6366f1', fontSize: '11px' }}
                      formatter={(val: number) => [formatCellValue(val, config.metric === 'conteo' ? 'numero' : (yColumnMeta?.type || 'numero')), 'Valor']}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="45%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={true}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={RED_COLORS[index % RED_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
