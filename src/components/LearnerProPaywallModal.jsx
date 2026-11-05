import React, { useEffect, useState } from 'react';
import {
  Sparkles, Check, X, ShieldCheck, Zap, Lock, Award, HeartHandshake,
  CreditCard, ArrowRight, ShieldAlert, CheckCircle2, Star, Car
} from 'lucide-react';
import { downgradeToFree } from '../services/subscriptionService';
import {
  purchasePlan, restorePurchases, manageSubscription, getPaymentsConfig, getStorePrices,
  isNativeApp, TERMS_URL, PRIVACY_URL
} from '../services/paymentsService';
import { track } from '../services/analytics';

export default function LearnerProPaywallModal({
  isOpen,
  onClose,
  isPro,
  onSubscriptionChange,
  highlightFeature = null,
  onRequireSignIn = () => {},
  subscription = null
}) {
  // One plan is on sale: Learner PRO Monthly ($4.99/month on the website).
  const selectedPlan = 'monthly';
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [config, setConfig] = useState(null);
  const [storePrices, setStorePrices] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setUpgradeError('');
    setInfoMessage('');
    if (!isPro) track('paywall_view', highlightFeature ? { feature: String(highlightFeature) } : {});
    getPaymentsConfig().then(setConfig).catch(() => {});
    getStorePrices().then(setStorePrices).catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  // Price comes from the server's plan list; on iOS / Android it must be the store's (localised) price.
  const serverPlan = config?.plans?.find((p) => p.id === 'monthly');
  const monthlyPrice = storePrices?.monthly || `$${(serverPlan?.price ?? 4.99).toFixed(2)}`;
  const showDevSwitch = Boolean(config?.simulated) && !config?.web?.stripe && !isNativeApp;
  const paidBy = isNativeApp
    ? (/android/i.test(navigator.userAgent) ? 'Google Play' : 'the App Store')
    : config?.web?.stripe ? 'Stripe' : 'the test checkout (no real charge)';

  const runAction = async (fn) => {
    setIsProcessing(true);
    setUpgradeError('');
    setInfoMessage('');
    try {
      await fn();
    } catch (err) {
      if (err?.code === 'sign_in_required') {
        onRequireSignIn();
      } else if (err?.code === 'cancelled') {
        // The person closed the store sheet; nothing to report.
      } else if (err?.code === 'already_owned') {
        setInfoMessage('You already have this plan.');
      } else {
        setUpgradeError(
          err?.status === 501
            ? 'Purchases are not available yet. Please check back soon.'
            : (err?.message || 'Something went wrong. Please try again.')
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpgrade = (planToUse = selectedPlan) => runAction(async () => {
    const result = await purchasePlan(planToUse);
    if (result?.redirecting) {
      setIsRedirecting(true); // leaving for Stripe Checkout
      return;
    }
    if (!result?.isPro) throw new Error('We could not confirm the purchase. If you were charged, tap Restore purchases.');
    setSuccessToast(true);
    if (onSubscriptionChange) onSubscriptionChange(result);
    setTimeout(() => {
      setSuccessToast(false);
      onClose();
    }, 1200);
  });

  const handleRestore = () => runAction(async () => {
    const result = await restorePurchases();
    if (onSubscriptionChange) onSubscriptionChange(result);
    setInfoMessage(result?.isPro ? 'Purchases restored. Learner PRO is active.' : 'No purchases found for this account.');
  });

  const handleManage = () => runAction(() => manageSubscription(subscription));

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
      pro: 'Every practice spot unlocked',
      highlight: highlightFeature === 'grounds'
    },
    {
      feature: 'Quiet-Hours Guide',
      free: 'Basic traffic status',
      pro: 'Suggested Quiet Practice Times (Estimated)',
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
      pro: 'Printable 50-Hour Practice Log Worksheet (PDF)',
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
          aria-label="Close"
          title="Close"
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-500 dark:text-zinc-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Gold Gradient Banner */}
        <div className="p-6 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-wider text-white">
              Learner PRO
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Practice smarter for your road test.
          </h2>
          <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-md">
            Unlock unlimited empty parking grounds, interactive examiner audio tests, virtual cones, and the printable 50-hour practice log.
          </p>
        </div>

        {/* Plan Selector */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="p-3.5 rounded-2xl border-2 border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 shadow-md flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">Learner PRO Monthly</span>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Everything below. Renews monthly, cancel anytime.
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{monthlyPrice}</span>
              <span className="text-[11px] text-zinc-400 ml-1 font-medium">/ month</span>
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
            {isPro ? (
              <div className="space-y-2">
                <p className="text-sm font-black text-center text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Learner PRO is active
                  {subscription?.tier === 'monthly' && subscription?.expiresAt && (
                    <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                      · {subscription.willRenew ? 'renews' : 'ends'} {new Date(subscription.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </p>
                {subscription?.manageVia && (
                  <button
                    onClick={handleManage}
                    disabled={isProcessing}
                    className="w-full py-3 rounded-2xl bg-black/5 dark:bg-white/10 text-sm font-bold text-zinc-800 dark:text-zinc-100 disabled:opacity-50"
                  >
                    Manage or cancel plan
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => handleUpgrade(selectedPlan)}
                disabled={isProcessing || isRedirecting}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:opacity-95 text-white font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isRedirecting ? (
                  <span>Opening secure checkout…</span>
                ) : isProcessing ? (
                  <span>Processing…</span>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white" />
                    <span>
                      {`Subscribe · ${monthlyPrice}/month`}
                    </span>
                  </>
                )}
              </button>
            )}

            {upgradeError && (
              <p role="alert" className="text-xs font-semibold text-center text-red-600 dark:text-red-400 bg-red-500/10 rounded-xl px-3 py-2">
                {upgradeError}
              </p>
            )}
            {infoMessage && (
              <p role="status" className="text-xs font-semibold text-center text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 rounded-xl px-3 py-2">
                {infoMessage}
              </p>
            )}

            {/* Required purchase disclosures (App Store 3.1.2 / Google Play subscriptions policy) */}
            {!isPro && (
              <p className="text-[10px] leading-snug text-zinc-500 dark:text-zinc-400 text-center">
                {`Learner PRO Monthly: ${monthlyPrice} charged each month through ${paidBy}. It renews automatically until you cancel, at least 24 hours before the renewal date. Cancel any time in your ${isNativeApp ? 'store account settings' : 'account'}.`}
              </p>
            )}
          </div>

          {/* Restore, legal links and payment note */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/5 dark:border-white/5 text-[11px] text-zinc-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Secure payment by {paidBy}
            </span>

            <div className="flex items-center gap-3">
              <button onClick={handleRestore} disabled={isProcessing} className="font-bold text-apple-blue hover:underline disabled:opacity-50">
                Restore purchases
              </button>
              {TERMS_URL && (
                <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="hover:underline">Terms</a>
              )}
              {PRIVACY_URL && (
                <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="hover:underline">Privacy</a>
              )}
            </div>
          </div>

          {/* Development only: simulated checkout (never shown when real payments are configured) */}
          {showDevSwitch && (
            <div className="flex items-center justify-end gap-2 text-[10px] text-zinc-400 font-mono">
              <span>Dev only:</span>
              {isPro ? (
                <button onClick={handleDowngrade} className="font-bold text-rose-500 hover:underline">
                  Reset simulated plan
                </button>
              ) : (
                <button onClick={() => handleUpgrade('monthly')} className="font-bold text-emerald-600 hover:underline">
                  Simulate purchase
                </button>
              )}
            </div>
          )}

        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="absolute inset-0 bg-emerald-600/95 flex flex-col items-center justify-center text-white p-6 z-20 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-2xl mb-3 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black">Learner PRO Activated!</h3>
            <p className="text-xs text-white/90 mt-1">
              Every practice spot, custom cones, the practice road test and the printable practice log are unlocked.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
