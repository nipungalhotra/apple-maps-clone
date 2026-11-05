import { Capacitor } from '@capacitor/core';
import { apiFetch, ApiError } from './apiConfig';
import { accountsEnabled, getCurrentUser } from './authService';
import { upgradeToPro, saveSubscriptionState, refreshSubscriptionState } from './subscriptionService';

/**
 * How the app takes payment:
 *   - iOS / Android app: in-app purchase through RevenueCat (required by Apple and Google).
 *   - Web: Stripe Checkout (hosted by Stripe; card details never touch our servers).
 *   - Development: the simulated checkout, when the server allows it.
 */
export const isNativeApp = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform();
const REVENUECAT_KEY =
  platform === 'ios' ? import.meta.env.VITE_REVENUECAT_IOS_KEY :
  platform === 'android' ? import.meta.env.VITE_REVENUECAT_ANDROID_KEY : '';

// RevenueCat package types for each plan (set the matching packages in the RevenueCat dashboard).
const PACKAGE_TYPE = { lifetime: 'LIFETIME', monthly: 'MONTHLY' };

export const TERMS_URL = import.meta.env.VITE_TERMS_URL || '';
export const PRIVACY_URL = import.meta.env.VITE_PRIVACY_URL || '';

function codedError(message, code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

let configPromise = null;
export function getPaymentsConfig() {
  configPromise ||= apiFetch('/api/payments/config').catch((err) => {
    configPromise = null;
    throw err;
  });
  return configPromise;
}

// ---------- RevenueCat (native only; loaded lazily so the web bundle stays small) ----------

let purchasesModule = null;
let configuredFor = undefined; // app user id RevenueCat is configured with

async function purchases() {
  if (!isNativeApp || !REVENUECAT_KEY) return null;
  purchasesModule ||= (await import('@revenuecat/purchases-capacitor')).Purchases;
  return purchasesModule;
}

/** Keep RevenueCat's customer in step with the signed-in account. Call on start, sign-in and sign-out. */
export async function syncPurchasesUser(userId) {
  const Purchases = await purchases();
  if (!Purchases) return;
  try {
    const { isConfigured } = await Purchases.isConfigured();
    if (!isConfigured) {
      await Purchases.configure({ apiKey: REVENUECAT_KEY, appUserID: userId || undefined });
    } else if (userId && configuredFor !== userId) {
      await Purchases.logIn({ appUserID: userId });
    } else if (!userId && configuredFor) {
      await Purchases.logOut();
    }
    configuredFor = userId || null;
  } catch (err) {
    console.warn('[payments] RevenueCat setup failed', err);
  }
}

async function findPackage(plan) {
  const Purchases = await purchases();
  if (!Purchases) return null;
  const offerings = await Purchases.getOfferings();
  return offerings?.current?.availablePackages?.find((p) => p.packageType === PACKAGE_TYPE[plan]) || null;
}

/** Store-localised prices for the paywall on iOS / Android, e.g. { lifetime: '£24.99', monthly: '£3.99' }. */
export async function getStorePrices() {
  if (!isNativeApp) return null;
  try {
    const [lifetime, monthly] = await Promise.all([findPackage('lifetime'), findPackage('monthly')]);
    if (!lifetime && !monthly) return null;
    return { lifetime: lifetime?.product?.priceString, monthly: monthly?.product?.priceString };
  } catch {
    return null;
  }
}

async function syncWithServer() {
  const { subscription } = await apiFetch('/api/payments/revenuecat/sync', { method: 'POST', body: {}, timeoutMs: 20000 });
  saveSubscriptionState(subscription);
  return subscription;
}

// ---------- Public actions ----------

/**
 * Buy a plan. Resolves with the new subscription, or with { redirecting: true }
 * when the browser is being sent to Stripe Checkout.
 */
export async function purchasePlan(plan) {
  if (accountsEnabled && !(await getCurrentUser())) {
    throw codedError('Sign in to upgrade', 'sign_in_required');
  }

  if (isNativeApp) {
    const Purchases = await purchases();
    if (!Purchases) throw codedError('In-app purchases are not set up in this build yet.', 'unavailable');
    const pkg = await findPackage(plan);
    if (!pkg) throw codedError('This plan is not available in the store right now.', 'unavailable');
    try {
      await Purchases.purchasePackage({ aPackage: pkg });
    } catch (err) {
      if (err?.userCancelled || err?.code === '1' || /cancel/i.test(err?.message || '')) {
        throw codedError('Purchase cancelled', 'cancelled');
      }
      throw err;
    }
    // The store has charged; now the server confirms it with RevenueCat.
    return syncWithServer();
  }

  const config = await getPaymentsConfig();
  if (config.web?.stripe) {
    const { url } = await apiFetch('/api/payments/stripe/checkout', { method: 'POST', body: { plan }, timeoutMs: 20000 });
    window.location.assign(url);
    return { redirecting: true };
  }
  if (config.simulated) {
    return upgradeToPro(plan);
  }
  throw codedError('Purchases are not available yet. Please check back soon.', 'unavailable');
}

/** "Restore purchases": required by Apple. On the web, purchases live in the account. */
export async function restorePurchases() {
  if (isNativeApp) {
    const Purchases = await purchases();
    if (!Purchases) throw codedError('In-app purchases are not set up in this build yet.', 'unavailable');
    await Purchases.restorePurchases();
    return syncWithServer();
  }
  return refreshSubscriptionState();
}

/** Opens where the person manages or cancels their plan. */
export async function manageSubscription(subscription) {
  if (subscription?.manageVia === 'web') {
    if (isNativeApp) {
      throw codedError('This plan was bought on the RoadReady website. Manage it there.', 'manage_on_web');
    }
    const { url } = await apiFetch('/api/payments/stripe/portal', { method: 'POST', body: {} });
    window.location.assign(url);
    return;
  }
  if (subscription?.manageVia === 'store') {
    const Purchases = await purchases();
    if (Purchases) {
      const { customerInfo } = await Purchases.getCustomerInfo();
      if (customerInfo?.managementURL) {
        window.open(customerInfo.managementURL, '_blank');
        return;
      }
    }
    throw codedError(
      subscription.store === 'play_store'
        ? 'Manage this plan in Google Play → Payments & subscriptions.'
        : 'Manage this plan in Settings → your name → Subscriptions on your iPhone.',
      'manage_in_store'
    );
  }
  throw codedError('There is nothing to manage for this plan.', 'nothing_to_manage');
}

/**
 * After Stripe Checkout the browser comes back with ?checkout=success&session_id=...
 * Confirm it right away (the webhook may be a few seconds behind) and clean up the URL.
 * Returns { status: 'success' | 'cancelled', subscription? } or null when not returning from checkout.
 */
export async function handleCheckoutReturn() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const status = params.get('checkout');
  if (!status) return null;
  const sessionId = params.get('session_id');

  params.delete('checkout');
  params.delete('session_id');
  const rest = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${rest ? `?${rest}` : ''}${window.location.hash}`);

  if (status !== 'success' || !sessionId) return { status: 'cancelled' };
  try {
    const { subscription } = await apiFetch('/api/payments/stripe/confirm', {
      method: 'POST', body: { sessionId }, timeoutMs: 20000
    });
    saveSubscriptionState(subscription);
    return { status: 'success', subscription };
  } catch (err) {
    // Payment may still be processing; the webhook will grant access shortly.
    if (err instanceof ApiError) console.warn('[payments] confirm failed', err.message);
    return { status: 'pending' };
  }
}
