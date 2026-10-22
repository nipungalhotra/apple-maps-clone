import React, { useState, useEffect, useMemo } from 'react';
import AppleMap from './components/AppleMap';
import DesktopSidebar from './components/DesktopSidebar';
import MobileBottomSheet from './components/MobileBottomSheet';
import NavigationHUD from './components/NavigationHUD';
import DeviceModeBar from './components/DeviceModeBar';
import LearnerProPaywallModal from './components/LearnerProPaywallModal';
import OnboardingGuideModal from './components/OnboardingGuideModal';
import { PRESET_PLACES } from './data/presetPlaces';
import { LEARNER_ZONES } from './data/learnerZones';
import { CONE_PRESETS } from './data/conePresets';
import { DMV_TEST_ROUTES } from './data/dmvTestRoutes';
import { searchLocations } from './services/searchService';
import { calculateRoute } from './services/routingService';
import { siriVoice } from './services/voiceService';
import { generateLearnerZonesForLocation } from './services/learnerEngine';
import { getSubscriptionState } from './services/subscriptionService';

export default function App() {
  const [viewMode, setViewMode] = useState('desktop'); // 'desktop' | 'mobile' | 'responsive'
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [is3D, setIs3D] = useState(false);

  // Locations & Routing State
  const defaultLocation = [-122.4194, 37.7749]; // San Francisco Market St
  const [userLocation, setUserLocation] = useState(defaultLocation);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(PRESET_PLACES);
  const [selectedPlace, setSelectedPlace] = useState(null);

  // Dynamic Learner Zones Discovery Engine: always discovers safe grounds near userLocation
  const learnerZones = useMemo(() => {
    return generateLearnerZonesForLocation(userLocation);
  }, [userLocation]);

  // Learner Engine State
  const [activeMainTab, setActiveMainTab] = useState('explore'); // 'explore' | 'learner'
  const [selectedLearnerZone, setSelectedLearnerZone] = useState(null);

  // Virtual Cones State
  const [activeCoursePreset, setActiveCoursePreset] = useState('slalom');
  const [cones, setCones] = useState(() => {
    const initialZones = generateLearnerZonesForLocation(defaultLocation);
    const target = initialZones[0] || LEARNER_ZONES[0];
    return CONE_PRESETS[0].generateCones(target.coordinates[0], target.coordinates[1]);
  });
  const [isDroppingCustomCone, setIsDroppingCustomCone] = useState(false);

  // DMV Test Simulator State
  const [selectedDmvRoute, setSelectedDmvRoute] = useState(DMV_TEST_ROUTES[0]);
  const [activeDmvRoute, setActiveDmvRoute] = useState(null);

  // Weather Condition State
  const [weatherMode, setWeatherMode] = useState('clear'); // 'clear' | 'rain' | 'night'

  // Live Traffic Facility Overlay
  const [showTraffic, setShowTraffic] = useState(false);

  // B2C Pro Pass Subscription State
  const [subState, setSubState] = useState(getSubscriptionState);
  const isPro = subState.isPro;
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState(null);

  // First-Time Visitor Visual Onboarding Guide State
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Real-Time Online/Offline Connectivity Detection
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    try {
      const shown = localStorage.getItem('roadready_guide_shown');
      if (!shown) {
        setIsOnboardingOpen(true);
        localStorage.setItem('roadready_guide_shown', 'true');
      }
    } catch {}
  }, []);

  const handleOpenPaywall = (feature = null) => {
    setPaywallFeature(feature);
    setIsPaywallOpen(true);
  };

  const handleSubscriptionChange = (newSubState) => {
    setSubState(newSubState);
  };

  // Driver Passport Logged Hours
  const [loggedHours, setLoggedHours] = useState(18);

  // Sync initial logged hours from backend
  useEffect(() => {
    fetch('/api/passport')
      .then(res => res.json())
      .then(data => {
        if (data?.loggedHours) setLoggedHours(data.loggedHours);
      })
      .catch(() => {});
  }, []);

  // Active Navigation State
  const [routeData, setRouteData] = useState(null);
  const [routeMode, setRouteMode] = useState('driving'); // 'driving' | 'walking' | 'cycling'
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);

  // Favorites
  const [favorites, setFavorites] = useState([PRESET_PLACES[0], PRESET_PLACES[1]]);

  // Sync Dark Mode class with root document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      const results = await searchLocations(searchQuery);
      setSearchResults(results);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Apply Cone Preset around current active ground
  const handleApplyPreset = (preset) => {
    setActiveCoursePreset(preset.id);
    const anchor = selectedLearnerZone ? selectedLearnerZone.coordinates : userLocation;
    const generated = preset.generateCones(anchor[0], anchor[1]);
    setCones(generated);
    siriVoice.speak(`Virtual ${preset.name} placed on the ground.`);
  };

  const handleClearCones = () => {
    setCones([]);
    setActiveCoursePreset(null);
  };

  // Drop individual custom cone on map click
  const handleDropCustomCone = (lng, lat) => {
    const newCone = {
      id: `cone-custom-${Date.now()}`,
      type: 'orange',
      label: `${cones.length + 1}`,
      lng,
      lat
    };
    setCones(prev => [...prev, newCone]);
    siriVoice.speak(`Cone ${cones.length + 1} placed.`);
  };

  // Start DMV Test Drive
  const handleStartDmvTestDrive = (dmvRoute) => {
    setActiveDmvRoute(dmvRoute);
    const coords = dmvRoute.pathCoordinates;
    const steps = dmvRoute.checkpoints.map((cp, i) => ({
      id: cp.id,
      instruction: `Examiner Evaluation: ${cp.instruction}`,
      maneuverType: 'turn',
      modifier: i % 2 === 0 ? 'right' : 'left',
      distance: 600,
      duration: 180,
      name: cp.title
    }));

    setRouteData({
      coordinates: coords,
      distanceMeters: dmvRoute.distanceMiles * 1609.34,
      durationSeconds: dmvRoute.durationMins * 60,
      steps,
      mode: 'driving'
    });

    setIsNavigating(true);
    setIs3D(true);
    setActiveStepIndex(0);
    setIsPlaying(true);
    siriVoice.speak(`Official DMV Examination started. First task: ${dmvRoute.checkpoints[0].instruction}`, true);
  };

  // Handle Request Directions
  const handleRequestRoute = async (place, mode = routeMode) => {
    const target = place || selectedPlace;
    if (!target) return;
    const route = await calculateRoute(userLocation, target.coordinates, mode);
    setRouteData(route);
    setActiveStepIndex(0);
  };

  // Start Navigation
  const handleStartNavigation = () => {
    if (!routeData) return;
    setIsNavigating(true);
    setIs3D(true);
    setActiveStepIndex(0);
    setIsPlaying(true);
  };

  // End Navigation
  const handleEndNavigation = () => {
    setIsNavigating(false);
    setIsPlaying(false);
    setActiveStepIndex(0);
    setActiveDmvRoute(null);
  };

  // Clear Route
  const handleClearRoute = () => {
    setRouteData(null);
    setIsNavigating(false);
    setIsPlaying(false);
    setActiveDmvRoute(null);
  };

  // Toggle Favorite
  const handleToggleFavorite = (place) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.id === place.id);
      if (exists) return prev.filter(f => f.id !== place.id);
      return [...prev, place];
    });
  };

  // Add practice hour with backend persistence
  const handleAddPracticeHour = async () => {
    setLoggedHours(prev => prev + 1);
    siriVoice.speak("Practice hour logged! Check your passport for new milestone badges.");
    try {
      await fetch('/api/passport/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: 1 })
      });
    } catch {
      // Offline fallback: state already incremented locally
    }
  };

  // Recenter map to user location
  const handleRecenter = () => {
    setSelectedLearnerZone(null);
    setSelectedPlace(null);
    setRecenterTrigger(prev => prev + 1);
    siriVoice.speak("Centered on your current location.");

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.longitude, pos.coords.latitude];
          setUserLocation(coords);
          setRecenterTrigger(prev => prev + 1);
        },
        (err) => {
          console.warn('Geolocation unavailable or denied, centering on default San Francisco location:', err);
          setUserLocation(defaultLocation);
          setRecenterTrigger(prev => prev + 1);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  // Map Click
  const handleMapClick = (coords) => {
    if (isNavigating || isDroppingCustomCone) return;
    setSelectedPlace({
      id: `custom-pin-${Date.now()}`,
      name: 'Dropped Pin',
      subtitle: `${coords[1].toFixed(4)}° N, ${coords[0].toFixed(4)}° W`,
      category: 'Marked Location',
      coordinates: coords,
      rating: 5.0,
      reviewsCount: 1,
      priceLevel: 'Free',
      hours: 'Open 24 hours',
      description: 'Custom coordinates selected on the map.',
      photos: []
    });
  };

  const handleSelectLearnerZone = (zone) => {
    setSelectedLearnerZone(zone);
    setActiveMainTab('learner');
    // Automatically center cones around the newly selected ground
    if (activeCoursePreset) {
      const preset = CONE_PRESETS.find(p => p.id === activeCoursePreset) || CONE_PRESETS[0];
      setCones(preset.generateCones(zone.coordinates[0], zone.coordinates[1]));
    }
  };

  const isMobileLayout = viewMode === 'mobile' || (viewMode === 'responsive' && window.innerWidth < 768);

  const MapContent = (
    <div className="relative w-full h-full overflow-hidden select-none">
      <AppleMap
        center={selectedLearnerZone ? selectedLearnerZone.coordinates : selectedPlace ? selectedPlace.coordinates : userLocation}
        zoom={selectedLearnerZone ? 16.5 : selectedPlace ? 15 : 13}
        is3D={is3D}
        routeData={routeData}
        activeStepIndex={activeStepIndex}
        selectedPlace={selectedPlace}
        onMapClick={handleMapClick}
        onSelectLearnerZone={handleSelectLearnerZone}
        isNavigating={isNavigating}
        userLocation={userLocation}
        isDarkMode={isDarkMode}
        learnerModeActive={activeMainTab === 'learner'}
        selectedLearnerZone={selectedLearnerZone}
        cones={cones}
        onDropCone={handleDropCustomCone}
        isDroppingCustomCone={isDroppingCustomCone}
        activeDmvRoute={activeDmvRoute}
        recenterTrigger={recenterTrigger}
        learnerZones={learnerZones}
        showTraffic={showTraffic}
      />

      {/* Top Device & View Controls */}
      <DeviceModeBar
        viewMode={viewMode}
        setViewMode={setViewMode}
        is3D={is3D}
        setIs3D={setIs3D}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        onRecenter={handleRecenter}
        showTraffic={showTraffic}
        setShowTraffic={setShowTraffic}
        isPro={isPro}
        onOpenPaywall={handleOpenPaywall}
        onOpenGuide={() => setIsOnboardingOpen(true)}
        isOffline={isOffline}
      />

      {/* NAVIGATION ACTIVE HUD */}
      {isNavigating ? (
        <NavigationHUD
          routeData={routeData}
          activeStepIndex={activeStepIndex}
          setActiveStepIndex={setActiveStepIndex}
          onEndNavigation={handleEndNavigation}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          simSpeed={simSpeed}
          setSimSpeed={setSimSpeed}
          weatherMode={weatherMode}
        />
      ) : (
        /* NORMAL STATE: SIDEBAR OR BOTTOM SHEET */
        <>
          {!isMobileLayout && (
            <DesktopSidebar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchResults={searchResults}
              selectedPlace={selectedPlace}
              setSelectedPlace={setSelectedPlace}
              routeData={routeData}
              onRequestRoute={handleRequestRoute}
              onStartNavigation={handleStartNavigation}
              onClearRoute={handleClearRoute}
              routeMode={routeMode}
              setRouteMode={setRouteMode}
              isNavigating={isNavigating}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              userLocation={userLocation}
              selectedLearnerZone={selectedLearnerZone}
              setSelectedLearnerZone={setSelectedLearnerZone}
              learnerZones={learnerZones}
              activeMainTab={activeMainTab}
              setActiveMainTab={setActiveMainTab}
              activeCoursePreset={activeCoursePreset}
              setActiveCoursePreset={setActiveCoursePreset}
              cones={cones}
              onApplyPreset={handleApplyPreset}
              onClearCones={handleClearCones}
              isDroppingCustomCone={isDroppingCustomCone}
              setIsDroppingCustomCone={setIsDroppingCustomCone}
              selectedDmvRoute={selectedDmvRoute}
              setSelectedDmvRoute={setSelectedDmvRoute}
              onStartDmvTestDrive={handleStartDmvTestDrive}
              weatherMode={weatherMode}
              setWeatherMode={setWeatherMode}
              loggedHours={loggedHours}
              onAddPracticeHour={handleAddPracticeHour}
              onSelectCurrentLocation={handleRecenter}
              isPro={isPro}
              onOpenPaywall={handleOpenPaywall}
            />
          )}

          {isMobileLayout && (
            <MobileBottomSheet
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchResults={searchResults}
              selectedPlace={selectedPlace}
              setSelectedPlace={setSelectedPlace}
              routeData={routeData}
              onRequestRoute={handleRequestRoute}
              onStartNavigation={handleStartNavigation}
              onClearRoute={handleClearRoute}
              routeMode={routeMode}
              setRouteMode={setRouteMode}
              isNavigating={isNavigating}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              userLocation={userLocation}
              selectedLearnerZone={selectedLearnerZone}
              setSelectedLearnerZone={setSelectedLearnerZone}
              learnerZones={learnerZones}
              activeMainTab={activeMainTab}
              setActiveMainTab={setActiveMainTab}
              activeCoursePreset={activeCoursePreset}
              setActiveCoursePreset={setActiveCoursePreset}
              cones={cones}
              onApplyPreset={handleApplyPreset}
              onClearCones={handleClearCones}
              isDroppingCustomCone={isDroppingCustomCone}
              setIsDroppingCustomCone={setIsDroppingCustomCone}
              selectedDmvRoute={selectedDmvRoute}
              setSelectedDmvRoute={setSelectedDmvRoute}
              onStartDmvTestDrive={handleStartDmvTestDrive}
              weatherMode={weatherMode}
              setWeatherMode={setWeatherMode}
              loggedHours={loggedHours}
              onAddPracticeHour={handleAddPracticeHour}
              onSelectCurrentLocation={handleRecenter}
              isPro={isPro}
              onOpenPaywall={handleOpenPaywall}
            />
          )}
        </>
      )}
    </div>
  );

  return (
    <div className={`w-screen h-screen flex items-center justify-center ${isDarkMode ? 'dark bg-zinc-950' : 'bg-zinc-100'} transition-colors`}>
      {viewMode === 'mobile' ? (
        <div className="relative w-[400px] h-[844px] rounded-[54px] bg-zinc-900 p-3 shadow-[0_25px_70px_rgba(0,0,0,0.55)] border-[5px] border-zinc-700/80 flex flex-col overflow-hidden">
          {/* Dynamic Island */}
          <div className="absolute top-6 inset-x-0 z-50 flex justify-center pointer-events-none">
            <div className="w-28 h-7 bg-black rounded-full flex items-center justify-between px-3 text-[10px] text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-semibold tracking-wide">Learner</span>
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            </div>
          </div>

          {/* Status Bar */}
          <div className="absolute top-5 left-8 right-8 z-40 flex justify-between items-center text-xs font-bold text-zinc-800 dark:text-zinc-200 pointer-events-none">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]">5G</span>
              <div className="w-5 h-2.5 border border-current rounded-sm p-0.5">
                <div className="h-full bg-current rounded-xs w-3/4"></div>
              </div>
            </div>
          </div>

          <div className="relative w-full h-full rounded-[44px] overflow-hidden bg-black">
            {MapContent}
          </div>

          <div className="absolute bottom-4 inset-x-0 z-50 flex justify-center pointer-events-none">
            <div className="w-32 h-1 bg-white/70 rounded-full"></div>
          </div>
        </div>
      ) : (
        <div className="w-full h-full">
          {MapContent}
        </div>
      )}
      {/* B2C Learner PRO Pass Paywall Modal */}
      <LearnerProPaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        isPro={isPro}
        onSubscriptionChange={handleSubscriptionChange}
        highlightFeature={paywallFeature}
      />

      {/* Visual Onboarding & How-It-Works Guide Modal */}
      <OnboardingGuideModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />
    </div>
  );
}
