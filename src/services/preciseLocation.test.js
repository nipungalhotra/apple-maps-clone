import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getPreciseLocation, formatAccuracy, isRoughFix, accuracyCircle, betterFix, LocationError
} from './preciseLocation';
import { distanceMeters } from './learnerEngine';

const GANGANAGAR = { lat: 29.9038, lng: 73.8772 };

// A fake GPS: `script` is a list of [delayMs, accuracyM] fixes or [delayMs, { error }].
function fakeGps(script) {
  const cleared = [];
  const geolocation = {
    watchPosition: vi.fn((onFix, onError) => {
      script.forEach(([delay, value]) => {
        setTimeout(() => {
          if (value && typeof value === 'object') onError(value.error);
          else onFix({ coords: { latitude: GANGANAGAR.lat + value * 1e-6, longitude: GANGANAGAR.lng, accuracy: value } });
        }, delay);
      });
      return 42;
    }),
    clearWatch: vi.fn((id) => cleared.push(id))
  };
  vi.stubGlobal('navigator', { geolocation });
  return { geolocation, cleared };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('precise location', () => {
  it('keeps watching until a fix is within the target, then stops the GPS', async () => {
    const { geolocation, cleared } = fakeGps([[100, 300], [1500, 60], [3000, 12], [4000, 5]]);
    const progress = [];
    const promise = getPreciseLocation({ targetAccuracyM: 20, maxWaitMs: 10000, onProgress: (f) => progress.push(f.accuracy) });
    await vi.advanceTimersByTimeAsync(3100);
    const fix = await promise;
    expect(fix.accuracy).toBe(12);
    expect(fix.coordinates[0]).toBe(GANGANAGAR.lng);
    expect(progress).toEqual([300, 60, 12]);
    expect(geolocation.watchPosition.mock.calls[0][2]).toMatchObject({ enableHighAccuracy: true, maximumAge: 0 });
    expect(cleared).toEqual([42]);
  });

  it('ignores fixes that are less exact than one already seen', async () => {
    fakeGps([[100, 40], [200, 400], [300, 15]]);
    const progress = [];
    const promise = getPreciseLocation({ onProgress: (f) => progress.push(f.accuracy) });
    await vi.advanceTimersByTimeAsync(400);
    expect((await promise).accuracy).toBe(15);
    expect(progress).toEqual([40, 15]);
  });

  it('returns the best fix seen when time runs out', async () => {
    fakeGps([[100, 900], [2000, 80]]);
    const promise = getPreciseLocation({ targetAccuracyM: 20, maxWaitMs: 5000 });
    await vi.advanceTimersByTimeAsync(5100);
    expect((await promise).accuracy).toBe(80);
  });

  it('explains when no fix arrives at all', async () => {
    fakeGps([]);
    const promise = getPreciseLocation({ maxWaitMs: 3000 });
    const check = expect(promise).rejects.toMatchObject({ code: 'timeout' });
    await vi.advanceTimersByTimeAsync(3100);
    await check;
  });

  it('stops straight away when location permission is denied', async () => {
    fakeGps([[50, { error: { code: 1, message: 'User denied Geolocation' } }]]);
    const promise = getPreciseLocation({ maxWaitMs: 10000 });
    const check = expect(promise).rejects.toBeInstanceOf(LocationError);
    await vi.advanceTimersByTimeAsync(100);
    await check;
    await expect(promise).rejects.toMatchObject({ code: 'denied' });
  });

  it('is clear when the device has no location support', async () => {
    vi.stubGlobal('navigator', {});
    await expect(getPreciseLocation()).rejects.toMatchObject({ code: 'unsupported' });
  });
});

describe('accuracy helpers', () => {
  it('formats accuracy for people', () => {
    expect(formatAccuracy(8.4)).toBe('±8 m');
    expect(formatAccuracy(0.3)).toBe('±1 m');
    expect(formatAccuracy(1500)).toBe('±1.5 km');
    expect(formatAccuracy(null)).toBe('');
  });

  it('flags fixes too rough to place a spot', () => {
    expect(isRoughFix(12)).toBe(false);
    expect(isRoughFix(120)).toBe(true);
    expect(isRoughFix(undefined)).toBe(true);
  });

  it('prefers the more exact fix', () => {
    expect(betterFix({ accuracy: 30 }, { accuracy: 10 }).accuracy).toBe(10);
    expect(betterFix({ accuracy: 10 }, { accuracy: null }).accuracy).toBe(10);
    expect(betterFix(null, { accuracy: 50 }).accuracy).toBe(50);
  });

  it('draws the accuracy circle at the right radius', () => {
    const center = [GANGANAGAR.lng, GANGANAGAR.lat];
    const circle = accuracyCircle(center, 20);
    const ring = circle.features[0].geometry.coordinates[0];
    expect(ring[0]).toEqual(ring.at(-1));
    for (const point of ring) expect(distanceMeters(center, point)).toBeCloseTo(20, 0);
    expect(accuracyCircle(center, null).features).toEqual([]);
  });
});
