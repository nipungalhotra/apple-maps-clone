import React, { useState } from 'react';
import {
  Search, X, Navigation as NavIcon, Car, Footprints, Bike,
  Share2, Heart, Phone, Globe, Star, Compass, Utensils,
  Fuel, ShoppingBag, CircleParking, Train, ChevronRight, Play,
  ShieldCheck, Award, Locate
} from 'lucide-react';
import { CATEGORIES } from '../data/presetPlaces';
import { formatDistance, formatDuration } from '../services/routingService';
import LearnerModePanel from './LearnerModePanel';

export default function MobileBottomSheet({
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
  onAddPracticeHour
}) {
  const [sheetState, setSheetState] = useState(selectedPlace || routeData || selectedLearnerZone ? 'half' : 'peek');
  const isFavorite = selectedPlace && favorites.some(f => f.id === selectedPlace.id);

  const getSheetHeightClass = () => {
    switch (sheetState) {
      case 'peek': return 'h-[120px]';
      case 'half': return 'h-[50%]';
      case 'full': return 'h-[92%]';
      default: return 'h-[120px]';
    }
  };

  const cycleSheetState = () => {
    if (sheetState === 'peek') setSheetState('half');
    else if (sheetState === 'half') setSheetState('full');
    else setSheetState('peek');
  };

  const handleNavigateToLearnerZone = (zone) => {
    onRequestRoute({
      name: zone.name,
      coordinates: zone.coordinates
    }, 'driving');
  };

  return (
    <div
      className={`absolute bottom-0 inset-x-0 z-30 apple-glass rounded-t-[28px] shadow-2xl transition-all duration-300 flex flex-col ${getSheetHeightClass()} overflow-hidden`}
    >
      {/* Draggable Notch Handle */}
      <div
        onClick={cycleSheetState}
        className="w-full flex flex-col items-center pt-2.5 pb-1.5 cursor-grab active:cursor-grabbing hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600 mb-1"></div>
      </div>

      {/* Main Mode Toggle: Explore vs Learner */}
      <div className="px-4 pb-2">
        <div className="grid grid-cols-2 gap-1 p-1 bg-black/5 dark:bg-white/10 rounded-xl mb-2">
          <button
            onClick={() => {
              setActiveMainTab('explore');
              if (sheetState === 'peek') setSheetState('half');
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeMainTab === 'explore'
                ? 'bg-white dark:bg-zinc-800 text-apple-blue shadow-sm'
                : 'text-zinc-500'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Explore
          </button>

          <button
            onClick={() => {
              setActiveMainTab('learner');
              setSheetState('half');
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeMainTab === 'learner'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-zinc-500'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Learner FreeSpace 🔰
          </button>
        </div>

        {/* Search Input Bar */}
        {activeMainTab === 'explore' && !routeData && (
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => { if (sheetState === 'peek') setSheetState('half'); }}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Maps"
              className="w-full pl-10 pr-9 py-2 text-sm bg-black/5 dark:bg-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-apple-blue/50 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 rounded-full text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Sheet Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
        {/* LEARNER MODE PANEL */}
        {activeMainTab === 'learner' && !routeData && (
          <LearnerModePanel
            userLocation={userLocation}
            selectedLearnerZone={selectedLearnerZone}
            learnerZones={learnerZones}
            onSelectZone={(zone) => {
              setSelectedLearnerZone(zone);
              setSheetState('half');
            }}
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
          />
        )}

        {/* ROUTE OVERVIEW IN BOTTOM SHEET */}
        {routeData && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between p-3 bg-white/70 dark:bg-zinc-800/70 rounded-2xl border border-black/5 dark:border-white/5">
              <div>
                <div className="text-2xl font-black text-apple-green">
                  {formatDuration(routeData.durationSeconds)}
                </div>
                <div className="text-xs text-zinc-500 font-medium">
                  {formatDistance(routeData.distanceMeters)} • Fastest Route
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClearRoute}
                  className="px-3 py-2 text-xs font-bold text-apple-red bg-rose-50 dark:bg-rose-950/40 rounded-full"
                >
                  Clear
                </button>
                <button
                  onClick={onStartNavigation}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-apple-green text-white font-bold text-sm rounded-full shadow-lg active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  GO
                </button>
              </div>
            </div>

            {/* Mode Selector */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-black/5 dark:bg-white/10 rounded-xl">
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
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    routeMode === id
                      ? 'bg-white dark:bg-zinc-700 text-apple-blue shadow-sm'
                      : 'text-zinc-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Maneuver Steps List */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Steps</h4>
              {routeData.steps.map((st, i) => (
                <div key={st.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 text-xs">
                  <div className="w-6 h-6 rounded-full bg-apple-blue/20 text-apple-blue flex items-center justify-center font-bold text-[10px] shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">{st.instruction}</div>
                    <div className="text-[11px] text-zinc-400">{formatDistance(st.distance)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SELECTED PLACE DETAILS */}
        {activeMainTab === 'explore' && selectedPlace && !routeData && (
          <div className="space-y-3 pt-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{selectedPlace.name}</h2>
                <p className="text-xs text-zinc-400">{selectedPlace.subtitle}</p>
                <div className="flex items-center gap-1.5 text-xs pt-1 font-semibold">
                  <span className="flex items-center gap-0.5 text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    {selectedPlace.rating}
                  </span>
                  <span className="text-zinc-400">•</span>
                  <span className="text-apple-green">{selectedPlace.hours}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlace(null)}
                className="p-1 rounded-full bg-black/5 dark:bg-white/10 text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-1">
              <button
                onClick={() => {
                  setSheetState('half');
                  onRequestRoute(selectedPlace, routeMode);
                }}
                className="col-span-2 py-3 bg-apple-blue text-white rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-95"
              >
                <NavIcon className="w-4 h-4" />
                Directions
              </button>

              <button
                onClick={() => onToggleFavorite(selectedPlace)}
                className={`flex flex-col items-center justify-center py-2 rounded-2xl text-xs font-semibold border ${
                  isFavorite ? 'bg-rose-50 text-apple-red border-apple-red/30' : 'bg-white/60 dark:bg-zinc-800/60 border-black/5 dark:border-white/5'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-apple-red' : ''}`} />
                <span className="text-[10px] mt-0.5">{isFavorite ? 'Saved' : 'Save'}</span>
              </button>

              <button
                onClick={() => navigator.clipboard?.writeText(window.location.href)}
                className="flex flex-col items-center justify-center py-2 rounded-2xl text-xs font-semibold bg-white/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-[10px] mt-0.5">Share</span>
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-300 pt-1 leading-relaxed">{selectedPlace.description}</p>
          </div>
        )}

        {/* DEFAULT SEARCH SUGGESTIONS */}
        {activeMainTab === 'explore' && !selectedPlace && !routeData && (
          <div className="space-y-3 pt-1">
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSearchQuery(cat.label);
                    setSheetState('half');
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/80 dark:bg-zinc-800/80 shadow-sm text-xs font-bold whitespace-nowrap text-zinc-700 dark:text-zinc-200 border border-black/5 dark:border-white/5"
                >
                  <span style={{ color: cat.color }}>●</span>
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              {/* Current Location Option */}
              <div
                onClick={() => {
                  if (onSelectCurrentLocation) onSelectCurrentLocation();
                  setSheetState('peek');
                }}
                className="flex items-center justify-between p-3 rounded-2xl bg-apple-blue/10 dark:bg-apple-blue/20 hover:bg-apple-blue/20 dark:hover:bg-apple-blue/30 active:scale-[0.99] cursor-pointer transition-all border border-apple-blue/20 mb-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-apple-blue text-white flex items-center justify-center font-bold shadow-sm">
                    <Locate className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-apple-blue dark:text-blue-400">
                      Current Location
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      GPS • San Francisco, CA
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-apple-blue bg-white dark:bg-zinc-800 px-2.5 py-1 rounded-full shadow-xs">
                  Center
                </span>
              </div>

              {searchResults.map((place) => (
                <div
                  key={place.id}
                  onClick={() => {
                    setSelectedPlace(place);
                    setSheetState('half');
                  }}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/80 dark:hover:bg-zinc-800/80 active:bg-black/5 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-apple-blue/15 text-apple-blue flex items-center justify-center font-bold">
                      <NavIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{place.name}</h4>
                      <p className="text-xs text-zinc-400 line-clamp-1">{place.subtitle}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
