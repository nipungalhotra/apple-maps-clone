import React, { useState } from 'react';
import { Award, CheckCircle2, Clock, X, Sparkles, Shield, Trophy, FileText, Lock, Printer, ExternalLink } from 'lucide-react';
import PrintableDmvLogModal from './PrintableDmvLogModal';
import InsuranceSavingsModal from './InsuranceSavingsModal';

export default function LearnerPassportModal({
  isOpen,
  onClose,
  loggedHours,
  onAddPracticeHour,
  isPro = false,
  onOpenPaywall
}) {
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isInsuranceModalOpen, setIsInsuranceModalOpen] = useState(false);

  if (!isOpen) return null;

  const targetHours = 50;
  const progressPercent = Math.min(100, Math.round((loggedHours / targetHours) * 100));

  const badges = [
    {
      id: 'badge-1',
      title: 'Friction Zone Master',
      req: '5 Hours Logged',
      icon: '🚗',
      unlocked: loggedHours >= 5,
      desc: 'Mastered smooth starts without stalling'
    },
    {
      id: 'badge-2',
      title: 'Cone Slalom Ace',
      req: '15 Hours Logged',
      icon: '▲',
      unlocked: loggedHours >= 15,
      desc: 'Completed 10 consecutive virtual cone courses'
    },
    {
      id: 'badge-3',
      title: 'Parallel Parking Pro',
      req: '25 Hours Logged',
      icon: '🅿️',
      unlocked: loggedHours >= 25,
      desc: 'Aligned vehicle within 6 inches of curb'
    },
    {
      id: 'badge-4',
      title: 'Road & Test Ready',
      req: '50 Hours Logged',
      icon: '🏆',
      unlocked: loggedHours >= 50,
      desc: 'Fulfilled all state licensing practice hours'
    }
  ];

  const handlePdfClick = () => {
    if (!isPro) {
      if (onOpenPaywall) onOpenPaywall('pdf');
    } else {
      setIsPdfModalOpen(true);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fadeIn">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-2xl border border-black/10 dark:border-white/10 space-y-4">
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  Learner Driver Passport
                  {isPro && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500 text-white">
                      PRO
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-400">Official Practice Hours & Achievement Log</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-black/5 dark:bg-white/10 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Card */}
          <div className="p-4 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent rounded-2xl border border-amber-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                State Licensing Requirement
              </span>
              <span className="text-base font-black text-amber-600 dark:text-amber-400">
                {loggedHours} / {targetHours} hrs
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-400">{progressPercent}% Completed</span>
              <button
                onClick={onAddPracticeHour}
                className="text-xs font-bold text-emerald-600 hover:underline bg-emerald-500/10 px-2.5 py-1 rounded-full"
              >
                + Log 1 Hour Practice
              </button>
            </div>
          </div>

          {/* PRO BENEFIT: Official DMV-Certified 50-Hour Practice Log (PDF) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                  DMV-Certified 50-Hr Log (PDF)
                  {!isPro && (
                    <span className="text-[9px] font-bold text-amber-600 bg-amber-500/20 px-1.5 py-0.2 rounded-full">
                      PRO
                    </span>
                  )}
                </h4>
                <p className="text-[10px] text-zinc-400">
                  {isPro ? 'State DL-50HRS form ready to print' : 'Unlock printable examiner-ready sheet'}
                </p>
              </div>
            </div>

            <button
              onClick={handlePdfClick}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95 ${
                isPro
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              {isPro ? (
                <>
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PDF</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3" />
                  <span>Unlock</span>
                </>
              )}
            </button>
          </div>

          {/* MODEL 3: AUTO INSURANCE AFFILIATE SAVINGS CARD */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                🛡️
              </div>
              <div>
                <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                  Save Up to $620/yr on Car Insurance
                </h4>
                <p className="text-[10px] text-zinc-400">
                  Claim Good Driver & 50-Hour discounts ($50–$120 CPA)
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsInsuranceModalOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all active:scale-95 whitespace-nowrap"
            >
              Compare
            </button>
          </div>

          {/* Badges Grid */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
              Skill Milestone Badges
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {badges.map((b) => (
                <div
                  key={b.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    b.unlocked
                      ? 'bg-amber-500/10 border-amber-500/40 text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'bg-black/5 dark:bg-white/5 border-transparent opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xl">{b.icon}</span>
                    {b.unlocked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <span className="text-[9px] font-bold text-zinc-400 bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-full">
                        {b.req}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold truncate">{b.title}</div>
                  <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">{b.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Printable Sheet View */}
      <PrintableDmvLogModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        loggedHours={loggedHours}
      />

      {/* Model 3: Insurance Savings Affiliate Modal */}
      <InsuranceSavingsModal
        isOpen={isInsuranceModalOpen}
        onClose={() => setIsInsuranceModalOpen(false)}
        loggedHours={loggedHours}
      />
    </>
  );
}
