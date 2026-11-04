/**
 * RoadReady Core TypeScript Interfaces and Type Definitions
 */

export interface Coordinates {
  lng: number;
  lat: number;
}

export type CoordinateTuple = [number, number]; // [lng, lat]

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

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
  subtitle?: string;
  type: 'open_ground' | 'quiet_road' | 'parking_lot' | 'training_circuit' | 'business_park' | 'school_lot' | string;
  vehicleTypes?: string[]; // e.g. ['car', 'bike']
  safetyScore: number;
  difficulty: 'Absolute Beginner' | 'Beginner' | 'Intermediate' | 'Advanced' | string;
  coordinates: CoordinateTuple;
  polygon?: CoordinateTuple[];
  pathCoordinates?: CoordinateTuple[];
  surface?: string;
  surfaceCondition?: string;
  bestTime?: string;
  bestHours?: string;
  trafficLevel?: string;
  widthMeters?: number;
  gateStatus?: string;
  features?: string[];
  perks?: string[];
  recommendedDrills?: string[];
  description?: string;
}

export interface ConeMarker {
  id: string;
  type: 'orange' | 'white';
  label?: string;
  lng: number;
  lat: number;
}

export interface ConePreset {
  id: string;
  name: string;
  category: string;
  description: string;
  difficulty: string;
  recommendedSpace: string;
  generateCones: (originLng: number, originLat: number) => ConeMarker[];
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

export type RouteMode = 'driving' | 'walking' | 'cycling' | 'transit';

export interface RouteData {
  coordinates: CoordinateTuple[];
  distanceMeters: number;
  durationSeconds: number;
  steps: RouteStep[];
  mode: RouteMode;
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

export interface DMVCheckpoint {
  id: string;
  title: string;
  instruction: string;
  points: number;
  criteria: string;
}

export interface DMVTestRoute {
  id: string;
  name: string;
  officeName: string;
  coordinates: CoordinateTuple;
  durationMins: number;
  distanceMiles: number;
  passScoreThreshold: number;
  description: string;
  checkpoints: DMVCheckpoint[];
  pathCoordinates?: CoordinateTuple[];
}

export interface InstructorPricingPackage {
  id: string;
  name: string;
  price: number;
  duration: string;
  desc: string;
}

export interface Instructor {
  id: string;
  name: string;
  schoolName: string;
  title: string;
  rating: number;
  reviewsCount: number;
  studentsPassed: number;
  hourlyRate: number;
  car: string;
  transmission: string[];
  phone: string;
  licenseNumber: string;
  bio: string;
  specialties: string[];
  pricingPackages: InstructorPricingPackage[];
  meetAtGrounds: string[];
  availableToday: boolean;
  nextSlot: string;
}

export interface InsurancePartner {
  id: string;
  name: string;
  logo: string;
  tagline: string;
  avgDiscount: string;
  estimatedAnnualSavings: number;
  cpaPayout: number;
  quoteTimeMins: string;
  features: string[];
  badge: string;
  affiliateUrl: string;
}

export interface TrafficIncident {
  id: string;
  title: string;
  delayMinutes: number;
  coordinates: CoordinateTuple;
}

export interface TrafficFeature {
  type: 'Feature';
  properties: {
    color: string;
    speedMph: number;
  };
  geometry: {
    type: 'LineString';
    coordinates: CoordinateTuple[];
  };
}

export interface TrafficCollection {
  type: 'FeatureCollection';
  features: TrafficFeature[];
  incidents?: TrafficIncident[];
}

export interface SubscriptionState {
  isPro: boolean;
  planId?: string | null;
  status?: string;
  expiresAt?: string | null;
}

export interface LocationState {
  location: CoordinateTuple;
  error: string | null;
  permissionStatus: string;
}

export interface MapScreenProps {
  initialRegion?: Region;
  styleURL?: string;
  onError?: (error: any) => void;
  onLoad?: () => void;
  children?: any;
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
  activeDmvRoute?: DMVTestRoute | null;
  recenterTrigger?: number;
  showTraffic?: boolean;
}
