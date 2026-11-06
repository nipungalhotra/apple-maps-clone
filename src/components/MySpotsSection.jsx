import React, { useEffect, useState } from 'react';
import { MapPin, Locate, MousePointerClick, Trash2, Route, Navigation, X } from 'lucide-react';
import { distanceMeters, isDefaultLocation } from '../services/learnerEngine';
import { formatDistance } from '../services/routingService';
import { MY_SPOTS_LIMIT } from '../services/mySpots';
import { formatAccuracy, isRoughFix } from '../services/preciseLocation';

/**
 * "My practice spots" — lets a learner anywhere mark their own practice places
 * (school ground, empty lot they may use) and use them for cones, a practice loop
 * and directions. Always free.
 */
export default function MySpotsSection({
  spots = [],
  userLocation,
  selectedZoneId,
  pendingSpot,            // { coordinates, source } waiting for a name, or null
  isPickingSpot,
  onStartPickOnMap,
  onCancelPick,
  onUseMyLocation,        // asks for location (if needed) and makes it the pending spot
  onSaveSpot,             // (name) => void
  onSelectSpot,           // (spot) => void
  onDeleteSpot,           // (id) => void
  onPracticeLoop,         // (spot) => void
  onNavigateToSpot,       // (spot) => void
  loopLoadingId,
  locating = null          // { accuracy } while a precise GPS fix is being taken
}) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (pendingSpot) setName(`My spot ${spots.length + 1}`);
  }, [pendingSpot, spots.length]);

  const full = spots.length >= MY_SPOTS_LIMIT;
  const distanceTo = (spot) =>
    isDefaultLocation(userLocation) ? null : formatDistance(distanceMeters(userLocation, spot.coordinates));

  return (
    <div className="p-3 rounded-2xl bg-white/70 dark:bg-zinc-800/70 border border-black/5 dark:border-white/10 space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-apple-blue" /> My practice spots
        </h4>
        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
          Free
        </span>
      </div>

      {spots.length === 0 && !pendingSpot && !isPickingSpot && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
          Mark an empty ground or lot you&rsquo;re allowed to use. Then place cones there, get a practice loop on nearby
          roads, or directions.
        </p>
      )}

      {/* Add a spot */}
      {locating && (
        <p role="status" className="flex items-center gap-2 p-2 rounded-xl bg-apple-blue/10 text-[11px] font-semibold text-apple-blue">
          <span className="w-2 h-2 rounded-full bg-apple-blue animate-pulse" aria-hidden="true" />
          Getting a precise GPS fix{locating.accuracy ? ` \u2026 ${formatAccuracy(locating.accuracy)}` : '\u2026'}
        </p>
      )}

      {!pendingSpot && !isPickingSpot && !full && !locating && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onUseMyLocation}
            className="py-2 rounded-xl bg-apple-blue text-white text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <Locate className="w-3.5 h-3.5" /> Use my location
          </button>
          <button
            onClick={onStartPickOnMap}
            className="py-2 rounded-xl bg-black/5 dark:bg-white/10 text-zinc-800 dark:text-zinc-100 text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <MousePointerClick className="w-3.5 h-3.5" /> Tap on map
          </button>
        </div>
      )}
      {full && !pendingSpot && (
        <p className="text-[11px] text-zinc-500">You&rsquo;ve saved the maximum of {MY_SPOTS_LIMIT} spots. Delete one to add another.</p>
      )}

      {isPickingSpot && (
        <div role="status" className="flex items-center justify-between gap-2 p-2 rounded-xl bg-apple-blue/10 text-[11px] font-semibold text-apple-blue">
          <span>Tap the map where you want to practise.</span>
          <button onClick={onCancelPick} aria-label="Cancel" className="p-1 rounded-full hover:bg-apple-blue/10">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {pendingSpot && (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSaveSpot(name);
          }}
        >
          <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
            Name this spot
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              autoFocus
              className="mt-1 w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-apple-blue"
            />
          </label>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
            {pendingSpot.coordinates[1].toFixed(5)}, {pendingSpot.coordinates[0].toFixed(5)}
            {Number.isFinite(pendingSpot.accuracy) ? ` \u00b7 GPS ${formatAccuracy(pendingSpot.accuracy)}` : ''}
          </p>
          {Number.isFinite(pendingSpot.accuracy) && isRoughFix(pendingSpot.accuracy) && (
            <p role="alert" className="text-[10px] leading-snug text-amber-800 dark:text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1.5">
              Your location is only approximate ({formatAccuracy(pendingSpot.accuracy)}). For an exact spot, go outdoors and
              try again, or cancel and use &ldquo;Tap on map&rdquo;.
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">Save spot</button>
            <button type="button" onClick={onCancelPick} className="flex-1 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-bold">Cancel</button>
          </div>
        </form>
      )}

      {/* Saved spots */}
      {spots.length > 0 && (
        <ul className="space-y-1.5">
          {spots.map((spot) => {
            const selected = spot.id === selectedZoneId;
            const dist = distanceTo(spot);
            return (
              <li
                key={spot.id}
                className={`p-2.5 rounded-xl border transition-all ${
                  selected ? 'border-apple-blue/60 bg-apple-blue/10' : 'border-black/5 dark:border-white/10 bg-white/60 dark:bg-zinc-900/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => onSelectSpot(spot)} className="text-left min-w-0 flex-1">
                    <span className="block text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{spot.name}</span>
                    <span className="block text-[10px] text-zinc-500">{dist ? `${dist} away` : 'Saved on this device'}</span>
                  </button>
                  <button
                    onClick={() => onDeleteSpot(spot.id)}
                    aria-label={`Delete ${spot.name}`}
                    title="Delete spot"
                    className="p-1 rounded-full text-zinc-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mt-2">
                  <button
                    onClick={() => onSelectSpot(spot, { openCones: true })}
                    className="py-1.5 rounded-lg bg-orange-500 text-white text-[10px] font-bold"
                  >
                    ▲ Cones
                  </button>
                  <button
                    onClick={() => onPracticeLoop(spot)}
                    disabled={loopLoadingId === spot.id}
                    className="py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-60"
                  >
                    <Route className="w-3 h-3" /> {loopLoadingId === spot.id ? 'Finding…' : 'Loop'}
                  </button>
                  <button
                    onClick={() => onNavigateToSpot(spot)}
                    className="py-1.5 rounded-lg bg-black/5 dark:bg-white/10 text-zinc-800 dark:text-zinc-100 text-[10px] font-bold flex items-center justify-center gap-1"
                  >
                    <Navigation className="w-3 h-3" /> Go
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
        Only practise where it&rsquo;s allowed, with a licensed supervising driver.
      </p>
    </div>
  );
}
