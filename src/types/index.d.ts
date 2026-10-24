/**
 * RoadReady Core TypeScript Interfaces and Type Definitions
 */

export interface Coordinates {
  lng: number;
  lat: number;
}

export type CoordinateTuple = [number, number]; // [lng, lat]

export interface Place {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  coordinates: CoordinateTuple;
  rating?: number;
  reviewsCount?: number;
  priceLevel?: string;
  isOpen?: boolean;
  hours?: string;
  photos?: string[];
  description?: string;
  amenities?: string[];
}

export interface LearnerZone {
  id: string;
  name: string;
  type: 'parking_lot' | 'quiet_street' | 'business_park' | 'school_lot';
  safetyScore: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  coordinates: CoordinateTuple;
  polygon?: CoordinateTuple[];
  pathCoordinates?: CoordinateTuple[];
  surfaceCondition: string;
  bestTime: string;
  gateStatus: string;
  features: string[];
  recommendedDrills: string[];
}

export interface ConeMarker {
  id: string;
  type: 'orange' | 'white';
  label?: string;
  lng: number;
  lat: number;
}

export interface RouteStep {
  id: string;
  instruction: string;
  maneuverType?: string;
  modifier?: string;
  distance: number; // meters
  duration: number; // seconds
  name?: string;
  location?: CoordinateTuple;
}

export interface RouteData {
  coordinates: CoordinateTuple[];
  distanceMeters: number;
  durationSeconds: number;
  steps: RouteStep[];
  mode: 'driving' | 'walking' | 'cycling' | 'transit';
}

export interface PassportMetrics {
  loggedHours: number;
  targetHours: number;
  nightHours: number;
  highwayHours: number;
  badges: string[];
}

export interface CommunityReport {
  id: string;
  author: string;
  timeAgo: string;
  status: string;
  surface: string;
  notes: string;
}

export interface MapScreenProps {
  center?: CoordinateTuple;
  zoom?: number;
  pitch?: number;
  bearing?: number;
  is3D?: boolean;
  routeData?: RouteData | null;
  activeStepIndex?: number;
  selectedPlace?: Place | null;
  onMapClick?: (coords: CoordinateTuple) => void;
  onSelectLearnerZone?: (zone: LearnerZone) => void;
  isNavigating?: boolean;
  userLocation?: CoordinateTuple;
  isDarkMode?: boolean;
  learnerModeActive?: boolean;
  selectedLearnerZone?: LearnerZone | null;
  learnerZones?: LearnerZone[];
  cones?: ConeMarker[];
  onDropCone?: (lng: number, lat: number) => void;
  isDroppingCustomCone?: boolean;
  recenterTrigger?: number;
  showTraffic?: boolean;
}
