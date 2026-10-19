import React from 'react';
import { Monitor, Smartphone, Maximize2, Sun, Moon, Layers, Locate, Car } from 'lucide-react';

export default function DeviceModeBar({
  viewMode,
  setViewMode,
  is3D,
  setIs3D,
  isDarkMode,
  setIsDarkMode,
  onRecenter,
  showTraffic = false,
  setShowTraffic = () => {}
}) {
  return (
    <div className="absolute top-4 right-4 z-30 flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        {/* Device Mode Switcher Pill */}
        <div className="flex items-center p-1 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl rounded-full shadow-apple-pill border border-black/5 dark:border-white/10">
          <button
            onClick={() => setViewMode('desktop')}
            title="Desktop App Layout (macOS)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              viewMode === 'desktop'
                ? 'bg-apple-blue text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desktop</span>
          </button>

          <button
            onClick={() => setViewMode('mobile')}
            title="Mobile App Layout (iOS iPhone Frame)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              viewMode === 'mobile'
                ? 'bg-apple-blue text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mobile</span>
          </button>

          <button
            onClick={() => setViewMode('responsive')}
            title="Responsive Browser Layout"
            className={`p-1.5 rounded-full text-xs font-bold transition-all ${
              viewMode === 'responsive'
                ? 'bg-apple-blue text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Map Control Utilities */}
        <div className="flex items-center p-1 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl rounded-full shadow-apple-pill border border-black/5 dark:border-white/10">
          {/* Live Traffic Overlay Toggle */}
          <button
            onClick={() => setShowTraffic(!showTraffic)}
            title="Toggle Live Traffic Facility"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              showTraffic
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden md:inline">Traffic</span>
          </button>

          {/* 3D Buildings Toggle */}
          <button
            onClick={() => setIs3D(!is3D)}
            title="Toggle 3D Perspective"
            className={`px-2.5 py-1.5 rounded-full text-xs font-black transition-all ${
              is3D
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900'
            }`}
          >
            3D
          </button>

          {/* Center Location */}
          <button
            onClick={onRecenter}
            title="Center on My Location"
            className="p-1.5 rounded-full text-zinc-600 dark:text-zinc-300 hover:text-apple-blue transition-colors"
          >
            <Locate className="w-4 h-4" />
          </button>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            title="Toggle Dark / Light Theme"
            className="p-1.5 rounded-full text-zinc-600 dark:text-zinc-300 hover:text-amber-500 transition-colors"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Floating Apple Maps Traffic Legend */}
      {showTraffic && (
        <div className="flex items-center gap-3 px-3 py-1.5 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl rounded-full shadow-apple-card border border-black/5 dark:border-white/10 text-[10px] font-bold text-zinc-700 dark:text-zinc-200 animate-fadeIn">
          <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[9px]">Traffic:</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Free Flow (Best)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Moderate
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Heavy
          </span>
        </div>
      )}
    </div>
  );
}
