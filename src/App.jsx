import React, { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import AppleMap from './components/AppleMap';
import MapErrorBoundary from './components/MapErrorBoundary';
import DesktopSidebar from './components/DesktopSidebar';
import MobileBottomSheet from './components/MobileBottomSheet';
import NavigationHUD from './components/NavigationHUD';
import DeviceModeBar from './components/DeviceModeBar';

const LearnerProPaywallModal = lazy(() => import('./components/LearnerProPaywallModal'));
const OnboardingGuideModal = lazy(() => import('./components/OnboardingGuideModal'));
const AccountModal = lazy(() => import('./components/AccountModal'));
const InstallPrompt = lazy(() => import('./components/InstallPrompt'));
import { PRESET_PLACES } from './data/presetPlaces';
import { LEARNER_ZONES } from './data/learnerZones';
import { CONE_PRESETS } from './data/conePresets';
import { DMV_TEST_ROUTES } from './data/dmvTestRoutes';
import { searchLocations } from './services/searchService';
import { calculateRoute } from './services/routingService';
import { siriVoice } from './services/voiceService';
import { generateLearnerZonesForLocation } from './services/learnerEngine';
import { getSubscriptionState, refreshSubscriptionState, clearSubscriptionCache } from './services/subscriptionService';
import { accountsEnabled, getCurrentUser, onAuthChange } from './services/authService';
import { handleCheckoutReturn, syncPurchasesUser } from './services/paymentsService';
import { trackAppOpen } from './services/analytics';
import { apiFetch, resetClientId } from './services/apiConfig';

export default function App() {
  // 'responsive' follows the real screen size. 'desktop' / 'mobile' (iPhone frame) are
  // developer previews, reachable only from the switcher shown in development builds.
  const [viewMode, setViewMode] = useState('responsive'); // 'desktop' | 'mobile' | 'responsive'
  const [isNarrowScreen, setIsNarrowScreen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );
  useEffect(() => {
    const onResize = () => setIsNarrowScreen(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
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
  // Learner features are the product, so they open first.
  const [activeMainTab, setActiveMainTab] = useState('learner'); // 'explore' | 'learner'
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

  // Accounts (Supabase Auth). Guests can use the app; signing in keeps data across devices.
  const [authUser, setAuthUser] = useState(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [accountMode, setAccountMode] = useState('signIn');
  const [accountNotice, setAccountNotice] = useState('');
  const claimedForUser = useRef(null);

  const openAccount = (mode = 'signIn', notice = '') => {
    setAccountMode(mode);
    setAccountNotice(notice);
    setIsAccountOpen(true);
  };

  const handleOpenPaywall = (feature = null) => {
    setPaywallFeature(feature);
    setIsPaywallOpen(true);
  };

  const handleSubscriptionChange = (newSubState) => {
    setSubState(newSubState);
  };

  // Driver Passport Logged Hours
  const [loggedHours, setLoggedHours] = useState(0);

  const refreshPassport = useCallback(() => {
    return apiFetch('/api/passport')
      .then(data => {
        if (typeof data?.loggedHours === 'number') setLoggedHours(data.loggedHours);
      })
      .catch(() => {});
  }, []);

  // Server is the source of truth for hours and Pro status: load them for whoever is
  // using the app (account or guest device), now and whenever that changes.
  const refreshUserData = useCallback(() => {
    refreshPassport();
    refreshSubscriptionState().then(setSubState);
  }, [refreshPassport]);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then(user => {
        if (cancelled) return;
        setAuthUser(user);
        syncPurchasesUser(user?.id || null);
      })
      .then(() => { if (!cancelled) trackAppOpen(); })
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        refreshUserData();
        // Back from Stripe Checkout: confirm the purchase and show the result.
        handleCheckoutReturn().then((result) => {
          if (cancelled || !result) return;
          if (result.subscription) setSubState(result.subscription);
          if (result.status === 'success') {
            setPaywallFeature(null);
            setIsPaywallOpen(true);
          } else if (result.status === 'pending') {
            // Payment still processing: check again once the webhook has had time to land.
            setTimeout(() => refreshSubscriptionState().then(setSubState), 5000);
          }
        });
      });

    const unsubscribe = onAuthChange(async (event, user) => {
      if (cancelled) return;
      setAuthUser(user);
      // SIGNED_IN: fresh sign-in. INITIAL_SESSION: session restored at startup (retries a claim
      // that failed earlier, e.g. offline). Claiming is safe to repeat; it moves nothing twice.
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && user && claimedForUser.current !== user.id) {
        claimedForUser.current = user.id;
        syncPurchasesUser(user.id);
        try {
          // Keep hours logged as a guest on this device by moving them into the account.
          await apiFetch('/api/account/claim', { method: 'POST', body: {} });
        } catch {
          // Not fatal: the guest data stays on this device and can be claimed next sign-in.
          claimedForUser.current = null;
        }
        refreshUserData();
      } else if (event === 'SIGNED_OUT') {
        claimedForUser.current = null;
        // Start a fresh guest identity so the next person on this device begins empty.
        resetClientId();
        syncPurchasesUser(null);
        setSubState(clearSubscriptionCache());
        setLoggedHours(0);
        refreshUserData();
      } else if (event === 'PASSWORD_RECOVERY') {
        openAccount('newPassword');
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [refreshUserData]);

  // Active Navigation State
  const [routeData, setRouteData] = useState(null);
  const [routeMode, setRouteMode] = useState('driving'); // 'driving' | 'walking' | 'cycling'
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);

  // Favorites
  // Saved places, kept on this device. New users start with none.
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('roadready_favorites') || '[]');
      return Array.isArray(saved) ? saved.filter((p) => p && typeof p.id === 'string').slice(0, 100) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('roadready_favorites', JSON.stringify(favorites));
    } catch {
      // storage unavailable: favourites last for this visit only
    }
  }, [favorites]);

  // Sync Dark Mode class with root document and system preference changes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

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
    // Spread the route's real length and time across its checkpoints (no placeholder distances).
    const legCount = Math.max(1, dmvRoute.checkpoints.length);
    const legMeters = (dmvRoute.distanceMiles * 1609.34) / legCount;
    const legSeconds = (dmvRoute.durationMins * 60) / legCount;
    const steps = dmvRoute.checkpoints.map((cp, i) => ({
      id: cp.id,
      instruction: `Examiner Evaluation: ${cp.instruction}`,
      maneuverType: 'turn',
      modifier: i % 2 === 0 ? 'right' : 'left',
      distance: legMeters,
      duration: legSeconds,
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
    siriVoice.speak(`Practice road test started. First task: ${dmvRoute.checkpoints[0].instruction}`, true);
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
      const data = await apiFetch('/api/passport/log', { method: 'POST', body: { hours: 1 } });
      if (typeof data?.passport?.loggedHours === 'number') setLoggedHours(data.passport.loggedHours);
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
      priceLevel: 'Free',
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

  const isMobileLayout = viewMode === 'mobile' || (viewMode === 'responsive' && isNarrowScreen);

  const MapContent = (
    <div className="relative w-full h-full overflow-hidden select-none">
      <MapErrorBoundary>
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
      </MapErrorBoundary>

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
        accountsEnabled={accountsEnabled}
        accountEmail={authUser?.email || ''}
        onOpenAccount={() => openAccount('signIn')}
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
    <div
      className={`w-screen h-screen flex items-center justify-center ${isDarkMode ? 'dark bg-zinc-950 text-zinc-100' : 'bg-zinc-100 text-zinc-900'} transition-colors duration-200`}
      style={{ backgroundColor: isDarkMode ? '#09090b' : '#f4f4f5' }}
    >
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
      <Suspense fallback={null}>
        <LearnerProPaywallModal
          isOpen={isPaywallOpen}
          onClose={() => setIsPaywallOpen(false)}
          isPro={isPro}
          onSubscriptionChange={handleSubscriptionChange}
          highlightFeature={paywallFeature}
          subscription={subState}
          onRequireSignIn={() => {
            setIsPaywallOpen(false);
            openAccount('signUp', 'Create a free account first, so your purchase can be restored on any device.');
          }}
        />

        {/* Home-screen install suggestion: kept out of the way of other dialogs and navigation */}
        <InstallPrompt suppressed={isOnboardingOpen || isPaywallOpen || isAccountOpen || isNavigating} />

        <AccountModal
          isOpen={isAccountOpen}
          onClose={() => setIsAccountOpen(false)}
          user={authUser}
          initialMode={accountMode}
          notice={accountNotice}
          onAccountDeleted={() => {
            setSubState(clearSubscriptionCache());
            setLoggedHours(0);
          }}
        />

        {/* Visual Onboarding & How-It-Works Guide Modal */}
        <OnboardingGuideModal
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
        />
      </Suspense>
    </div>
  );
}
