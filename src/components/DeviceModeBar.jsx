import React from 'react';
import { Monitor, Smartphone, Maximize2, Sun, Moon, Layers, Locate, Car, Zap, HelpCircle } from 'lucide-react';

export default function DeviceModeBar({
  viewMode,
  setViewMode,
  is3D,
  setIs3D,
  isDarkMode,
  setIsDarkMode,
  onRecenter,
  showTraffic = false,
  setShowTraffic = () => {},
  isPro = false,
  onOpenPaywall = () => {},
  onOpenGuide = () => {}
}) {
  return (
    <div className="absolute top-4 right-4 z-30 flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        {/* B2C Pro Pass Quick Button */}
        {isPro ? (
          <button
            onClick={() => onOpenPaywall()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md active:scale-95 transition-all"
            title="Learner PRO Activated - Click to Manage"
          >
            <span>PRO PASS 👑</span>
          </button>
        ) : (
          <button
            onClick={() => onOpenPaywall()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:opacity-95 text-white shadow-md active:scale-95 transition-all"
            title="Unlock Unlimited Grounds, DMV Test Simulator & Certified PDF Log"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>PRO $29.99</span>
          </button>
        )}

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
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900'
            }`}
          >
            3D
          </button>

          {/* Recenter Map Button */}
          <button
            onClick={onRecenter}
            title="Recenter Map on Current Location"
            className="p-1.5 rounded-full text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 transition-colors"
          >
            <Locate className="w-4 h-4" />
          </button>

          {/* Dark / Light Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            title="Toggle Dark Mode"
            className="p-1.5 rounded-full text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 transition-colors"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Visual Onboarding Guide Button */}
          <button
            onClick={onOpenGuide}
            title="How RoadReady Works (Visual Guide)"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden lg:inline text-[11px]">How it Works</span>
          </button>
        </div>
      </div>

      {/* Floating Traffic Facility Legend */}
      {showTraffic && (
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl rounded-2xl shadow-apple-card border border-black/5 dark:border-white/10 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 animate-slideDown">
          <span className="text-zinc-400 font-normal uppercase tracking-wider">Traffic</span>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#34C759]"></span>
            <span>Fast</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFCC00]"></span>
            <span>Slow</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B30]"></span>
            <span>Stop-and-go</span>
          </div>
        </div>
      )}
    </div>
  );
}
