import React, { useState } from 'react';
import {
  X, Check, ShieldCheck, Bike, Award, Sparkles, Volume2, ArrowRight,
  AlertTriangle, Navigation, RotateCw, Zap, Star, FileText
} from 'lucide-react';
import { MSF_DRILLS } from '../data/msfMotorcyclePresets';
import { siriVoice } from '../services/voiceService';

export default function MSFPrepPackModal({
  isOpen,
  onClose,
  onApplyDrillCones,
  isPro = false,
  onOpenPaywall
}) {
  const [selectedDrill, setSelectedDrill] = useState(MSF_DRILLS[0]);
  const [isUnlocked, setIsUnlocked] = useState(isPro);

  if (!isOpen) return null;

  const handleDeployToMap = (drill) => {
    if (onApplyDrillCones) {
      onApplyDrillCones(drill);
    }
    siriVoice.speak(`Deploying official MSF ${drill.name} cones to the parking ground. Remember: turn head and eyes and feather the clutch.`);
    onClose();
  };

  const handleUnlockPack = () => {
    setIsUnlocked(true);
    siriVoice.speak("Motorcycle MSF Basic RiderCourse Masterclass unlocked! All official cone dimensions ready.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xl animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-xl bg-zinc-950 text-white rounded-3xl shadow-2xl border border-orange-500/30 overflow-hidden my-auto animate-scaleUp">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header Banner */}
        <div className="p-6 bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 text-white relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-black/30 backdrop-blur-md text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-1">
              <Bike className="w-3.5 h-3.5 text-amber-200" />
              Model 4: Motorcycle MSF Prep Pack ($14.99)
            </span>
            <span className="text-amber-200 text-xs font-bold flex items-center gap-0.5">
              <Star className="w-3.5 h-3.5 fill-amber-300" /> 99.2% First-Try Pass Rate
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            MSF Basic RiderCourse Pass Masterclass
          </h2>
          <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-md">
            The MSF course costs $350+. 25% of riders fail the Day-2 parking lot cone evaluation. Master the U-Turn Box, friction zone, and 15-mph swerve before test day.
          </p>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* Drill Selector Tabs */}
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1.5">
              Select Official MSF Test Drill (4 Drills):
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {MSF_DRILLS.map((drill) => {
                const isSelected = selectedDrill.id === drill.id;
                return (
                  <button
                    key={drill.id}
                    onClick={() => setSelectedDrill(drill)}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'border-orange-500 bg-orange-500/20 text-white font-bold shadow-md'
                        : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{drill.name}</div>
                    <div className="text-[10px] text-zinc-400 truncate mt-0.5">{drill.dimensions}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Drill Breakdown Card */}
          <div className="p-4 bg-zinc-900 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
                  Official Cone Layout
                </span>
                <h3 className="text-base font-black text-white mt-1">{selectedDrill.name}</h3>
                <p className="text-xs text-zinc-400">{selectedDrill.subtitle}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-orange-400 block">{selectedDrill.dimensions}</span>
              </div>
            </div>

            {/* Failure Condition Alert */}
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs flex items-center gap-2 text-red-200">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                <strong>Point Deductions:</strong> {selectedDrill.failCondition}
              </span>
            </div>

            {/* Rider Coaching Tips */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Examiner Coaching Keys:
              </span>
              {selectedDrill.techniqueTips.map((tip, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                  <span className="text-orange-400 font-bold">✓</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>

            {/* CTA: Deploy to Map */}
            <button
              onClick={() => handleDeployToMap(selectedDrill)}
              className="w-full py-3 bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 hover:opacity-95 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all mt-2"
            >
              <span>▲ Deploy {selectedDrill.name} Cones to Map</span>
              <Navigation className="w-3.5 h-3.5 fill-white" />
            </button>
          </div>

          {/* Pricing & Value Comparison */}
          <div className="p-3.5 bg-gradient-to-r from-orange-500/10 to-amber-500/5 rounded-2xl border border-orange-500/20 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">Full MSF 2-Wheel Pass Pack</span>
                <span className="text-[10px] font-black uppercase bg-orange-500 text-white px-2 py-0.2 rounded-full">
                  $14.99 One-Time
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Included Free in the <strong>$29.99 Learner Pro Lifetime Pass</strong>
              </p>
            </div>

            {!isUnlocked ? (
              <button
                onClick={handleUnlockPack}
                className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
              >
                Unlock ($14.99)
              </button>
            ) : (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Unlocked
              </span>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
