import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Car, Bike, Navigation, Clock, Sparkles, CheckCircle2,
  AlertTriangle, ChevronRight, Award, Sliders, Calendar, HelpCircle,
  Eye, Check, XCircle, CloudRain, Sun, Moon, MessageSquare, Plus,
  Trophy, Activity, Send, Lock, Zap
} from 'lucide-react';
import { getFilteredLearnerZones, getDrillsForVehicle, evaluateLocationSafety } from '../services/learnerEngine';
import { WEATHER_CONDITIONS, calculateWeatherAdjustedSafety } from '../services/weatherSafetyService';
import { INITIAL_COMMUNITY_REPORTS } from '../data/communityReports';
import { canAccessZone } from '../services/subscriptionService';
import ConeCourseBuilder from './ConeCourseBuilder';
import DMVTestSimulator from './DMVTestSimulator';
import LearnerPassportModal from './LearnerPassportModal';

export default function LearnerModePanel({
  userLocation,
  selectedLearnerZone,
  learnerZones = [],
  onSelectZone,
  onNavigateToZone,
  // Virtual Cones state
  activeCoursePreset,
  setActiveCoursePreset,
  cones,
  onApplyPreset,
  onClearCones,
  isDroppingCustomCone,
  setIsDroppingCustomCone,
  // DMV state
  selectedDmvRoute,
  setSelectedDmvRoute,
  onStartDmvTestDrive,
  // Weather state
  weatherMode,
  setWeatherMode,
  // Passport state
  loggedHours,
  onAddPracticeHour,
  // B2C Pro Pass State
  isPro = false,
  onOpenPaywall
}) {
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('zones'); // 'zones' | 'cones' | 'dmv' | 'pipeline' | 'community'

  // Time-of-Day Simulation
  const [simulatedHour, setSimulatedHour] = useState(new Date().getHours());
  const [isWeekendSim, setIsWeekendSim] = useState(false);

  // Passport modal visibility
  const [isPassportOpen, setIsPassportOpen] = useState(false);

  // Community Reports local and backend state
  const [communityReports, setCommunityReports] = useState(INITIAL_COMMUNITY_REPORTS);
  const [newReportText, setNewReportText] = useState('');
  const [newGateStatus, setNewGateStatus] = useState('Open');

  // Sync community reports from backend
  useEffect(() => {
    fetch('/api/community-reports')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data === 'object') {
          setCommunityReports(prev => ({ ...prev, ...data }));
        }
      })
      .catch(() => {});
  }, []);

  const zones = getFilteredLearnerZones({
    vehicleType: vehicleFilter,
    zoneType: typeFilter,
    simulatedHour,
    simulatedDay: isWeekendSim ? 0 : 2,
    userCoord: userLocation,
    sourceZones: learnerZones
  });

  const activeZone = selectedLearnerZone || zones[0];

  // Base evaluation
  const baseEvaluation = activeZone ? evaluateLocationSafety({
    zone: activeZone,
    simulatedHour,
    simulatedDay: isWeekendSim ? 0 : 2,
    vehicleType: vehicleFilter === 'all' ? 'car' : vehicleFilter
  }) : null;

  // Weather-adjusted safety
  const weatherAdjustment = baseEvaluation
    ? calculateWeatherAdjustedSafety(baseEvaluation.finalScore, weatherMode, vehicleFilter)
    : null;

  const currentZoneReports = activeZone ? (communityReports[activeZone.id] || []) : [];

  const handleZoneClick = (zone, index) => {
    if (!canAccessZone(index, isPro)) {
      if (onOpenPaywall) onOpenPaywall('grounds');
      return;
    }
    onSelectZone(zone);
  };

  const handleAddCommunityReport = async () => {
    if (!newReportText.trim() || !activeZone) return;
    const newEntry = {
      id: `rep-${Date.now()}`,
      author: 'You (Learner)',
      timeAgo: 'Just now',
      gateStatus: newGateStatus,
      securityStatus: 'Reported by you',
      surfaceCondition: weatherMode === 'rain' ? 'Wet Surface' : 'Dry & Clear',
      allowCones: true,
      comment: newReportText.trim()
    };
    setCommunityReports(prev => ({
      ...prev,
      [activeZone.id]: [newEntry, ...(prev[activeZone.id] || [])]
    }));
    const submittedText = newReportText.trim();
    setNewReportText('');

    try {
      await fetch('/api/community-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zoneId: activeZone.id,
          author: 'You (Learner)',
          status: newGateStatus,
          surface: weatherMode === 'rain' ? 'Wet Surface' : 'Dry & Clear',
          notes: submittedText
        })
      });
    } catch {
      // Local state fallback preserved
    }
  };

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Top Header Card */}
      <div className={`p-3 rounded-2xl border transition-all ${
        isPro
          ? 'bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border-amber-500/30'
          : 'bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border-emerald-500/20'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-md ${
              isPro ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                Learner FreeSpace Engine
                {isPro ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black shadow-sm">
                    PRO PASS 👑
                  </span>
                ) : (
                  <button
                    onClick={() => onOpenPaywall && onOpenPaywall()}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-black flex items-center gap-1 shadow-sm transition-all"
                  >
                    <Zap className="w-2.5 h-2.5 fill-white" />
                    <span>UPGRADE $29.99</span>
                  </button>
                )}
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Safe grounds, virtual cones, DMV tests, & live weather
              </p>
            </div>
          </div>

          {/* Passport Logbook Button */}
          <button
            onClick={() => setIsPassportOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>{loggedHours}h</span>
          </button>
        </div>

        {/* Quick Vehicle & Weather Selectors */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-black/5 dark:border-white/5">
          {/* Vehicle Switcher */}
          <div className="grid grid-cols-3 gap-1 p-0.5 bg-black/5 dark:bg-white/10 rounded-xl">
            {[
              { id: 'all', label: 'All' },
              { id: 'car', label: 'Car 🚗' },
              { id: 'bike', label: 'Bike 🏍️' }
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setVehicleFilter(id)}
                className={`py-1 rounded-lg text-xs font-bold transition-all ${
                  vehicleFilter === id
                    ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Weather Condition Toggle */}
          <div className="grid grid-cols-3 gap-1 p-0.5 bg-black/5 dark:bg-white/10 rounded-xl">
            {[
              { id: 'clear', label: '☀️ Dry' },
              { id: 'rain', label: '🌧️ Wet' },
              { id: 'night', label: '🌙 Night' }
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setWeatherMode(id)}
                className={`py-1 rounded-lg text-xs font-bold transition-all ${
                  weatherMode === id
                    ? 'bg-white dark:bg-zinc-800 text-apple-blue shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Rain / Wet Braking Distance Multiplier HUD */}
      {weatherMode === 'rain' && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-blue-500/5 border border-blue-500/30 text-xs space-y-2 animate-slideDown">
          <div className="flex items-center justify-between text-blue-900 dark:text-blue-200">
            <span className="flex items-center gap-1.5 font-bold">
              <CloudRain className="w-4 h-4 text-apple-blue shrink-0 animate-bounce" />
              <span>Wet Surface Physics: <strong>1.8x Stopping Distance</strong></span>
            </span>
            <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full">
              μ = 0.35 Friction
            </span>
          </div>

          {/* PRO Dynamic Braking Distance Telemetry HUD */}
          {isPro ? (
            <div className="p-2.5 bg-white/70 dark:bg-zinc-800/70 rounded-xl border border-blue-500/20 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Braking from 35 mph:</span>
                <span className="font-mono font-bold text-blue-600">63 meters (+28m wet lag)</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[9px] text-zinc-400">
                  <span>Dry Road (35m)</span>
                  <span>Wet Asphalt (63m)</span>
                </div>
                <div className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden flex">
                  <div className="w-[55%] bg-emerald-500 h-full"></div>
                  <div className="w-[45%] bg-rose-500 h-full animate-pulse"></div>
                </div>
              </div>
              <div className="text-[10px] text-zinc-500 leading-tight">
                💡 <em>Examiner Tip:</em> Double your 3-second following gap to 6 seconds before braking for intersections.
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-zinc-500">
                Unlock dynamic physics braking curve HUD with PRO.
              </span>
              <button
                onClick={() => onOpenPaywall && onOpenPaywall('weather')}
                className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <Lock className="w-2.5 h-2.5" /> Unlock HUD
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Tabs Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-black/5 dark:border-white/10 no-scrollbar">
        {[
          { id: 'zones', label: `Safe Zones (${zones.length})` },
          { id: 'cones', label: `Virtual Cones (${cones.length}) ▲` },
          { id: 'dmv', label: 'DMV Mock Test 🎖️' },
          { id: 'pipeline', label: 'Safety Pipeline 🎛️' },
          { id: 'community', label: 'Community Status 💬' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-xs font-bold px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: SAFE ZONES LIST */}
      {activeTab === 'zones' && (
        <div className="space-y-3">
          {selectedLearnerZone && (
            <div className="p-3.5 bg-white/80 dark:bg-zinc-800/80 rounded-2xl border-2 border-emerald-500/40 shadow-lg space-y-3 animate-slideDown">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {selectedLearnerZone.difficulty}
                  </span>
                  <h4 className="text-base font-black text-zinc-900 dark:text-zinc-50 mt-1">
                    {selectedLearnerZone.name}
                  </h4>
                  <p className="text-xs text-zinc-400">{selectedLearnerZone.subtitle}</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-emerald-600">
                    {weatherAdjustment?.adjustedScore || selectedLearnerZone.safetyScore}%
                  </div>
                  <div className="text-[10px] text-zinc-400 font-bold">Safety Score</div>
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-black/5 dark:bg-white/5 rounded-xl">
                  <span className="text-zinc-400 text-[10px] block">Free Space Width</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">~{selectedLearnerZone.widthMeters}m wide</span>
                </div>
                <div className="p-2 bg-black/5 dark:bg-white/5 rounded-xl">
                  <span className="text-zinc-400 text-[10px] block">Traffic Ceiling</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedLearnerZone.trafficLevel}</span>
                </div>
              </div>

              {/* Action Buttons: Cones + Navigate */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setActiveTab('cones')}
                  className="py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>▲ Place Cones Here</span>
                </button>

                <button
                  onClick={() => onNavigateToZone(selectedLearnerZone)}
                  className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                >
                  <Navigation className="w-3.5 h-3.5 fill-white" />
                  <span>Navigate</span>
                </button>
              </div>
            </div>
          )}

          {/* List of Recommended Safe Grounds */}
          <div className="space-y-2">
            {/* Proximity Discovery Banner */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-500/20">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {zones.length} Safe Grounds Found Near You
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 dark:bg-emerald-500/30 px-2 py-0.5 rounded-md">
                Within 5 km
              </span>
            </div>

            {zones.map((zone, idx) => {
              const isSelected = selectedLearnerZone?.id === zone.id;
              const isLocked = !canAccessZone(idx, isPro);

              return (
                <div
                  key={zone.id}
                  onClick={() => handleZoneClick(zone, idx)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500/50 shadow-sm'
                      : 'bg-white/60 dark:bg-zinc-800/60 hover:bg-white dark:hover:bg-zinc-800 border-black/5 dark:border-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
                        {zone.type === 'open_ground' ? '🏞️' : zone.type === 'parking_lot' ? '🅿️' : '🛣️'}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          {zone.name}
                          {isLocked && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 bg-amber-500/20 text-amber-600 rounded">
                              PRO
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-zinc-400 line-clamp-1">{zone.subtitle}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      {isLocked ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          <Lock className="w-3 h-3" />
                          <span>Unlock</span>
                        </div>
                      ) : (
                        <span className="text-xs font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                          {zone.dynamicScore}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span>📍 {zone.distanceKm} km away</span>
                    <span>•</span>
                    <span>{zone.widthMeters}m width</span>
                    <span>•</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {zone.isCurrentlyIdealTime ? '🟢 Low Traffic' : '🟡 Moderate'}
                    </span>
                  </div>

                  {isLocked && (
                    <div className="mt-2 pt-1.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] text-amber-600">
                      <span>🔒 Unlock all 5 km practice grounds with PRO</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: VIRTUAL CONES CREATOR */}
      {activeTab === 'cones' && (
        <ConeCourseBuilder
          activeCoursePreset={activeCoursePreset}
          setActiveCoursePreset={setActiveCoursePreset}
          cones={cones}
          onApplyPreset={onApplyPreset}
          onClearCones={onClearCones}
          isDroppingCustomCone={isDroppingCustomCone}
          setIsDroppingCustomCone={setIsDroppingCustomCone}
          selectedGroundCoord={activeZone ? activeZone.coordinates : userLocation}
          isPro={isPro}
          onOpenPaywall={onOpenPaywall}
        />
      )}

      {/* TAB 3: DMV TEST SIMULATOR */}
      {activeTab === 'dmv' && (
        <DMVTestSimulator
          selectedDmvRoute={selectedDmvRoute}
          setSelectedDmvRoute={setSelectedDmvRoute}
          onStartDmvTestDrive={onStartDmvTestDrive}
          isPro={isPro}
          onOpenPaywall={onOpenPaywall}
        />
      )}

      {/* TAB 4: SAFETY PIPELINE EVALUATOR */}
      {activeTab === 'pipeline' && baseEvaluation && (
        <div className="space-y-3">
          <div className="p-3 bg-white/70 dark:bg-zinc-800/70 rounded-2xl border border-black/5 dark:border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-500">Pipeline Ground</span>
                <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100">{activeZone.name}</h4>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-emerald-600">{baseEvaluation.finalScore}%</span>
                <span className="text-[10px] text-zinc-400 block font-bold">5-Stage Score</span>
              </div>
            </div>

            {/* Stages Breakdown */}
            <div className="space-y-1.5 pt-1 text-xs">
              {baseEvaluation.stages.map((stg) => (
                <div key={stg.id} className="p-2 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-between">
                  <div>
                    <span className="font-bold block text-zinc-800 dark:text-zinc-200">{stg.name}</span>
                    <span className="text-[10px] text-zinc-400">{stg.status}</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-600">+{stg.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: COMMUNITY NOTES & REPORTS */}
      {activeTab === 'community' && (
        <div className="space-y-3">
          <div className="p-3 bg-white/70 dark:bg-zinc-800/70 rounded-2xl border border-black/5 dark:border-white/5 space-y-2">
            <h4 className="text-xs font-black uppercase text-zinc-500 tracking-wider">
              Community Ground Status ({activeZone?.name || 'Local Ground'})
            </h4>

            {/* Input Form */}
            <div className="space-y-2 pt-1">
              <input
                type="text"
                value={newReportText}
                onChange={(e) => setNewReportText(e.target.value)}
                placeholder="Share gate status, security, or lot conditions..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex items-center justify-between gap-2">
                <select
                  value={newGateStatus}
                  onChange={(e) => setNewGateStatus(e.target.value)}
                  className="px-2 py-1.5 text-xs rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-800"
                >
                  <option value="Open">Gate Open</option>
                  <option value="Unlocked">Unlocked Barrier</option>
                  <option value="Security Active">Security Patrol</option>
                  <option value="Closed">Closed Gate</option>
                </select>

                <button
                  onClick={handleAddCommunityReport}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>Post Report</span>
                </button>
              </div>
            </div>

            {/* Existing Reports */}
            <div className="space-y-2 pt-2 divide-y divide-black/5 dark:divide-white/5">
              {currentZoneReports.length === 0 ? (
                <p className="text-xs text-zinc-400 py-2">No community notes for this ground yet. Be the first to report!</p>
              ) : (
                currentZoneReports.map((rep) => (
                  <div key={rep.id} className="pt-2 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{rep.author}</span>
                      <span className="text-zinc-400 text-[10px]">{rep.timeAgo}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 font-bold">
                        {rep.status || rep.gateStatus}
                      </span>
                      <span className="text-zinc-400">{rep.surface || rep.surfaceCondition}</span>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-300 text-[11px]">{rep.notes || rep.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Learner Passport Modal */}
      <LearnerPassportModal
        isOpen={isPassportOpen}
        onClose={() => setIsPassportOpen(false)}
        loggedHours={loggedHours}
        onAddPracticeHour={onAddPracticeHour}
        isPro={isPro}
        onOpenPaywall={onOpenPaywall}
      />
    </div>
  );
}
