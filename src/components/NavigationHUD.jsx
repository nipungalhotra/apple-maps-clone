import React, { useState, useEffect } from 'react';
import {
  ArrowUpRight, ArrowUpLeft, ArrowUp, CornerUpRight, CornerUpLeft,
  X, Volume2, VolumeX, FastForward, Play, Pause, Navigation,
  CloudRain, AlertTriangle
} from 'lucide-react';
import { formatDistance, formatDuration, calculateETA } from '../services/routingService';
import { siriVoice } from '../services/voiceService';
import { WEATHER_CONDITIONS } from '../services/weatherSafetyService';

export default function NavigationHUD({
  routeData,
  activeStepIndex,
  setActiveStepIndex,
  onEndNavigation,
  isPlaying,
  setIsPlaying,
  simSpeed,
  setSimSpeed,
  weatherMode = 'clear'
}) {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);

  const steps = routeData?.steps || [];
  const currentStep = steps[activeStepIndex] || steps[0];
  const nextStep = steps[activeStepIndex + 1];

  const weather = WEATHER_CONDITIONS[weatherMode] || WEATHER_CONDITIONS.clear;

  // Speak maneuvers via Siri Voice whenever active step updates
  useEffect(() => {
    if (currentStep && isVoiceEnabled) {
      const distanceText = formatDistance(currentStep.distance);
      const textToSpeak = `In ${distanceText}, ${currentStep.instruction}`;
      siriVoice.speak(textToSpeak, false);
    }
  }, [activeStepIndex, isVoiceEnabled]);

  const toggleVoice = () => {
    const nextState = !isVoiceEnabled;
    setIsVoiceEnabled(nextState);
    siriVoice.setMuted(!nextState);
  };

  // Auto-advance simulated GPS along the route
  useEffect(() => {
    if (!isPlaying || !routeData) return;

    const intervalTime = Math.max(300, 1500 / simSpeed);
    const timer = setInterval(() => {
      setActiveStepIndex((prev) => {
        if (prev < routeData.coordinates.length - 1) {
          return prev + 1;
        } else {
          setIsPlaying(false);
          siriVoice.speak("You have arrived at your destination.", true);
          return prev;
        }
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPlaying, simSpeed, routeData]);

  const getManeuverIcon = (modifier) => {
    if (!modifier) return <ArrowUp className="w-8 h-8" />;
    if (modifier.includes('right')) return <CornerUpRight className="w-8 h-8" />;
    if (modifier.includes('left')) return <CornerUpLeft className="w-8 h-8" />;
    return <ArrowUp className="w-8 h-8" />;
  };

  return (
    <div className="absolute inset-0 z-40 pointer-events-none flex flex-col justify-between p-4">
      {/* Top iOS Turn-by-Turn Banner (High Contrast Green) */}
      <div className="pointer-events-auto max-w-lg w-full mx-auto bg-emerald-600 dark:bg-emerald-700 text-white rounded-3xl shadow-2xl p-4.5 border border-emerald-400/40 animate-slideDown space-y-2">
        <div className="flex items-center justify-between pb-0.5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-100">
            <Navigation className="w-3.5 h-3.5 fill-emerald-100 animate-pulse" />
            Active Navigation
          </div>

          <div className="flex items-center gap-2">
            {/* Weather Alert Pill */}
            {weatherMode === 'rain' && (
              <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-400 text-zinc-900 px-2 py-0.5 rounded-full shadow-sm">
                <CloudRain className="w-3 h-3" />
                Wet Road: 1.8x Braking
              </span>
            )}

            {/* Siri Voice Guidance Toggle */}
            <button
              onClick={toggleVoice}
              title={isVoiceEnabled ? 'Siri Voice Guidance Active' : 'Siri Voice Muted'}
              className={`p-1.5 rounded-full transition-colors ${
                isVoiceEnabled
                  ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                  : 'bg-emerald-800/60 text-emerald-300 hover:bg-emerald-800'
              }`}
            >
              {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-start gap-4 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
            {getManeuverIcon(currentStep?.modifier)}
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-emerald-100">
              {currentStep ? formatDistance(currentStep.distance) : 'In 400 ft'}
            </div>
            <div className="text-lg font-black leading-tight drop-shadow-sm">
              {currentStep?.instruction || 'Continue to destination'}
            </div>
            {nextStep && (
              <div className="text-xs text-emerald-200/90 font-medium pt-1">
                Then: {nextStep.instruction}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom ETA & Navigation Controls Card */}
      <div className="pointer-events-auto max-w-lg w-full mx-auto apple-glass rounded-3xl p-4 shadow-2xl border border-white/40 dark:border-white/10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Estimated Arrival</div>
            <div className="text-3xl font-black text-apple-green flex items-baseline gap-2">
              {calculateETA(routeData?.durationSeconds || 1200)}
              <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                ({formatDuration(routeData?.durationSeconds || 1200)})
              </span>
            </div>
            <div className="text-xs text-zinc-400 font-medium">
              {formatDistance(routeData?.distanceMeters || 6000)} remaining
            </div>
          </div>

          <button
            onClick={() => {
              siriVoice.stop();
              onEndNavigation();
            }}
            className="px-5 py-2.5 bg-apple-red hover:bg-red-600 text-white font-black text-sm rounded-full shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            END
          </button>
        </div>

        {/* GPS Playback Controls for Testing */}
        <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-apple-blue text-white shadow-sm hover:bg-blue-600 active:scale-95"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
              {isPlaying ? 'Pause GPS' : 'Drive Replay'}
            </button>

            <button
              onClick={() => setSimSpeed(simSpeed === 1 ? 2 : simSpeed === 2 ? 4 : 1)}
              className="px-2.5 py-1.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 flex items-center gap-1 text-[11px]"
            >
              <FastForward className="w-3 h-3" />
              {simSpeed}x
            </button>
          </div>

          <span className="text-[11px] text-zinc-400">
            Waypoint {activeStepIndex + 1} of {routeData?.coordinates?.length || 1}
          </span>
        </div>
      </div>
    </div>
  );
}
