import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';

function debounce(fn, wait = 1000) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * useLocation Hook
 * Provides debounced location updates, permission error handling, and GPS coordinates.
 */
export function useLocation(options = { debounceMs: 1000 }) {
  const [location, setLocation] = useState([-122.4194, 37.7749]);
  const [error, setError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('prompt');

  useEffect(() => {
    let watchId = null;

    const debouncedSetLocation = debounce((coords) => {
      setLocation(coords);
    }, options.debounceMs || 1000);

    const initLocation = async () => {
      try {
        if (typeof window !== 'undefined' && Geolocation?.checkPermissions) {
          const perm = await Geolocation.checkPermissions();
          setPermissionStatus(perm.location);

          if (perm.location !== 'granted') {
            const req = await Geolocation.requestPermissions();
            setPermissionStatus(req.location);
            if (req.location !== 'granted') {
              setError('Location permission denied. Falling back to default region.');
              return;
            }
          }

          watchId = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 10000 },
            (position, err) => {
              if (err) {
                console.warn('Geolocation watch notice:', err);
                setError(err.message || 'Location lookup timeout');
                return;
              }
              if (position?.coords) {
                debouncedSetLocation([position.coords.longitude, position.coords.latitude]);
              }
            }
          );
        } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
          watchId = navigator.geolocation.watchPosition(
            (pos) => {
              debouncedSetLocation([pos.coords.longitude, pos.coords.latitude]);
            },
            (err) => {
              console.warn('Browser geolocation error:', err);
              setError(err.message);
            },
            { enableHighAccuracy: false, maximumAge: 1000 }
          );
        }
      } catch (e) {
        console.error('Location initialization failure:', e);
        setError(e.message);
      }
    };

    initLocation();

    return () => {
      if (watchId !== null) {
        if (typeof watchId === 'string' && Geolocation?.clearWatch) {
          Geolocation.clearWatch({ id: watchId });
        } else if (typeof navigator !== 'undefined' && navigator.geolocation && typeof watchId === 'number') {
          navigator.geolocation.clearWatch(watchId);
        }
      }
    };
  }, [options.debounceMs]);

  return { location, error, permissionStatus };
}

export default useLocation;
