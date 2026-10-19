import React, { useState } from 'react';
import {
  Award, CheckCircle2, AlertCircle, Play, ChevronRight, Volume2, Shield,
  ArrowRight, Check, X
} from 'lucide-react';
import { DMV_TEST_ROUTES } from '../data/dmvTestRoutes';
import { siriVoice } from '../services/voiceService';

export default function DMVTestSimulator({
  selectedDmvRoute,
  setSelectedDmvRoute,
  onStartDmvTestDrive
}) {
  const activeRoute = selectedDmvRoute || DMV_TEST_ROUTES[0];
  const [completedCheckpoints, setCompletedCheckpoints] = useState({});

  const toggleCheckpoint = (cpId, points, instruction) => {
    setCompletedCheckpoints(prev => {
      const next = { ...prev };
      if (next[cpId]) {
        delete next[cpId];
      } else {
        next[cpId] = points;
        // Siri speaks the examiner instruction
        siriVoice.speak(`Examiner says: ${instruction}`, true);
      }
      return next;
    });
  };

  const currentScore = Object.values(completedCheckpoints).reduce((sum, p) => sum + p, 0);
  const isPassing = currentScore >= activeRoute.passScoreThreshold;

  return (
    <div className="space-y-3 p-3.5 bg-white/80 dark:bg-zinc-800/80 rounded-2xl border border-black/5 dark:border-white/10 shadow-lg animate-fadeIn">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
              Official DMV Test Simulator
            </h4>
            <p className="text-[10px] text-zinc-400">
              Mock Examiner Road Test & Checkpoints
            </p>
          </div>
        </div>

        {/* Live Score Badge */}
        <div className="text-right">
          <span className={`text-base font-black ${isPassing ? 'text-apple-green' : 'text-amber-500'}`}>
            {currentScore} / 100
          </span>
          <span className="block text-[9px] font-bold text-zinc-400">
            {isPassing ? 'PASSED (>=85%)' : 'NEEDS PRACTICE'}
          </span>
        </div>
      </div>

      {/* DMV Center Route Picker */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/5 dark:bg-white/10 rounded-xl">
        {DMV_TEST_ROUTES.map((route) => (
          <button
            key={route.id}
            onClick={() => {
              setSelectedDmvRoute(route);
              setCompletedCheckpoints({});
            }}
            className={`py-2 px-2.5 rounded-lg text-left transition-all ${
              activeRoute.id === route.id
                ? 'bg-white dark:bg-zinc-700 text-apple-blue shadow-sm font-bold'
                : 'text-zinc-500 hover:text-zinc-900 font-semibold text-xs'
            }`}
          >
            <div className="text-[11px] truncate">{route.officeName.split('(')[0]}</div>
            <div className="text-[9px] text-zinc-400 font-normal">{route.durationMins} mins • {route.distanceMiles} mi</div>
          </button>
        ))}
      </div>

      {/* Start Test Drive CTA */}
      <button
        onClick={() => onStartDmvTestDrive(activeRoute)}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
      >
        <Play className="w-3.5 h-3.5 fill-white" />
        Drive Official Test Route with Examiner Audio
      </button>

      {/* Examiner Checkpoints Checklist */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1 block">
          Examiner Evaluation Points ({activeRoute.checkpoints.length}):
        </span>

        {activeRoute.checkpoints.map((cp, idx) => {
          const isDone = !!completedCheckpoints[cp.id];
          return (
            <div
              key={cp.id}
              onClick={() => toggleCheckpoint(cp.id, cp.points, cp.instruction)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer text-xs ${
                isDone
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
                  : 'bg-white/50 dark:bg-zinc-700/50 hover:bg-white border-black/5 dark:border-white/5 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center mt-0.5 shrink-0 ${
                    isDone ? 'bg-emerald-500 text-white' : 'border border-zinc-400'
                  }`}>
                    {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <span className="font-bold block">{idx + 1}. {cp.title}</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight block mt-0.5">
                      {cp.instruction}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                  +{cp.points} pts
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
