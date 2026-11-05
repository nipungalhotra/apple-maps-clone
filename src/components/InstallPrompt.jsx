import React, { useEffect, useState } from 'react';
import { X, Share, PlusSquare, Download } from 'lucide-react';
import { track } from '../services/analytics';

/**
 * "Add RoadReady to your home screen".
 * - Android / desktop Chrome & Edge: uses the browser's install prompt (beforeinstallprompt).
 * - iPhone / iPad Safari: no install API exists, so it shows the Share → Add to Home Screen steps.
 * Shown once the person has used the app for a bit, never over another dialog, never when
 * already installed, and "Not now" is remembered for two weeks.
 */
const DISMISS_KEY = 'roadready_install_dismissed_at';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
const SHOW_AFTER_MS = 25_000;

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIosSafari() {
  const ua = window.navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua); // only Safari can add to the home screen on iOS
  return iOS && !otherBrowser;
}

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

export default function InstallPrompt({ suppressed = false }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [mode, setMode] = useState(null); // 'native' | 'ios' | null
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed() || window.Capacitor?.isNativePlatform?.()) return undefined;

    const onBeforeInstall = (e) => {
      e.preventDefault(); // show our own, better-timed prompt instead of the browser's mini-bar
      setDeferredPrompt(e);
      setMode('native');
    };
    const onInstalled = () => {
      setMode(null);
      track('install_prompt', { result: 'installed' });
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    if (isIosSafari()) setMode('ios');

    const timer = setTimeout(() => setReady(true), SHOW_AFTER_MS);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const visible = ready && !suppressed && mode !== null;

  useEffect(() => {
    if (visible) track('install_prompt', { result: mode === 'ios' ? 'ios_shown' : 'shown' });
  }, [visible, mode]);

  if (!visible) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    track('install_prompt', { result: 'dismissed' });
    setMode(null);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice.catch(() => ({ outcome: 'dismissed' }));
    track('install_prompt', { result: outcome === 'accepted' ? 'accepted' : 'declined' });
    setDeferredPrompt(null);
    setMode(null);
  };

  return (
    <div
      role="dialog"
      aria-label="Add RoadReady to your home screen"
      className="fixed z-40 left-1/2 -translate-x-1/2 top-16 w-[calc(100%-32px)] max-w-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 p-3.5 animate-slideDown"
    >
      <div className="flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" width="40" height="40" className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black">Add RoadReady to your home screen</p>
          {mode === 'ios' ? (
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 leading-snug">
              Tap <Share className="inline w-3.5 h-3.5 -mt-0.5" aria-label="Share" /> <strong>Share</strong>, then{' '}
              <PlusSquare className="inline w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> <strong>Add to Home Screen</strong>.
              It opens full screen, like an app.
            </p>
          ) : (
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 leading-snug">
              Open it full screen in one tap next time you practise. No app store needed.
            </p>
          )}
          <div className="flex items-center gap-2 mt-2.5">
            {mode === 'native' && (
              <button
                onClick={install}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-apple-blue text-white text-xs font-bold active:scale-95 transition-all"
              >
                <Download className="w-3.5 h-3.5" /> Install
              </button>
            )}
            <button onClick={dismiss} className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-bold">
              Not now
            </button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="Close" className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
