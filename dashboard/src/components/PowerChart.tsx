/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Activity, Zap, Radio, ChevronRight } from 'lucide-react';
import { mockPowerData } from '../data';

export default function PowerChart() {
  const [activeTab, setActiveTab] = useState<'power' | 'network'>('power');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredPos, setHoveredPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(500);
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 45 };

  // Track container width for true responsive resizing
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setWidth(entry.contentRect.width || 500);
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Network data simulation
  const networkData = [
    { time: '00:00', latency: 12, signal: -45 },
    { time: '04:00', latency: 15, signal: -48 },
    { time: '08:00', latency: 22, signal: -52 },
    { time: '12:00', latency: 14, signal: -47 },
    { time: '16:00', latency: 19, signal: -50 },
    { time: '20:00', latency: 25, signal: -56 },
    { time: '24:00', latency: 16, signal: -48 }
  ];

  const data = activeTab === 'power' ? mockPowerData : networkData;
  const getValue = (item: any) => activeTab === 'power' ? item.usage : item.latency;
  const getLabel = (item: any) => activeTab === 'power' ? `${item.usage} W` : `${item.latency} ms`;

  const values = data.map(getValue);
  const maxValue = Math.max(...values, activeTab === 'power' ? 800 : 35);
  const minValue = 0;

  // Compute SVG Points
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const points = data.map((item, index) => {
    const x = padding.left + (index / (data.length - 1)) * chartWidth;
    const value = getValue(item);
    const y = padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;
    return { x, y, item, index };
  });

  const pathD = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') 
    : '';

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
    : '';

  // Handle Mouse Hover
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    // Find closest point
    let closestIndex = 0;
    let minDiff = Infinity;
    points.forEach((p, idx) => {
      const diff = Math.abs(p.x - mouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = idx;
      }
    });

    setHoveredIndex(closestIndex);
    setHoveredPos({ x: points[closestIndex].x, y: points[closestIndex].y });
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setHoveredPos(null);
  };

  // Metrics
  const avgUsage = Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
  const totalKwh = activeTab === 'power' ? (avgUsage * 24 / 1000).toFixed(2) : null;

  return (
    <div id="4l-power-chart-container" ref={containerRef} className="bg-brand-card border border-brand-border rounded-3xl p-5 shadow-xl transition-all duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-brand-green animate-ping" />
            <h3 className="font-display font-semibold text-white tracking-wide text-sm uppercase">Telemetry Visualizer</h3>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Real-time home hardware analytics & diagnostics</p>
        </div>

        <div className="flex items-center bg-brand-dark p-1 rounded-lg border border-brand-border text-xs">
          <button
            id="tab-btn-power"
            onClick={() => setActiveTab('power')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'power' 
                ? 'bg-brand-green text-brand-dark shadow-sm' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Zap className="h-3 w-3" />
            Load Curve
          </button>
          <button
            id="tab-btn-network"
            onClick={() => setActiveTab('network')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'network' 
                ? 'bg-brand-green text-brand-dark shadow-sm' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Radio className="h-3 w-3" />
            Latency
          </button>
        </div>
      </div>

      {/* Primary Analytics Row */}
      <div className="grid grid-cols-3 gap-2 bg-brand-dark/55 border border-brand-border/60 rounded-lg p-3 mb-4">
        <div>
          <div className="text-[10px] text-gray-500 uppercase font-mono">Current Peak</div>
          <div id="peak-val" className="text-lg font-mono font-bold text-white mt-0.5">
            {activeTab === 'power' ? `${maxValue} W` : `${maxValue} ms`}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 uppercase font-mono">Hourly Average</div>
          <div id="avg-val" className="text-lg font-mono font-bold text-brand-green text-glow mt-0.5">
            {activeTab === 'power' ? `${avgUsage} W` : `${avgUsage} ms`}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 uppercase font-mono">
            {activeTab === 'power' ? 'Est. Daily Power' : 'Average Signal'}
          </div>
          <div id="daily-or-sig-val" className="text-lg font-mono font-bold text-white mt-0.5">
            {activeTab === 'power' ? `${totalKwh} kWh` : '-50 dBm'}
          </div>
        </div>
      </div>

      {/* Custom SVG Rendering */}
      <div className="relative select-none" style={{ height: `${height}px` }}>
        <svg
          id="telemetry-svg"
          width="100%"
          height={height}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="overflow-visible"
        >
          <defs>
            {/* Glowing neon green gradient */}
            <linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#22C55E" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glowFilter" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#22C55E" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = padding.top + ratio * chartHeight;
            const labelValue = Math.round(maxValue - ratio * (maxValue - minValue));
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#1E1E1E"
                  strokeDasharray="3,3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  fill="#555555"
                  fontSize="9"
                  fontFamily="JetBrains Mono, monospace"
                  textAnchor="end"
                >
                  {labelValue}
                </text>
              </g>
            );
          })}

          {/* Fill Area */}
          {areaD && (
            <path
              d={areaD}
              fill="url(#areaGlow)"
              className="transition-all duration-300"
            />
          )}

          {/* Telemetry Stroke Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#22C55E"
              strokeWidth="2"
              filter="url(#glowFilter)"
              className="transition-all duration-300"
            />
          )}

          {/* Horizontal X-Axis */}
          <line
            x1={padding.left}
            y1={padding.top + chartHeight}
            x2={width - padding.right}
            y2={padding.top + chartHeight}
            stroke="#1E1E1E"
          />

          {/* Hour Labels */}
          {data.map((item, index) => {
            if (index % 2 !== 0 && width < 400) return null; // Sparsify labels on small screens
            const x = padding.left + (index / (data.length - 1)) * chartWidth;
            return (
              <text
                key={index}
                x={x}
                y={height - 8}
                fill="#555555"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                {item.time}
              </text>
            );
          })}

          {/* Interactive Hover Line */}
          {hoveredPos && (
            <g>
              <line
                x1={hoveredPos.x}
                y1={padding.top}
                x2={hoveredPos.x}
                y2={padding.top + chartHeight}
                stroke="#22C55E"
                strokeWidth="1"
                strokeDasharray="2,2"
                opacity="0.7"
              />
              <circle
                cx={hoveredPos.x}
                cy={hoveredPos.y}
                r="5"
                fill="#22C55E"
                stroke="#070707"
                strokeWidth="1.5"
                className="glow-green"
              />
            </g>
          )}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIndex !== null && hoveredPos && (
          <div
            id="chart-tooltip"
            className="absolute z-30 bg-brand-dark/95 border border-brand-green/40 p-2.5 rounded-lg text-xs font-mono glow-green-sm pointer-events-none"
            style={{
              left: `${Math.min(hoveredPos.x - 50, width - 130)}px`,
              top: `${Math.max(hoveredPos.y - 75, 5)}px`,
            }}
          >
            <div className="text-gray-400 font-sans text-[10px]">{data[hoveredIndex].time} GMT</div>
            <div className="font-bold text-white mt-0.5 flex items-center gap-1">
              <Zap className="h-3 w-3 text-brand-green" />
              {getLabel(data[hoveredIndex])}
            </div>
            {activeTab === 'power' && (
              <div className="text-gray-500 text-[9px] mt-0.5">
                Baseline: {mockPowerData[hoveredIndex].baseline} W
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 text-[10px] font-mono text-gray-500 border-t border-brand-border/40 pt-2.5">
        <span className="flex items-center gap-1">
          <Activity className="h-3 w-3 text-brand-green" />
          Sensor interval: 10s
        </span>
        <span className="text-right">
          Database: Supabase 4layers.pooler
        </span>
      </div>
    </div>
  );
}
