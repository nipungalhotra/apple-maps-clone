import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';

export function debounce(fn, wait = 1000) {
  let timer = null;
  const debounced = function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, wait);
  };
  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return debounced;
}

/**
 * useLocation Hook
 * Provides debounced location updates, permission error handling, and GPS coordinates.
 * Throttles high-frequency watchPosition triggers to prevent UI lag.
 */
export function useLocation(options = { debounceMs: 1000 }) {
  const [location, setLocation] = useState([-122.4194, 37.7749]);
  const [error, setError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('prompt');

  useEffect(() => {
    let watchId = null;

    const debouncedSetLocation = debounce((coords) => {
      setLocation(prev => {
        // Prevent re-rendering if coordinates changed by less than ~5 meters (0.00005 deg)
        if (
          Math.abs(prev[0] - coords[0]) < 0.00005 &&
          Math.abs(prev[1] - coords[1]) < 0.00005
        ) {
          return prev;
        }
        return coords;
      });
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
      debouncedSetLocation.cancel();
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
