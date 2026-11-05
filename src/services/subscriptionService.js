// Subscription & B2C Revenue Engine Service
// Handles Free vs Learner PRO tier capabilities, state persistence, and mock payment gateway

import { apiFetch } from './apiConfig';

const STORAGE_KEY = 'roadready_subscription_cache';

export const PRO_FEATURES = {
  UNLIMITED_GROUNDS: 'unlimited_grounds',
  ALL_CONE_PRESETS: 'all_cone_presets',
  CUSTOM_CONES: 'custom_cones',
  DMV_VOICE_EXAMINER: 'dmv_voice_examiner',
  PRINTABLE_DMV_PDF: 'printable_dmv_pdf',
  DYNAMIC_BRAKING_HUD: 'dynamic_braking_hud',
  LIVE_TRAFFIC_METRICS: 'live_traffic_metrics'
};

const DEFAULT_STATE = {
  isPro: false,
  tier: 'free', // 'free' | 'monthly' | 'lifetime'
  price: 0,
  unlockedAt: null,
  expiresAt: null
};

export const getSubscriptionState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.isPro !== 'boolean') return DEFAULT_STATE;
    // Expired monthly plans fall back to free.
    if (parsed.expiresAt && Date.parse(parsed.expiresAt) < Date.now()) return DEFAULT_STATE;
    return parsed;
  } catch {
    return DEFAULT_STATE;
  }
};

export const saveSubscriptionState = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save subscription state', e);
  }
};

// Pro is granted only after the server confirms the purchase.
// NOTE: the server currently runs a SIMULATED checkout (dev only, or when
// ALLOW_SIMULATED_PAYMENTS=true). Production returns 501 until a real payment
// provider (Stripe on web, StoreKit / Play Billing on mobile) is integrated.
export const upgradeToPro = async (tier = 'monthly') => {
  const data = await apiFetch('/api/subscription/upgrade', { method: 'POST', body: { tier } });
  const sub = data?.subscription;
  if (!sub?.isPro) {
    throw new Error('Upgrade was not confirmed by the server');
  }
  saveSubscriptionState(sub);
  return sub;
};

export const downgradeToFree = async () => {
  const newState = { ...DEFAULT_STATE };
  saveSubscriptionState(newState);
  try {
    await apiFetch('/api/subscription/reset', { method: 'POST', body: {} });
  } catch (err) {
    console.warn('Backend reset failed', err);
  }
  return newState;
};

// Re-sync local cache with the server's record for the current account (or guest device).
export const refreshSubscriptionState = async () => {
  try {
    const sub = await apiFetch('/api/subscription');
    if (sub && typeof sub.isPro === 'boolean') {
      saveSubscriptionState(sub);
      return sub;
    }
  } catch {
    // keep cached state when offline
  }
  return getSubscriptionState();
};

// Forget the cached plan (e.g. on sign-out) so the next account starts clean.
export const clearSubscriptionCache = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return { ...DEFAULT_STATE };
};

// Access Control Helpers
export const canAccessZone = (index, isPro) => {
  // Free tier has access to first 2 nearest safe zones (index 0 and 1)
  return isPro || index < 2;
};

export const canAccessConePreset = (presetId, isPro) => {
  // Free tier gets Slalom; Parallel, Bay, Fig-8 require Pro
  if (presetId === 'slalom') return true;
  return isPro;
};

export const canDropCustomCone = (isPro) => isPro;

export const canExecuteDmvTestDrive = (isPro) => isPro;

export const canDownloadDmvPdf = (isPro) => isPro;

export const canAccessDynamicBrakingHud = (isPro) => isPro;
