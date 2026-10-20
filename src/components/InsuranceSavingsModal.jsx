import React, { useState } from 'react';
import {
  X, Check, ShieldCheck, DollarSign, ExternalLink, ArrowRight,
  Sparkles, Award, TrendingDown, Star, CheckCircle2, AlertCircle
} from 'lucide-react';
import { INSURANCE_PARTNERS, calculateEstimatedInsuranceSavings } from '../data/insurancePartners';

export default function InsuranceSavingsModal({
  isOpen,
  onClose,
  loggedHours = 50,
  isDmvPassed = false
}) {
  const [driverAge, setDriverAge] = useState('teen'); // 'teen' | 'young_adult' | 'adult'
  const [hasLogbook, setHasLogbook] = useState(loggedHours >= 15);
  const [goodStudent, setGoodStudent] = useState(true);
  const [clickedPartner, setClickedPartner] = useState(null);

  if (!isOpen) return null;

  const estimatedSavings = calculateEstimatedInsuranceSavings({
    age: driverAge,
    hasLogbook,
    goodStudent
  });

  const handleLaunchQuote = async (partner) => {
    setClickedPartner(partner);

    // Track affiliate CPA click event on backend
    try {
      await fetch('/api/affiliates/insurance-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerId: partner.id,
          partnerName: partner.name,
          cpaPayout: partner.cpaPayout,
          estimatedSavings: partner.estimatedAnnualSavings,
          driverAge,
          hasLogbook,
          loggedHours,
          isDmvPassed,
          timestamp: new Date().toISOString()
        })
      });
    } catch {
      // Offline fallback
    }

    // Open carrier affiliate tracking page in new window
    window.open(partner.affiliateUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xl animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden my-auto animate-scaleUp">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Banner */}
        <div className="p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
              Model 3: Auto Insurance Affiliate Engine
            </span>
            {isDmvPassed && (
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-zinc-900 text-[10px] font-black uppercase">
                DMV Pass Verified
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            First-Time Driver Insurance Discount Center
          </h2>
          <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-md">
            New drivers face up to $3,200/yr in car insurance. Use your verified practice hours and training to unlock up to <strong>${estimatedSavings}/year in discounts</strong>.
          </p>
        </div>

        {/* BODY */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* Savings Estimator Interactive Controls */}
          <div className="p-3.5 bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl border border-black/5 dark:border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Discount Eligibility Calculator
              </span>
              <div className="text-right">
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  ~${estimatedSavings}
                </span>
                <span className="text-[10px] text-zinc-400 ml-1 font-bold">/ year estimated savings</span>
              </div>
            </div>

            {/* Age Filter */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/5 dark:bg-white/10 rounded-xl text-xs font-bold">
              {[
                { id: 'teen', label: 'Teen (16–18)' },
                { id: 'young_adult', label: 'Young Adult (19–24)' },
                { id: 'adult', label: 'Adult (25+)' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setDriverAge(f.id)}
                  className={`py-1.5 rounded-lg text-center transition-all ${
                    driverAge === f.id
                      ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Discount Checkbox Toggles */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label
                onClick={() => setHasLogbook(!hasLogbook)}
                className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                  hasLogbook
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                    : 'border-black/5 dark:border-white/5 bg-black/5 text-zinc-500'
                }`}
              >
                <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${hasLogbook ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-400'}`}>
                  {hasLogbook && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <span className="font-bold block text-[11px]">50-Hr Log Completed</span>
                  <span className="text-[9px] text-zinc-400">Qualifies for 15% discount</span>
                </div>
              </label>

              <label
                onClick={() => setGoodStudent(!goodStudent)}
                className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                  goodStudent
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                    : 'border-black/5 dark:border-white/5 bg-black/5 text-zinc-500'
                }`}
              >
                <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${goodStudent ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-400'}`}>
                  {goodStudent && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <span className="font-bold block text-[11px]">Good Student (B+ Avg)</span>
                  <span className="text-[9px] text-zinc-400">Qualifies for teen discount</span>
                </div>
              </label>
            </div>
          </div>

          {/* Insurance Carrier Comparison Cards */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 px-1">
              Recommended First-Time Driver Policies ({INSURANCE_PARTNERS.length}):
            </h4>

            {INSURANCE_PARTNERS.map((partner) => (
              <div
                key={partner.id}
                className="p-3.5 bg-white dark:bg-zinc-800 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm hover:border-emerald-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-xl shrink-0">
                    {partner.logo}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100">{partner.name}</h4>
                      <span className="text-[9px] font-black uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                        {partner.badge}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{partner.tagline}</p>
                    <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                      <span>✓ {partner.avgDiscount}</span>
                      <span className="text-zinc-300 dark:text-zinc-600">•</span>
                      <span className="text-zinc-400 font-normal">{partner.quoteTimeMins} quote</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 sm:border-l sm:border-black/5 sm:dark:border-white/10 sm:pl-3 shrink-0">
                  <div className="text-left sm:text-right">
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      -${partner.estimatedAnnualSavings}/yr
                    </span>
                    <span className="block text-[9px] text-zinc-400">Est. Average Savings</span>
                  </div>

                  <button
                    onClick={() => handleLaunchQuote(partner)}
                    className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <span>Free Quote</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Affiliate Payout Notice / Transparency */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-black/5 dark:border-white/5 text-[10px] text-zinc-400 leading-relaxed flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Quotes are 100% free with no obligation to purchase. Discounts apply to newly licensed drivers.</span>
            </span>
            <span className="font-mono text-zinc-400 font-semibold shrink-0">CPA: $50–$120 / Lead</span>
          </div>

        </div>

      </div>
    </div>
  );
}
