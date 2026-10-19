import React, { useState } from 'react';
import {
  ShieldCheck, Car, Bike, Navigation, Clock, Sparkles, CheckCircle2,
  AlertTriangle, ChevronRight, Award, Sliders, Calendar, HelpCircle,
  Eye, Check, XCircle, CloudRain, Sun, Moon, MessageSquare, Plus,
  Trophy, Activity, Send
} from 'lucide-react';
import { getFilteredLearnerZones, getDrillsForVehicle, evaluateLocationSafety } from '../services/learnerEngine';
import { WEATHER_CONDITIONS, calculateWeatherAdjustedSafety } from '../services/weatherSafetyService';
import { INITIAL_COMMUNITY_REPORTS } from '../data/communityReports';
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
  onAddPracticeHour
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
      <div className="p-3 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent rounded-2xl border border-emerald-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                Learner FreeSpace Engine
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-bold">PRO SUITE</span>
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

      {/* Weather Hazard Banner if Rain is active */}
      {weatherMode === 'rain' && (
        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs flex items-center gap-2 text-blue-900 dark:text-blue-200 animate-slideDown">
          <CloudRain className="w-4 h-4 text-apple-blue shrink-0 animate-bounce" />
          <span>
            <strong>Wet Surface Active:</strong> Stopping distance is <strong>1.8x longer</strong>. Bike traction penalty applied (-25%).
          </span>
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

            {zones.map((zone) => {
              const isSelected = selectedLearnerZone?.id === zone.id;
              return (
                <div
                  key={zone.id}
                  onClick={() => onSelectZone(zone)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
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
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {zone.name}
                        </h4>
                        <p className="text-xs text-zinc-400 line-clamp-1">{zone.subtitle}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                      {zone.dynamicScore}%
                    </span>
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
        />
      )}

      {/* TAB 3: DMV TEST SIMULATOR */}
      {activeTab === 'dmv' && (
        <DMVTestSimulator
          selectedDmvRoute={selectedDmvRoute}
          setSelectedDmvRoute={setSelectedDmvRoute}
          onStartDmvTestDrive={onStartDmvTestDrive}
        />
      )}

      {/* TAB 4: SAFETY PIPELINE EVALUATOR */}
      {activeTab === 'pipeline' && baseEvaluation && (
        <div className="space-y-3">
          <div className="p-3 bg-white/70 dark:bg-zinc-800/70 rounded-2xl border border-black/5 dark:border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Target Ground</span>
                <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100">{baseEvaluation.zoneName}</h4>
              </div>
              <div className="text-right">
                <span className={`text-base font-black ${baseEvaluation.isApproved ? 'text-emerald-600' : 'text-amber-500'}`}>
                  {weatherAdjustment ? weatherAdjustment.adjustedScore : baseEvaluation.finalScore}%
                </span>
                <span className="block text-[9px] font-bold text-zinc-400">
                  {baseEvaluation.isApproved ? 'APPROVED' : 'RESTRICTED'}
                </span>
              </div>
            </div>

            {/* Time Simulator Slider */}
            <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-semibold text-zinc-600 dark:text-zinc-300">
                  <Clock className="w-3.5 h-3.5 text-apple-blue" />
                  Time Simulator: <span className="font-bold text-apple-blue">{simulatedHour}:00</span>
                </span>
                <button
                  onClick={() => setIsWeekendSim(!isWeekendSim)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                    isWeekendSim
                      ? 'bg-apple-blue text-white border-apple-blue'
                      : 'bg-black/5 dark:bg-white/10 text-zinc-600 border-transparent'
                  }`}
                >
                  {isWeekendSim ? 'Weekend (Empty Lots)' : 'Weekday'}
                </button>
              </div>

              <input
                type="range"
                min="0"
                max="23"
                value={simulatedHour}
                onChange={(e) => setSimulatedHour(parseInt(e.target.value))}
                className="w-full h-1.5 bg-black/10 dark:bg-white/15 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

          {/* 5-Stage Step Breakdown Cards */}
          <div className="space-y-2">
            {baseEvaluation.stages.map((st, i) => (
              <div
                key={i}
                className="p-3 bg-white/60 dark:bg-zinc-800/60 rounded-2xl border border-black/5 dark:border-white/5 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    {st.status === 'PASS' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    {st.name}
                  </div>
                  <span className="font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[11px]">
                    {st.score} / 100
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pl-5 leading-relaxed">
                  {st.details}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: CROWDSOURCED COMMUNITY STATUS */}
      {activeTab === 'community' && activeZone && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
              Community Reports for {activeZone.name}
            </span>
          </div>

          {/* Submit New Report Form */}
          <div className="p-3 bg-white/70 dark:bg-zinc-800/70 rounded-2xl border border-black/5 dark:border-white/5 space-y-2 text-xs">
            <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
              + Post Live Ground Update
            </span>
            <div className="flex items-center gap-2">
              <select
                value={newGateStatus}
                onChange={(e) => setNewGateStatus(e.target.value)}
                className="bg-black/5 dark:bg-white/10 rounded-lg p-1.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300"
              >
                <option value="Open">Gate: Open</option>
                <option value="Locked">Gate: Locked</option>
                <option value="Security Present">Security Present</option>
              </select>
              <input
                type="text"
                value={newReportText}
                onChange={(e) => setNewReportText(e.target.value)}
                placeholder="e.g. Cones allowed, empty until 6 PM..."
                className="flex-1 bg-black/5 dark:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none"
              />
              <button
                onClick={handleAddCommunityReport}
                className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List of Existing Reports */}
          <div className="space-y-2">
            {currentZoneReports.map((rep) => (
              <div
                key={rep.id}
                className="p-3 bg-white/60 dark:bg-zinc-800/60 rounded-2xl border border-black/5 dark:border-white/5 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{rep.author}</span>
                  <span className="text-[10px] text-zinc-400">{rep.timeAgo}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold">
                  <span className="bg-emerald-500/15 text-emerald-600 px-2 py-0.5 rounded-full">
                    {rep.gateStatus}
                  </span>
                  <span className="bg-blue-500/15 text-apple-blue px-2 py-0.5 rounded-full">
                    {rep.surfaceCondition}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed pt-0.5">
                  "{rep.comment}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Driver Passport Logbook Modal */}
      <LearnerPassportModal
        isOpen={isPassportOpen}
        onClose={() => setIsPassportOpen(false)}
        loggedHours={loggedHours}
        onAddPracticeHour={onAddPracticeHour}
      />
    </div>
  );
}
