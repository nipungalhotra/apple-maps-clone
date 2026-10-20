// Subscription & B2C Revenue Engine Service
// Handles Free vs Learner PRO tier capabilities, state persistence, and mock payment gateway

const STORAGE_KEY = 'apple_maps_learner_subscription';

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

export const upgradeToPro = async (tier = 'lifetime') => {
  const price = tier === 'lifetime' ? 29.99 : 4.99;
  const now = new Date();
  const newState = {
    isPro: true,
    tier,
    price,
    unlockedAt: now.toISOString(),
    expiresAt: tier === 'monthly' 
      ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() 
      : null
  };

  saveSubscriptionState(newState);

  // Sync with backend API
  try {
    await fetch('/api/subscription/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newState)
    });
  } catch (err) {
    console.warn('Backend sync failed, saved locally', err);
  }

  return newState;
};

export const downgradeToFree = async () => {
  const newState = { ...DEFAULT_STATE };
  saveSubscriptionState(newState);

  try {
    await fetch('/api/subscription/reset', {
      method: 'POST'
    });
  } catch (err) {
    console.warn('Backend reset failed', err);
  }

  return newState;
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
