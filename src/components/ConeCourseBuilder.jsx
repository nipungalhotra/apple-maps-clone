import React, { useState } from 'react';
import {
  Activity, Square, RotateCw, Repeat, Plus, Trash2, X, Sparkles, Check, Lock, Bike
} from 'lucide-react';
import { CONE_PRESETS } from '../data/conePresets';
import { canAccessConePreset, canDropCustomCone } from '../services/subscriptionService';
import MSFPrepPackModal from './MSFPrepPackModal';

export default function ConeCourseBuilder({
  activeCoursePreset,
  setActiveCoursePreset,
  cones,
  onApplyPreset,
  onClearCones,
  isDroppingCustomCone,
  setIsDroppingCustomCone,
  selectedGroundCoord,
  isPro = false,
  onOpenPaywall
}) {
  const [isMsfModalOpen, setIsMsfModalOpen] = useState(false);

  const handlePresetClick = (preset) => {
    if (!canAccessConePreset(preset.id, isPro)) {
      if (onOpenPaywall) onOpenPaywall('cones');
      return;
    }
    onApplyPreset(preset);
  };

  const handleCustomConeToggle = () => {
    if (!canDropCustomCone(isPro)) {
      if (onOpenPaywall) onOpenPaywall('cones');
      return;
    }
    setIsDroppingCustomCone(!isDroppingCustomCone);
  };

  const handleDeployMsfDrill = (drill) => {
    const centerLng = selectedGroundCoord ? selectedGroundCoord[0] : -122.4194;
    const centerLat = selectedGroundCoord ? selectedGroundCoord[1] : 37.7749;
    const generatedCones = drill.generateCones(centerLng, centerLat);
    if (onApplyPreset) {
      onApplyPreset({
        id: drill.id,
        name: drill.name,
        generateCones: () => generatedCones
      });
    }
  };

  return (
    <>
      <div className="p-3.5 bg-white/85 dark:bg-zinc-800/85 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 shadow-lg space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              ▲
            </div>
            <div>
              <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wide flex items-center gap-1.5">
                Virtual Cone Course
                {!isPro && (
                  <span className="text-[9px] font-bold text-amber-600 bg-amber-500/15 px-1.5 py-0.2 rounded-full">
                    FREE TIER: 1 PRESET
                  </span>
                )}
              </h4>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Drop drills on any open ground ({cones.length} cones placed)
              </p>
            </div>
          </div>

          {cones.length > 0 && (
            <button
              onClick={onClearCones}
              className="flex items-center gap-1 text-[11px] font-bold text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 rounded-full transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        {/* MODEL 4: MOTORCYCLE MSF PACK HERO TRIGGER */}
        <button
          onClick={() => setIsMsfModalOpen(true)}
          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-red-500/15 border border-orange-500/30 text-xs font-bold text-orange-900 dark:text-orange-200 flex items-center justify-between hover:border-orange-500/60 transition-all shadow-xs"
        >
          <span className="flex items-center gap-1.5">
            <Bike className="w-4 h-4 text-orange-600 animate-pulse" />
            <span>Official MSF Test Cones (Box & Swerve)</span>
          </span>
          <span className="text-[9px] bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black px-2 py-0.5 rounded-full shadow-xs">
            $14.99 Pack
          </span>
        </button>

        {/* Preset Buttons */}
        <div className="grid grid-cols-2 gap-1.5">
          {CONE_PRESETS.map((preset) => {
            const isSelected = activeCoursePreset === preset.id;
            const isLocked = !canAccessConePreset(preset.id, isPro);

            return (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset)}
                className={`p-2 rounded-xl text-left border transition-all relative ${
                  isSelected
                    ? 'bg-orange-500/10 border-orange-500 text-orange-700 dark:text-orange-300'
                    : 'bg-white/60 dark:bg-zinc-700/60 hover:bg-white border-black/5 dark:border-white/5 text-zinc-700 dark:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-bold flex items-center gap-1">
                    {preset.name}
                    {isLocked && <Lock className="w-2.5 h-2.5 text-amber-500" />}
                  </span>
                  <span className="text-[9px] font-black uppercase text-orange-600 bg-orange-500/15 px-1.5 py-0.2 rounded-full">
                    {preset.vehicle}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 line-clamp-1">{preset.description}</p>
                {isLocked && (
                  <span className="absolute bottom-1 right-2 text-[8px] font-black uppercase text-amber-600 bg-amber-500/20 px-1 rounded">
                    PRO
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom Cone Drop Mode Toggle */}
        <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5">
          <button
            onClick={handleCustomConeToggle}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all w-full justify-center ${
              isDroppingCustomCone
                ? 'bg-orange-500 text-white shadow-md animate-pulse'
                : 'bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 hover:bg-black/10'
            }`}
          >
            {!isPro ? (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>+ Drop Custom Cone (Unlock PRO)</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>{isDroppingCustomCone ? 'Tap Map to Place Cone' : '+ Drop Custom Cone Anywhere'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Model 4: MSF Motorcycle Masterclass Modal */}
      <MSFPrepPackModal
        isOpen={isMsfModalOpen}
        onClose={() => setIsMsfModalOpen(false)}
        onApplyDrillCones={handleDeployMsfDrill}
        isPro={isPro}
        onOpenPaywall={onOpenPaywall}
      />
    </>
  );
}
