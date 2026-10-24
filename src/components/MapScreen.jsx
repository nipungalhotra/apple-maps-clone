import React from 'react';
import AppleMap from './AppleMap';
import MapErrorBoundary from './MapErrorBoundary';
import { MAP_STYLES } from '../config/mapConfig';
import { offlineManager } from '../services/offlinePacks';

/**
 * MapScreen Component
 * Production-ready container supporting MapScreenProps, error boundaries,
 * and seamless fallback rendering with explicit backgroundColor theming.
 */
export default function MapScreen({
  initialRegion = {
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421
  },
  styleURL = MAP_STYLES.light,
  backgroundColor,
  isDarkMode = false,
  onError,
  onLoad,
  children,
  style,
  ...props
}) {
  const center = [initialRegion?.longitude ?? -122.4194, initialRegion?.latitude ?? 37.7749];
  const zoom = initialRegion?.longitudeDelta
    ? Math.max(1, Math.min(20, Math.round(Math.log2(360 / initialRegion.longitudeDelta))))
    : 13;

  const resolvedBgColor = backgroundColor || (isDarkMode ? '#09090b' : '#f4f4f5');

  return (
    <MapErrorBoundary>
      <div
        className="relative w-full h-full flex-1 transition-colors duration-200"
        style={{ backgroundColor: resolvedBgColor, ...style }}
      >
        <AppleMap
          center={center}
          zoom={zoom}
          isDarkMode={isDarkMode}
          onError={onError}
          onLoad={onLoad}
          {...props}
        />
        {children}
      </div>
    </MapErrorBoundary>
  );
}

/**
 * MapboxGL compatibility shims so that React Native Mapbox code
 * or tests referencing <MapboxGL.Camera> or <MapboxGL.Map> do not throw Invariant Violation.
 */
export const MapboxGL = {
  Map: function Map({ children, styleURL = MAP_STYLES.light, onError, ...props }) {
    return (
      <MapScreen styleURL={styleURL} onError={onError} {...props}>
        {children}
      </MapScreen>
    );
  },
  MapView: function MapView({ children, ...props }) {
    return <div className="w-full h-full" {...props}>{children}</div>;
  },
  Camera: function Camera() {
    return null;
  },
  UserLocation: function UserLocation() {
    return null;
  },
  offlineManager
};
