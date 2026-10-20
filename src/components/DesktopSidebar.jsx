import React, { useState } from 'react';
import {
  Search, X, Navigation as NavIcon, Car, Footprints, Bike,
  Share2, Heart, Phone, Globe, Clock, Star, Compass, Utensils,
  Fuel, ShoppingBag, CircleParking, Train, ChevronRight, Play,
  ShieldCheck, MapPin, Locate
} from 'lucide-react';
import { CATEGORIES } from '../data/presetPlaces';
import { formatDistance, formatDuration } from '../services/routingService';
import LearnerModePanel from './LearnerModePanel';

export default function DesktopSidebar({
  searchQuery,
  setSearchQuery,
  searchResults,
  selectedPlace,
  setSelectedPlace,
  routeData,
  onRequestRoute,
  onStartNavigation,
  onClearRoute,
  routeMode,
  setRouteMode,
  isNavigating,
  favorites,
  onToggleFavorite,
  userLocation,
  onSelectCurrentLocation,
  selectedLearnerZone,
  setSelectedLearnerZone,
  learnerZones = [],
  activeMainTab,
  setActiveMainTab,
  // Virtual Cones props
  activeCoursePreset,
  setActiveCoursePreset,
  cones,
  onApplyPreset,
  onClearCones,
  isDroppingCustomCone,
  setIsDroppingCustomCone,
  // DMV Test props
  selectedDmvRoute,
  setSelectedDmvRoute,
  onStartDmvTestDrive,
  // Weather props
  weatherMode,
  setWeatherMode,
  // Passport props
  loggedHours,
  onAddPracticeHour,
  // B2C Pro Pass props
  isPro = false,
  onOpenPaywall
}) {
  const isFavorite = selectedPlace && favorites.some(f => f.id === selectedPlace.id);

  const getCategoryIcon = (iconName) => {
    switch (iconName) {
      case 'Utensils': return <Utensils className="w-3.5 h-3.5" />;
      case 'Fuel': return <Fuel className="w-3.5 h-3.5" />;
      case 'ShoppingBag': return <ShoppingBag className="w-3.5 h-3.5" />;
      case 'CircleParking': return <CircleParking className="w-3.5 h-3.5" />;
      case 'Train': return <Train className="w-3.5 h-3.5" />;
      default: return <Compass className="w-3.5 h-3.5" />;
    }
  };

  const handleNavigateToLearnerZone = (zone) => {
    onRequestRoute({
      name: zone.name,
      coordinates: zone.coordinates
    }, 'driving');
  };

  return (
    <aside className="absolute top-4 left-4 z-20 w-[410px] max-h-[calc(100vh-2rem)] flex flex-col apple-glass rounded-2xl shadow-apple-card overflow-hidden transition-all duration-300">
      {/* Top Header & Search Bar */}
      <div className="p-3.5 border-b border-black/5 dark:border-white/10 space-y-2.5">
        {/* Main Mode Toggle: Standard Maps vs Learner FreeSpace */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-black/5 dark:bg-white/10 rounded-xl">
          <button
            onClick={() => setActiveMainTab('explore')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeMainTab === 'explore'
                ? 'bg-white dark:bg-zinc-800 text-apple-blue shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Explore Maps
          </button>

          <button
            onClick={() => setActiveMainTab('learner')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeMainTab === 'learner'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            RoadReady 🔰
          </button>
        </div>

        {/* Search input (visible in explore mode or when not routing) */}
        {activeMainTab === 'explore' && !routeData && (
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Apple Maps"
              className="w-full pl-9 pr-8 py-2 text-sm bg-black/5 dark:bg-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-apple-blue/50 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-1 rounded-full text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Quick Category Pills */}
        {activeMainTab === 'explore' && !selectedPlace && !routeData && (
          <div className="flex gap-1.5 overflow-x-auto pt-1 pb-1 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSearchQuery(cat.label)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/70 dark:bg-zinc-800/70 hover:bg-white text-xs font-semibold whitespace-nowrap text-zinc-700 dark:text-zinc-200 border border-black/5 dark:border-white/5 transition-colors shadow-sm"
              >
                <span style={{ color: cat.color }}>{getCategoryIcon(cat.icon)}</span>
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* TAB 1: LEARNER ENGINE VIEW */}
        {activeMainTab === 'learner' && !routeData && (
          <LearnerModePanel
            userLocation={userLocation}
            selectedLearnerZone={selectedLearnerZone}
            learnerZones={learnerZones}
            onSelectZone={(zone) => setSelectedLearnerZone(zone)}
            onNavigateToZone={handleNavigateToLearnerZone}
            activeCoursePreset={activeCoursePreset}
            setActiveCoursePreset={setActiveCoursePreset}
            cones={cones}
            onApplyPreset={onApplyPreset}
            onClearCones={onClearCones}
            isDroppingCustomCone={isDroppingCustomCone}
            setIsDroppingCustomCone={setIsDroppingCustomCone}
            selectedDmvRoute={selectedDmvRoute}
            setSelectedDmvRoute={setSelectedDmvRoute}
            onStartDmvTestDrive={onStartDmvTestDrive}
            weatherMode={weatherMode}
            setWeatherMode={setWeatherMode}
            loggedHours={loggedHours}
            onAddPracticeHour={onAddPracticeHour}
            isPro={isPro}
            onOpenPaywall={onOpenPaywall}
          />
        )}

        {/* TAB 2: ROUTE DIRECTIONS VIEW */}
        {routeData && (
          <div className="space-y-3">
            <div className="p-3 bg-white/60 dark:bg-zinc-800/60 rounded-xl border border-black/5 dark:border-white/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Route Overview</span>
                <button
                  onClick={onClearRoute}
                  className="text-xs font-semibold text-apple-red hover:underline"
                >
                  Clear
                </button>
              </div>

              {/* Travel Mode Selector */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-black/5 dark:bg-white/10 rounded-lg">
                {[
                  { id: 'driving', label: 'Drive', icon: Car },
                  { id: 'walking', label: 'Walk', icon: Footprints },
                  { id: 'cycling', label: 'Cycle', icon: Bike }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setRouteMode(id);
                      if (selectedPlace) onRequestRoute(selectedPlace, id);
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      routeMode === id
                        ? 'bg-white dark:bg-zinc-700 text-apple-blue shadow-sm'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Time & Distance Summary */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-2xl font-bold text-apple-green">
                    {formatDuration(routeData.durationSeconds)}
                  </div>
                  <div className="text-xs text-zinc-500 font-medium">
                    {formatDistance(routeData.distanceMeters)} • Fastest Route
                  </div>
                </div>

                <button
                  onClick={onStartNavigation}
                  className="flex items-center gap-2 px-4 py-2.5 bg-apple-green text-white font-bold text-sm rounded-full shadow-md hover:bg-green-600 transition-all active:scale-95"
                >
                  <Play className="w-4 h-4 fill-white" />
                  GO
                </button>
              </div>
            </div>

            {/* Turn-by-Turn Steps Preview */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">
                Directions ({routeData.steps.length} steps)
              </h4>
              <div className="space-y-1">
                {routeData.steps.map((st, i) => (
                  <div
                    key={st.id}
                    className="flex items-start gap-3 p-2.5 rounded-xl bg-white/40 dark:bg-zinc-800/40 border border-black/5 dark:border-white/5 text-xs"
                  >
                    <div className="w-6 h-6 rounded-full bg-apple-blue/15 text-apple-blue flex items-center justify-center font-bold text-[10px] shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">{st.instruction}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">{formatDistance(st.distance)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SELECTED PLACE DETAILS CARD */}
        {activeMainTab === 'explore' && selectedPlace && !routeData && (
          <div className="space-y-3 animate-fadeIn">
            {selectedPlace.photos?.[0] && (
              <div className="relative h-40 -mx-3 -mt-3 overflow-hidden rounded-t-xl group">
                <img
                  src={selectedPlace.photos[0]}
                  alt={selectedPlace.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <button
                  onClick={() => setSelectedPlace(null)}
                  className="absolute top-3 right-3 p-1.5 bg-black/60 text-white rounded-full backdrop-blur-md hover:bg-black/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 leading-tight">
                {selectedPlace.name}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{selectedPlace.subtitle}</p>

              <div className="flex items-center gap-2 text-xs pt-1">
                <span className="flex items-center gap-1 font-bold text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  {selectedPlace.rating || '4.8'}
                </span>
                <span className="text-zinc-400">({selectedPlace.reviewsCount?.toLocaleString() || 120})</span>
                <span className="text-zinc-400">•</span>
                <span className="font-semibold text-apple-green">{selectedPlace.hours || 'Open'}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-4 gap-2 py-1">
              <button
                onClick={() => onRequestRoute(selectedPlace, routeMode)}
                className="col-span-2 flex items-center justify-center gap-2 py-2.5 bg-apple-blue text-white rounded-xl font-bold text-sm shadow-md hover:bg-blue-600 transition-all active:scale-95"
              >
                <NavIcon className="w-4 h-4" />
                Directions
              </button>

              <button
                onClick={() => onToggleFavorite(selectedPlace)}
                className={`flex flex-col items-center justify-center py-2 rounded-xl text-xs font-semibold border transition-all ${
                  isFavorite
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-apple-red border-apple-red/30'
                    : 'bg-white/60 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200 border-black/5 dark:border-white/5 hover:bg-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-apple-red' : ''}`} />
                <span className="text-[10px] mt-0.5">{isFavorite ? 'Saved' : 'Save'}</span>
              </button>

              <button
                onClick={() => navigator.clipboard?.writeText(window.location.href)}
                className="flex flex-col items-center justify-center py-2 rounded-xl text-xs font-semibold bg-white/60 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200 border border-black/5 dark:border-white/5 hover:bg-white"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-[10px] mt-0.5">Share</span>
              </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5 text-xs text-zinc-600 dark:text-zinc-300">
              <p className="leading-relaxed">{selectedPlace.description}</p>
            </div>
          </div>
        )}

        {/* TAB 4: SEARCH RESULTS */}
        {activeMainTab === 'explore' && !selectedPlace && !routeData && (
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1 mb-2">
              {searchQuery ? 'Search Results' : 'Suggested Places'}
            </h3>

            {/* Current Location Quick Action */}
            <div
              onClick={() => {
                if (onSelectCurrentLocation) onSelectCurrentLocation();
              }}
              className="flex items-center justify-between p-2.5 rounded-xl bg-apple-blue/10 dark:bg-apple-blue/20 hover:bg-apple-blue/20 dark:hover:bg-apple-blue/30 cursor-pointer transition-colors group border border-apple-blue/20 mb-2"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-apple-blue text-white flex items-center justify-center font-bold shadow-sm">
                  <Locate className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-apple-blue dark:text-blue-400">
                    Current Location
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    GPS • Lat {userLocation[1].toFixed(3)}°, Lng {userLocation[0].toFixed(3)}°
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-apple-blue bg-white dark:bg-zinc-800 px-2.5 py-1 rounded-full shadow-xs">
                Center Map
              </span>
            </div>

            {searchResults.map((place) => (
              <div
                key={place.id}
                onClick={() => setSelectedPlace(place)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/80 dark:hover:bg-zinc-800/80 cursor-pointer transition-colors group border border-transparent hover:border-black/5 dark:hover:border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-apple-blue/15 text-apple-blue flex items-center justify-center font-bold">
                    <NavIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-apple-blue transition-colors">
                      {place.name}
                    </h4>
                    <p className="text-xs text-zinc-400 line-clamp-1">{place.subtitle}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:translate-x-0.5 transition-transform" />
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
