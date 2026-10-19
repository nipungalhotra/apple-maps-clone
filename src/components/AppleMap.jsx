import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LEARNER_ZONES } from '../data/learnerZones';

export default function AppleMap({
  center = [-122.4194, 37.7749],
  zoom = 13,
  pitch = 0,
  bearing = 0,
  is3D = false,
  routeData = null,
  activeStepIndex = 0,
  selectedPlace = null,
  onMapClick = null,
  onSelectLearnerZone = null,
  isNavigating = false,
  userLocation = [-122.4194, 37.7749],
  isDarkMode = false,
  learnerModeActive = false,
  selectedLearnerZone = null,
  learnerZones = [],
  cones = [],
  onDropCone = null,
  isDroppingCustomCone = false,
  activeDmvRoute = null,
  recenterTrigger = 0,
  showTraffic = false
}) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const learnerMarkersRef = useRef([]);
  const coneMarkersRef = useRef([]);
  const learnerZonesRef = useRef(learnerZones);

  useEffect(() => {
    learnerZonesRef.current = learnerZones;
  }, [learnerZones]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const styleUrl = isDarkMode
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: center,
      zoom: zoom,
      pitch: pitch,
      bearing: bearing,
      attributionControl: false
    });

    map.on('load', () => {
      const activeZones = learnerZonesRef.current || [];

      // 1. Learner Zones Source (Polygons)
      const polygonFeatures = activeZones.filter(z => z.polygon).map(z => ({
        type: 'Feature',
        id: z.id,
        properties: { id: z.id, name: z.name, safetyScore: z.safetyScore },
        geometry: {
          type: 'Polygon',
          coordinates: [z.polygon]
        }
      }));

      map.addSource('learner-polygons', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: polygonFeatures }
      });

      map.addLayer({
        id: 'learner-zones-fill',
        type: 'fill',
        source: 'learner-polygons',
        paint: { 'fill-color': '#34C759', 'fill-opacity': 0.22 }
      });

      map.addLayer({
        id: 'learner-zones-outline',
        type: 'line',
        source: 'learner-polygons',
        paint: { 'line-color': '#34C759', 'line-width': 2.5, 'line-dasharray': [2, 2] }
      });

      // 2. Learner Road Paths (Quiet Roads)
      const pathFeatures = activeZones.filter(z => z.pathCoordinates).map(z => ({
        type: 'Feature',
        id: z.id,
        properties: { id: z.id, name: z.name },
        geometry: { type: 'LineString', coordinates: z.pathCoordinates }
      }));

      map.addSource('learner-paths', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: pathFeatures }
      });

      map.addLayer({
        id: 'learner-paths-line',
        type: 'line',
        source: 'learner-paths',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#30B0C7', 'line-width': 5, 'line-opacity': 0.8 }
      });

      // 3. Navigation Route Source
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }
      });

      map.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': isDarkMode ? '#1C1C1E' : '#FFFFFF',
          'line-width': 9,
          'line-opacity': 0.95
        }
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#007AFF', 'line-width': 6, 'line-opacity': 1.0 }
      });

      // 4. DMV Test Route Line
      map.addSource('dmv-route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }
      });

      map.addLayer({
        id: 'dmv-route-line',
        type: 'line',
        source: 'dmv-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#5856D6', 'line-width': 5, 'line-dasharray': [1.5, 1.5] }
      });

      // 5. Live Traffic Layer
      map.addSource('traffic-lines', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'traffic-casing',
        type: 'line',
        source: 'traffic-lines',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          'visibility': showTraffic ? 'visible' : 'none'
        },
        paint: {
          'line-color': '#000000',
          'line-width': 7,
          'line-opacity': 0.3
        }
      });

      map.addLayer({
        id: 'traffic-line',
        type: 'line',
        source: 'traffic-lines',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          'visibility': showTraffic ? 'visible' : 'none'
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 4.5,
          'line-opacity': 0.95
        }
      });

      // Click on Learner Polygons
      map.on('click', 'learner-zones-fill', (e) => {
        if (e.features && e.features[0] && onSelectLearnerZone) {
          const zoneId = e.features[0].properties.id;
          const currentPool = learnerZonesRef.current || [];
          const found = currentPool.find(z => z.id === zoneId);
          if (found) onSelectLearnerZone(found);
        }
      });
    });

    map.on('click', (e) => {
      if (isDroppingCustomCone && onDropCone) {
        onDropCone(e.lngLat.lng, e.lngLat.lat);
        return;
      }
      const features = map.queryRenderedFeatures(e.point, { layers: ['learner-zones-fill'] });
      if (features.length === 0 && onMapClick) {
        onMapClick([e.lngLat.lng, e.lngLat.lat]);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [isDroppingCustomCone]);

  // Recenter Camera explicitly when recenterTrigger is fired
  useEffect(() => {
    if (!mapRef.current || !userLocation || recenterTrigger === 0) return;
    mapRef.current.flyTo({
      center: userLocation,
      zoom: 16,
      pitch: is3D ? 50 : 0,
      bearing: 0,
      duration: 1200
    });
  }, [recenterTrigger]);

  // Destination Pin & Camera Animation for Selected Place
  useEffect(() => {
    if (!mapRef.current) return;
    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }

    if (selectedPlace && selectedPlace.coordinates) {
      const el = document.createElement('div');
      el.className = 'selected-place-pin cursor-pointer group';
      el.innerHTML = `
        <div class="flex flex-col items-center">
          <div class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/95 dark:bg-zinc-800/95 text-zinc-900 dark:text-zinc-100 shadow-md mb-1 border border-black/10 whitespace-nowrap">
            ${selectedPlace.name}
          </div>
          <div class="w-8 h-8 rounded-full bg-apple-red flex items-center justify-center shadow-lg border-2 border-white text-white">
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          </div>
        </div>
      `;

      destMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat(selectedPlace.coordinates)
        .addTo(mapRef.current);

      if (!isNavigating && !routeData) {
        mapRef.current.flyTo({
          center: selectedPlace.coordinates,
          zoom: 15.5,
          pitch: is3D ? 50 : 0,
          duration: 1200
        });
      }
    }
  }, [selectedPlace]);

  // Update Cones on Map
  useEffect(() => {
    if (!mapRef.current) return;
    coneMarkersRef.current.forEach(m => m.remove());
    coneMarkersRef.current = [];

    cones.forEach((cone) => {
      const el = document.createElement('div');
      el.className = 'virtual-cone-marker cursor-pointer select-none';
      el.innerHTML = `
        <div class="flex flex-col items-center">
          <div class="w-6 h-7 flex flex-col items-center justify-end relative filter drop-shadow-md transition-transform hover:scale-125">
            <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[20px] ${
              cone.type === 'white' ? 'border-b-zinc-200' : 'border-b-orange-500'
            } relative">
              <div class="absolute -bottom-2 left-[-6px] w-[12px] h-[3px] bg-white"></div>
            </div>
            <div class="w-5 h-1.5 ${cone.type === 'white' ? 'bg-zinc-300' : 'bg-orange-600'} rounded-xs mt-0.5"></div>
          </div>
          ${cone.label ? `<span class="text-[9px] font-black text-orange-600 dark:text-orange-300 bg-white/90 dark:bg-zinc-900/90 px-1 rounded-sm shadow-xs mt-0.5">${cone.label}</span>` : ''}
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([cone.lng, cone.lat])
        .addTo(mapRef.current);

      coneMarkersRef.current.push(marker);
    });
  }, [cones]);

  // Update DMV Route Path
  useEffect(() => {
    if (!mapRef.current) return;
    const source = mapRef.current.getSource('dmv-route');
    if (source) {
      if (activeDmvRoute && activeDmvRoute.pathCoordinates) {
        source.setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: activeDmvRoute.pathCoordinates }
        });
      } else {
        source.setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [] }
        });
      }
    }
  }, [activeDmvRoute]);

  // Live Traffic Layer Visibility and Synchronization
  useEffect(() => {
    if (!mapRef.current) return;

    const trafficLayer = mapRef.current.getLayer('traffic-line');
    const trafficCasing = mapRef.current.getLayer('traffic-casing');
    const visibility = showTraffic ? 'visible' : 'none';

    if (trafficLayer) mapRef.current.setLayoutProperty('traffic-line', 'visibility', visibility);
    if (trafficCasing) mapRef.current.setLayoutProperty('traffic-casing', 'visibility', visibility);

    if (showTraffic) {
      const [lng, lat] = userLocation || [-122.4194, 37.7749];
      fetch(`/api/traffic?lat=${lat}&lng=${lng}`)
        .then(res => res.json())
        .then(data => {
          const source = mapRef.current?.getSource('traffic-lines');
          if (source && data?.features) {
            source.setData(data);
          }
        })
        .catch(() => {
          // Fallback: local realistic traffic vectors if backend is momentarily unreachable
          const fallbackFeatures = [
            {
              type: 'Feature',
              properties: { color: '#34C759', speedMph: 30 },
              geometry: { type: 'LineString', coordinates: [[lng - 0.008, lat - 0.005], [lng + 0.005, lat + 0.004]] }
            },
            {
              type: 'Feature',
              properties: { color: '#FFCC00', speedMph: 18 },
              geometry: { type: 'LineString', coordinates: [[lng - 0.006, lat + 0.006], [lng + 0.004, lat + 0.006]] }
            },
            {
              type: 'Feature',
              properties: { color: '#FF3B30', speedMph: 8 },
              geometry: { type: 'LineString', coordinates: [[lng - 0.002, lat - 0.008], [lng - 0.002, lat + 0.008]] }
            }
          ];
          const source = mapRef.current?.getSource('traffic-lines');
          if (source) source.setData({ type: 'FeatureCollection', features: fallbackFeatures });
        });
    }
  }, [showTraffic, userLocation]);

  // Update Dynamic Learner Polygons & Paths GeoJSON Sources
  useEffect(() => {
    if (!mapRef.current) return;

    const polySource = mapRef.current.getSource('learner-polygons');
    if (polySource) {
      const polygonFeatures = (learnerZones || []).filter(z => z.polygon).map(z => ({
        type: 'Feature',
        id: z.id,
        properties: { id: z.id, name: z.name, safetyScore: z.safetyScore },
        geometry: {
          type: 'Polygon',
          coordinates: [z.polygon]
        }
      }));
      polySource.setData({
        type: 'FeatureCollection',
        features: polygonFeatures
      });
    }

    const pathSource = mapRef.current.getSource('learner-paths');
    if (pathSource) {
      const pathFeatures = (learnerZones || []).filter(z => z.pathCoordinates).map(z => ({
        type: 'Feature',
        id: z.id,
        properties: { id: z.id, name: z.name },
        geometry: { type: 'LineString', coordinates: z.pathCoordinates }
      }));
      pathSource.setData({
        type: 'FeatureCollection',
        features: pathFeatures
      });
    }
  }, [learnerZones]);

  // Update Learner Markers Pin Icons
  useEffect(() => {
    if (!mapRef.current) return;
    learnerMarkersRef.current.forEach(m => m.remove());
    learnerMarkersRef.current = [];

    (learnerZones || []).forEach((zone) => {
      const isSelected = selectedLearnerZone?.id === zone.id;
      const el = document.createElement('div');
      el.className = 'learner-zone-pin cursor-pointer group';
      el.innerHTML = `
        <div class="flex flex-col items-center">
          <div class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md mb-1 border ${
            isSelected
              ? 'bg-apple-green text-white border-white scale-110'
              : 'bg-white/95 dark:bg-zinc-800/95 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
          } whitespace-nowrap transition-transform duration-200 group-hover:scale-110">
            🛡️ ${zone.safetyScore}% Safe
          </div>
          <div class="w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-white ${
            zone.type === 'open_ground' ? 'bg-emerald-500' : 'bg-sky-500'
          }">
            <span class="text-white text-xs">${zone.vehicleTypes.includes('bike') && !zone.vehicleTypes.includes('car') ? '🏍️' : '🚗'}</span>
          </div>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onSelectLearnerZone) onSelectLearnerZone(zone);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat(zone.coordinates)
        .addTo(mapRef.current);

      learnerMarkersRef.current.push(marker);
    });
  }, [learnerZones, selectedLearnerZone]);

  // Camera animations for selected learner zone
  useEffect(() => {
    if (!mapRef.current || !selectedLearnerZone || isNavigating || !learnerModeActive) return;
    mapRef.current.flyTo({
      center: selectedLearnerZone.coordinates,
      zoom: 16.5,
      pitch: is3D ? 50 : 25,
      duration: 1200
    });
  }, [selectedLearnerZone, learnerModeActive]);

  // Update 3D Camera Tilt
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.easeTo({
      pitch: is3D ? 58 : 0,
      duration: 800
    });
  }, [is3D]);

  // Update Route Polyline
  useEffect(() => {
    if (!mapRef.current) return;
    const source = mapRef.current.getSource('route');
    if (source) {
      if (routeData && routeData.coordinates?.length > 0) {
        source.setData({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: routeData.coordinates
          }
        });

        if (!isNavigating) {
          const coords = routeData.coordinates;
          const bounds = coords.reduce(
            (b, coord) => b.extend(coord),
            new maplibregl.LngLatBounds(coords[0], coords[0])
          );
          mapRef.current.fitBounds(bounds, {
            padding: { top: 90, bottom: 90, left: 380, right: 90 },
            duration: 1200
          });
        }
      } else {
        source.setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [] }
        });
      }
    }
  }, [routeData]);

  // User puck
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;
    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'apple-user-location-puck';
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 bg-blue-500/30 rounded-full animate-ping absolute"></div>
          <div class="w-6 h-6 bg-apple-blue border-2 border-white rounded-full shadow-lg z-10 flex items-center justify-center">
            <div class="w-2 h-2 bg-white rounded-full"></div>
          </div>
        </div>
      `;
      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(userLocation)
        .addTo(mapRef.current);
    } else {
      userMarkerRef.current.setLngLat(userLocation);
    }
  }, [userLocation]);

  // Navigation tracking
  useEffect(() => {
    if (!mapRef.current || !isNavigating || !routeData) return;
    const coords = routeData.coordinates;
    const currentCoord = coords[activeStepIndex] || coords[0];

    let heading = 0;
    if (activeStepIndex < coords.length - 1) {
      const nextCoord = coords[activeStepIndex + 1];
      const dLng = nextCoord[0] - currentCoord[0];
      const dLat = nextCoord[1] - currentCoord[1];
      heading = (Math.atan2(dLng, dLat) * 180) / Math.PI;
    }

    mapRef.current.easeTo({
      center: currentCoord,
      zoom: 17.5,
      pitch: 62,
      bearing: heading,
      duration: 900
    });
  }, [isNavigating, activeStepIndex, routeData]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}
