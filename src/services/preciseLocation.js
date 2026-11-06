import { Capacitor } from '@capacitor/core';
import { offsetPoint } from './routingService';

/**
 * Precise location: watches GPS fixes for a few seconds and keeps the most accurate one.
 *
 * Phones give a rough position first (Wi-Fi / cell towers) and sharpen it as satellites lock
 * on, so taking the very first fix often means 50-500 m of error. Waiting a few seconds for a
 * fix within `targetAccuracyM` usually gets 5-20 m outdoors.
 *
 * - iOS / Android app: the native GPS through @capacitor/geolocation (asks permission).
 * - Browser: navigator.geolocation with high accuracy and no cached positions.
 */

export const DEFAULT_TARGET_ACCURACY_M = 20;
export const DEFAULT_MAX_WAIT_MS = 10000;

export class LocationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LocationError';
    this.code = code; // 'denied' | 'unavailable' | 'timeout' | 'unsupported'
  }
}

const MESSAGES = {
  denied: 'Location access is off. Allow location for RoadReady in your phone or browser settings, or use “Tap on map”.',
  unavailable: 'Your location couldn’t be found. Go outdoors or turn on GPS, then try again.',
  timeout: 'Getting your location took too long. Try again outdoors, or use “Tap on map”.',
  unsupported: 'This device can’t share its location. Use “Tap on map” instead.'
};

const toFix = (coords) => ({
  coordinates: [coords.longitude, coords.latitude],
  accuracy: Number.isFinite(coords.accuracy) ? coords.accuracy : null
});

/** Lower accuracy number = better. A fix without an accuracy counts as worst. */
export function betterFix(a, b) {
  if (!a) return b;
  if (!b) return a;
  const aa = a.accuracy ?? Infinity;
  const bb = b.accuracy ?? Infinity;
  return bb < aa ? b : a;
}

function errorFromCode(err) {
  const code = err?.code;
  const msg = String(err?.message || '');
  if (code === 1 || /denied|permission/i.test(msg)) return 'denied';
  if (code === 3 || /timeout/i.test(msg)) return 'timeout';
  return 'unavailable';
}

/** Starts a position watch; returns a function that stops it. */
async function startWatch(onFix, onError) {
  if (Capacitor.isNativePlatform()) {
    const { Geolocation } = await import('@capacitor/geolocation');
    let perm = await Geolocation.checkPermissions();
    if (perm.location !== 'granted') perm = await Geolocation.requestPermissions({ permissions: ['location'] });
    if (perm.location !== 'granted') throw new LocationError('denied', MESSAGES.denied);
    const id = await Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }, (pos, err) => {
      if (err) onError(err);
      else if (pos?.coords) onFix(toFix(pos.coords));
    });
    return () => Geolocation.clearWatch({ id });
  }
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new LocationError('unsupported', MESSAGES.unsupported);
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => onFix(toFix(pos.coords)),
    onError,
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
  return () => navigator.geolocation.clearWatch(id);
}

/**
 * Resolves with the best fix `{ coordinates: [lng, lat], accuracy }` once one is within
 * `targetAccuracyM`, or with the best fix seen when `maxWaitMs` runs out.
 * Rejects with a LocationError when no fix arrives at all.
 * `onProgress(fix)` is called each time a more accurate fix arrives.
 */
export function getPreciseLocation({
  targetAccuracyM = DEFAULT_TARGET_ACCURACY_M,
  maxWaitMs = DEFAULT_MAX_WAIT_MS,
  onProgress = () => {}
} = {}) {
  return new Promise((resolve, reject) => {
    let best = null;
    let stop = () => {};
    let done = false;
    let timer = null;

    const finish = (fn) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { stop(); } catch { /* ignore */ }
      fn();
    };

    const onFix = (fix) => {
      const next = betterFix(best, fix);
      if (next !== best) {
        best = next;
        onProgress(best);
      }
      if (best.accuracy !== null && best.accuracy <= targetAccuracyM) finish(() => resolve(best));
    };

    const onError = (err) => {
      const code = errorFromCode(err);
      // A denial is final; other errors only matter if no fix ever arrives.
      if (code === 'denied') finish(() => reject(new LocationError('denied', MESSAGES.denied)));
    };

    timer = setTimeout(() => {
      finish(() => (best ? resolve(best) : reject(new LocationError('timeout', MESSAGES.timeout))));
    }, maxWaitMs);

    startWatch(onFix, onError)
      .then((stopFn) => {
        stop = stopFn;
        if (done) stopFn(); // finished before the watch started
      })
      .catch((err) => finish(() => reject(err instanceof LocationError ? err : new LocationError(errorFromCode(err), MESSAGES[errorFromCode(err)]))));
  });
}

/** "±8 m" / "±1.2 km" for showing how exact a fix is. */
export function formatAccuracy(accuracy) {
  if (!Number.isFinite(accuracy)) return '';
  if (accuracy < 1000) return `±${Math.max(1, Math.round(accuracy))} m`;
  return `±${(accuracy / 1000).toFixed(1)} km`;
}

/** True when a fix is too rough to place a practice spot by itself. */
export const isRoughFix = (accuracy) => !Number.isFinite(accuracy) || accuracy > 50;

/** GeoJSON polygon approximating a circle of `radiusM` metres around `[lng, lat]` (for the map). */
export function accuracyCircle(center, radiusM, steps = 48) {
  if (!Array.isArray(center) || !Number.isFinite(radiusM) || radiusM <= 0) {
    return { type: 'FeatureCollection', features: [] };
  }
  const ring = Array.from({ length: steps + 1 }, (_, i) => offsetPoint(center, radiusM, (i / steps) * 360));
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }] };
}
