import React from 'react';
import { Monitor, Smartphone, Maximize2, Sun, Moon, Layers, Locate, Car, Zap, HelpCircle, WifiOff, UserRound } from 'lucide-react';

const SHOW_DEVICE_SWITCHER = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEVICE_SWITCHER === 'true';

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
  onOpenGuide = () => {},
  isOffline = false,
  accountsEnabled = false,
  accountEmail = '',
  onOpenAccount = () => {}
}) {
  return (
    <div className="absolute top-4 right-4 z-30 flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        {/* Offline Status Indicator */}
        {isOffline && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/90 text-white backdrop-blur-md shadow-apple-card animate-pulse">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Offline (Cached Maps)</span>
          </div>
        )}

        {/* Account */}
        {accountsEnabled && (
          accountEmail ? (
            <button
              onClick={onOpenAccount}
              title={`Signed in as ${accountEmail}`}
              aria-label={`Account: signed in as ${accountEmail}`}
              className="w-8 h-8 rounded-full bg-apple-blue text-white text-xs font-black uppercase flex items-center justify-center shadow-md active:scale-95 transition-all"
            >
              {accountEmail.charAt(0)}
            </button>
          ) : (
            <button
              onClick={onOpenAccount}
              title="Sign in or create an account"
              aria-label="Sign in or create an account"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/80 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-100 backdrop-blur-xl shadow-apple-pill border border-black/5 dark:border-white/10 active:scale-95 transition-all"
            >
              <UserRound className="w-3.5 h-3.5" />
              <span>Sign in</span>
            </button>
          )
        )}

        {/* B2C Pro Pass Quick Button */}
        {isPro ? (
          <button
            onClick={() => onOpenPaywall()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md active:scale-95 transition-all"
            title="Learner PRO Activated - Click to Manage"
            aria-label="Learner PRO Subscription Activated - Manage Account"
          >
            <span>PRO PASS 👑</span>
          </button>
        ) : (
          <button
            onClick={() => onOpenPaywall()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:opacity-95 text-white shadow-md active:scale-95 transition-all"
            title="Unlock Unlimited Grounds, DMV Test Simulator & Printable Practice Log"
            aria-label="Unlock Learner PRO for $4.99 a month"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>PRO $4.99/mo</span>
          </button>
        )}

        {/* Device preview switcher: development builds only, never shown to customers */}
        {SHOW_DEVICE_SWITCHER && (
        <div className="flex items-center p-1 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl rounded-full shadow-apple-pill border border-black/5 dark:border-white/10" role="group" aria-label="Device Viewport Switcher">
          <button
            onClick={() => setViewMode('desktop')}
            title="Desktop App Layout (macOS)"
            aria-label="Switch to macOS Desktop Layout"
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
            aria-label="Switch to iOS iPhone Mobile Simulator"
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
            aria-label="Switch to Responsive Fullscreen Browser Layout"
            className={`p-1.5 rounded-full text-xs font-bold transition-all ${
              viewMode === 'responsive'
                ? 'bg-apple-blue text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
        )}

        {/* Map Control Utilities */}
        <div className="flex items-center p-1 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl rounded-full shadow-apple-pill border border-black/5 dark:border-white/10" role="group" aria-label="Map Visual Controls">
          {/* Traffic overlay toggle (simulated estimate, not live data) */}
          <button
            onClick={() => setShowTraffic(!showTraffic)}
            title="Show estimated traffic (simulated, not live)"
            aria-label="Show estimated traffic overlay (simulated, not live)"
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
            aria-label="Toggle 3D Map Perspective"
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
            aria-label="Recenter Map on Current GPS Location"
            className="p-1.5 rounded-full text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 transition-colors"
          >
            <Locate className="w-4 h-4" />
          </button>

          {/* Dark / Light Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            title="Toggle Dark Mode"
            aria-label={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="p-1.5 rounded-full text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 transition-colors"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Visual Onboarding Guide Button */}
          <button
            onClick={onOpenGuide}
            title="How RoadReady Works (Visual Guide)"
            aria-label="Open RoadReady Visual How It Works Guide"
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
          <span className="text-zinc-400 font-normal uppercase tracking-wider">Est. traffic (not live)</span>
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
