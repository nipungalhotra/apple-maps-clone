import React, { useState } from 'react';
import {
  Sparkles, Check, X, ShieldCheck, Zap, Lock, Award, HeartHandshake,
  CreditCard, ArrowRight, ShieldAlert, CheckCircle2, Star, Car
} from 'lucide-react';
import { upgradeToPro, downgradeToFree } from '../services/subscriptionService';

export default function LearnerProPaywallModal({
  isOpen,
  onClose,
  isPro,
  onSubscriptionChange,
  highlightFeature = null
}) {
  const [selectedPlan, setSelectedPlan] = useState('lifetime'); // 'lifetime' | 'monthly'
  const [isProcessing, setIsProcessing] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async (planToUse = selectedPlan) => {
    setIsProcessing(true);
    setTimeout(async () => {
      const state = await upgradeToPro(planToUse);
      setIsProcessing(false);
      setSuccessToast(true);
      if (onSubscriptionChange) onSubscriptionChange(state);
      setTimeout(() => {
        setSuccessToast(false);
        onClose();
      }, 1200);
    }, 700);
  };

  const handleDowngrade = async () => {
    setIsProcessing(true);
    const state = await downgradeToFree();
    setIsProcessing(false);
    if (onSubscriptionChange) onSubscriptionChange(state);
    onClose();
  };

  const featureMatrix = [
    {
      feature: 'Ground Discovery',
      free: '2 Nearest Safe Zones',
      pro: 'Unlimited Discovery (All 5 km radius grounds)',
      highlight: highlightFeature === 'grounds'
    },
    {
      feature: 'Live Traffic Facility',
      free: 'Basic traffic status',
      pro: 'Live Best-Practice Window & Flow Speeds',
      highlight: highlightFeature === 'traffic'
    },
    {
      feature: 'Virtual Cones',
      free: '1 Preset (Slalom)',
      pro: 'All Presets (Parallel, Box, Fig-8) + Custom Cones',
      highlight: highlightFeature === 'cones'
    },
    {
      feature: 'DMV Road Test Simulator',
      free: 'Route Preview Only',
      pro: 'Interactive Test Drive with Examiner Voice Scoring',
      highlight: highlightFeature === 'dmv'
    },
    {
      feature: 'Learner Passport',
      free: 'Manual counter',
      pro: 'Printable DMV-Certified 50-Hour Practice Log (PDF)',
      highlight: highlightFeature === 'pdf'
    },
    {
      feature: 'Weather Braking Physics',
      free: 'Standard alert',
      pro: 'Dynamic Rain/Braking Multiplier HUD & Physics Curve',
      highlight: highlightFeature === 'weather'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xl animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden my-auto animate-scaleUp">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-500 dark:text-zinc-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Gold Gradient Banner */}
        <div className="p-6 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-wider text-white">
              Model 1: B2C Pro Pass
            </span>
            <span className="flex items-center text-amber-200 text-xs font-bold gap-0.5">
              <Star className="w-3.5 h-3.5 fill-amber-300" /> 4.9/5 (14,200+ Passes)
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Pass Your DMV Test On The First Try.
          </h2>
          <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-md">
            Unlock unlimited empty parking grounds, interactive examiner audio tests, virtual cones, and the certified 50-hour state logbook.
          </p>
        </div>

        {/* Plan Selector */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Lifetime Option */}
            <div
              onClick={() => setSelectedPlan('lifetime')}
              className={`relative p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                selectedPlan === 'lifetime'
                  ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 shadow-md'
                  : 'border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="absolute -top-2.5 right-3 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm">
                Save 60% • Best Value
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">Lifetime Pass</span>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'lifetime' ? 'border-amber-500 bg-amber-500' : 'border-zinc-400'}`}>
                  {selectedPlan === 'lifetime' && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100">$29.99</span>
                <span className="text-[11px] text-zinc-400 ml-1 font-medium">one-time</span>
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                Full unlimited access forever. Never pay again.
              </p>
            </div>

            {/* Monthly Option */}
            <div
              onClick={() => setSelectedPlan('monthly')}
              className={`relative p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                selectedPlan === 'monthly'
                  ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 shadow-md'
                  : 'border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">Monthly Pass</span>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'monthly' ? 'border-amber-500 bg-amber-500' : 'border-zinc-400'}`}>
                  {selectedPlan === 'monthly' && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100">$4.99</span>
                <span className="text-[11px] text-zinc-400 ml-1 font-medium">/ month</span>
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                Flexible practice. Cancel anytime in 1 tap.
              </p>
            </div>
          </div>

          {/* Feature Matrix Table */}
          <div className="border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="grid grid-cols-12 p-2 bg-black/5 dark:bg-white/5 text-[10px] font-black uppercase tracking-wider text-zinc-500">
              <div className="col-span-5">Feature Tier</div>
              <div className="col-span-3 text-center">Free Tier</div>
              <div className="col-span-4 text-right pr-1 text-amber-600 dark:text-amber-400 font-black">Learner PRO</div>
            </div>

            <div className="divide-y divide-black/5 dark:divide-white/5 text-xs">
              {featureMatrix.map((row, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-12 p-2.5 items-center transition-colors ${
                    row.highlight ? 'bg-amber-500/10 font-bold' : ''
                  }`}
                >
                  <div className="col-span-5 font-semibold text-zinc-800 dark:text-zinc-200 text-[11px] flex items-center gap-1.5">
                    {row.highlight && <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />}
                    <span>{row.feature}</span>
                  </div>
                  <div className="col-span-3 text-center text-zinc-400 text-[11px]">
                    {row.free}
                  </div>
                  <div className="col-span-4 text-right text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                    {row.pro}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions & Payment CTA */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => handleUpgrade(selectedPlan)}
              disabled={isProcessing}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:opacity-95 text-white font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isProcessing ? (
                <span>Unlocking Pro Access...</span>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-white" />
                  <span>
                    Unlock Pro Access ({selectedPlan === 'lifetime' ? '$29.99 One-Time' : '$4.99/mo'})
                  </span>
                </>
              )}
            </button>

            {/* Apple Pay Button representation */}
            <button
              onClick={() => handleUpgrade(selectedPlan)}
              disabled={isProcessing}
              className="w-full py-3 bg-black dark:bg-white text-white dark:text-black font-semibold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-md hover:opacity-90 transition-all active:scale-[0.98]"
            >
              <span>Pay with</span>
              <span className="font-bold text-sm tracking-tight">Pay</span>
            </button>
          </div>

          {/* Guarantees & Developer Quick Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 text-[11px] text-zinc-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              100% Pass Guarantee or Refund
            </span>

            {/* Instant Toggle for Testing */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-400 font-mono">Dev Switch:</span>
              {isPro ? (
                <button
                  onClick={handleDowngrade}
                  className="text-[10px] font-bold text-rose-500 hover:underline"
                >
                  Reset to Free
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade('lifetime')}
                  className="text-[10px] font-bold text-emerald-600 hover:underline"
                >
                  ⚡ Instant Unlock PRO
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="absolute inset-0 bg-emerald-600/95 flex flex-col items-center justify-center text-white p-6 z-20 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-2xl mb-3 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black">Learner PRO Activated!</h3>
            <p className="text-xs text-white/90 mt-1">
              All 5 km practice grounds, custom cones, DMV voice examiner, and certified PDF logbook unlocked.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
