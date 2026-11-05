import { apiUrl, getClientId } from './apiConfig';
import { getAccessToken } from './authService';

/**
 * First-party analytics: a handful of events sent to our own API (no third-party trackers).
 * Respects Do Not Track and Global Privacy Control: nothing is sent when either is on.
 * Failures are ignored; analytics never blocks or breaks the app.
 */
const SESSION_KEY = 'roadready_session_id';
const OPENED_KEY = 'roadready_app_open_sent';

function trackingAllowed() {
  if (typeof navigator === 'undefined') return false;
  if (navigator.globalPrivacyControl === true) return false;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return false;
  return true;
}

function sessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)).replace(/-/g, '').slice(0, 24);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

function deviceType() {
  const w = window.innerWidth || 1024;
  if (/Mobi|Android|iPhone/i.test(navigator.userAgent) || w < 640) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

async function send(event) {
  if (!trackingAllowed()) return;
  try {
    const token = await getAccessToken();
    await fetch(apiUrl('/api/events'), {
      method: 'POST',
      keepalive: true, // still delivered if the page is navigating away (e.g. to checkout)
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': getClientId(),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        ...event,
        path: window.location.pathname,
        sessionId: sessionId(),
        device: deviceType()
      })
    });
  } catch {
    // ignore
  }
}

/** Events the server accepts: paywall_view {feature}, checkout_start {plan}, signup_view {source}. */
export function track(name, props = {}) {
  return send({ name, props });
}

/** Once per browser session: records the visit and where it came from (UTM tags or referrer). */
export function trackAppOpen() {
  if (!trackingAllowed()) return Promise.resolve();
  try {
    if (sessionStorage.getItem(OPENED_KEY)) return Promise.resolve();
    sessionStorage.setItem(OPENED_KEY, '1');
  } catch {
    // no sessionStorage: send anyway
  }
  const params = new URLSearchParams(window.location.search);
  return send({
    name: 'app_open',
    referrer: document.referrer || undefined,
    utm: {
      source: params.get('utm_source') || params.get('ref') || undefined,
      medium: params.get('utm_medium') || undefined,
      campaign: params.get('utm_campaign') || undefined
    }
  });
}
