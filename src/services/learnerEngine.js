import { LEARNER_ZONES, SKILL_DRILLS } from '../data/learnerZones';

/**
 * Enhanced Learner Driver & Rider Recommendation & Scoring Engine
 * Implements the 5-stage filtering pipeline and mathematical safety score formula.
 */

export const DEFAULT_PIPELINE_WEIGHTS = {
  width: 0.30,
  traffic: 0.35,
  surface: 0.20,
  speed: 0.15
};

/**
 * Computes the 5-stage algorithmic score breakdown for any zone or road coordinate
 */
export function evaluateLocationSafety({
  zone,
  simulatedHour = null, // 0 to 23 (null = current real hour)
  simulatedDay = null,  // 0 (Sun) to 6 (Sat)
  vehicleType = 'car'   // 'car' | 'bike'
}) {
  const now = new Date();
  const hour = simulatedHour !== null ? simulatedHour : now.getHours();
  const day = simulatedDay !== null ? simulatedDay : now.getDay();
  const isWeekend = day === 0 || day === 6;

  // 1. STAGE 1: Spatial Geometry Score (0 - 100)
  const widthMeters = zone.widthMeters || 15;
  let sWidth = 0;
  if (widthMeters >= 40) sWidth = 100;
  else if (widthMeters >= 25) sWidth = 85;
  else if (widthMeters >= 14) sWidth = 70;
  else if (widthMeters >= 10) sWidth = 50;
  else sWidth = 25;

  const stage1 = {
    name: '1. Spatial Geometry & Boundary',
    widthMeters,
    score: sWidth,
    status: sWidth >= 70 ? 'PASS' : sWidth >= 50 ? 'BORDERLINE' : 'FAIL',
    details: `${widthMeters}m clear width (${zone.type === 'open_ground' ? 'Open unobstructed perimeter' : 'Wide practice lanes'})`,
    minTurningDiameterMeters: vehicleType === 'car' ? 11.0 : 4.5
  };

  // 2. STAGE 2: Road Classification & Speed Ceiling Score (0 - 100)
  let sSpeed = 0;
  let speedCap = 20;
  let roadClass = 'service';

  if (zone.type === 'open_ground') {
    sSpeed = 100;
    speedCap = 0; // zero traffic conflict
    roadClass = 'decommissioned_tarmac';
  } else if (zone.type === 'parking_lot') {
    sSpeed = 95;
    speedCap = 10;
    roadClass = 'parking_aisle';
  } else {
    // quiet road
    sSpeed = 85;
    speedCap = 15;
    roadClass = 'living_street';
  }

  const stage2 = {
    name: '2. Road Hierarchy & Speed Ceiling',
    roadClass,
    speedCapMph: speedCap,
    score: sSpeed,
    status: 'PASS',
    details: speedCap === 0 ? 'Zero traffic conflict / Closed course' : `${speedCap} mph strict speed ceiling (No throughways)`
  };

  // 3. STAGE 3: Temporal Traffic Activity Matrix (0 - 100)
  // Check time window: Morning (6-10) is best, mid-day (13-16) is good, evening rush (17-19) is poor
  let sTraffic = 0;
  let trafficStatus = 'Low';
  let isIdealTime = false;

  if (isWeekend) {
    if (hour >= 6 && hour <= 11) {
      sTraffic = 98;
      trafficStatus = 'Completely Empty';
      isIdealTime = true;
    } else if (hour >= 11 && hour <= 17) {
      sTraffic = 82;
      trafficStatus = 'Light Weekend Activity';
      isIdealTime = true;
    } else {
      sTraffic = 70;
      trafficStatus = 'Moderate';
    }
  } else {
    // Weekday
    if (zone.type === 'parking_lot') {
      // College or institutional lot is occupied on weekdays
      sTraffic = 40;
      trafficStatus = 'Occupied with Regular Vehicles';
      isIdealTime = false;
    } else if (hour >= 7 && hour <= 9) {
      sTraffic = 45;
      trafficStatus = 'Morning Commuter Flow';
    } else if (hour >= 10 && hour <= 15) {
      sTraffic = 88;
      trafficStatus = 'Quiet Off-Peak Lull';
      isIdealTime = true;
    } else {
      sTraffic = 50;
      trafficStatus = 'Moderate';
    }
  }

  const stage3 = {
    name: '3. Temporal Traffic Density Matrix',
    simulatedHour: `${hour}:00`,
    isWeekend,
    score: sTraffic,
    trafficStatus,
    isIdealTime,
    status: sTraffic >= 75 ? 'PASS' : sTraffic >= 50 ? 'BORDERLINE' : 'HIGH_TRAFFIC',
    details: `${trafficStatus} at ${hour}:00 (${isWeekend ? 'Weekend' : 'Weekday'})`
  };

  // 4. STAGE 4: Surface Quality & Vehicle Physics Matching (0 - 100)
  let sSurface = 0;
  if (zone.surface.toLowerCase().includes('smooth')) sSurface = 100;
  else if (zone.surface.toLowerCase().includes('paved')) sSurface = 90;
  else sSurface = 70;

  // Vehicle specific adjustments
  let vehicleDetails = '';
  if (vehicleType === 'bike') {
    sSurface = sSurface * 0.95; // Bikes are extra sensitive to surface grip
    vehicleDetails = 'Zero-gravel, smooth friction zone traction & continuous loop space';
  } else {
    vehicleDetails = 'Spacious bay parking alignment & curb clearance';
  }

  const stage4 = {
    name: '4. Surface & Vehicle Physics',
    surfaceType: zone.surface,
    vehicleType,
    score: Math.round(sSurface),
    status: sSurface >= 80 ? 'PASS' : 'CAUTION',
    details: `${zone.surface} • ${vehicleDetails}`
  };

  // 5. STAGE 5: Composite Safety Score Formula
  // Formula: (S_width * 0.30) + (S_traffic * 0.35) + (S_surface * 0.20) + (S_speed * 0.15) - Penalties
  let penalties = 0;
  if (!isIdealTime && zone.type !== 'open_ground') penalties += 5;
  if (vehicleType === 'bike' && zone.widthMeters < 15) penalties += 6;

  const rawWeightedScore =
    sWidth * DEFAULT_PIPELINE_WEIGHTS.width +
    sTraffic * DEFAULT_PIPELINE_WEIGHTS.traffic +
    sSurface * DEFAULT_PIPELINE_WEIGHTS.surface +
    sSpeed * DEFAULT_PIPELINE_WEIGHTS.speed;

  const finalScore = Math.max(10, Math.min(100, Math.round(rawWeightedScore - penalties)));

  return {
    zoneId: zone.id,
    zoneName: zone.name,
    finalScore,
    isApproved: finalScore >= 75,
    stages: [stage1, stage2, stage3, stage4],
    formula: {
      sWidth,
      sTraffic,
      sSurface,
      sSpeed,
      penalties,
      weights: DEFAULT_PIPELINE_WEIGHTS
    }
  };
}

/** Map centre used until the person shares their location (central San Francisco). */
export const DEFAULT_LOCATION = [-122.4194, 37.7749];
export const isDefaultLocation = (coord) =>
  Array.isArray(coord) && coord[0] === DEFAULT_LOCATION[0] && coord[1] === DEFAULT_LOCATION[1];

/** Radius (km) around San Francisco covered by the curated, hand-verified zone list. */
export const VERIFIED_COVERAGE_RADIUS_KM = 25;

/**
 * Returns the curated, hand-verified practice zones near the user.
 *
 * Only San Francisco is covered today. Outside that area we return an empty
 * list rather than synthesizing grounds at fixed offsets from the user's GPS:
 * made-up coordinates can land on freeways, water or private property, which
 * is a real safety hazard for a learner driver.
 */
export function generateLearnerZonesForLocation(userCoord = [-122.4194, 37.7749]) {
  const distToSF = calculateDistanceKm(userCoord, [-122.4194, 37.7749]);
  return distToSF <= VERIFIED_COVERAGE_RADIUS_KM ? LEARNER_ZONES : [];
}

/**
 * Filter and sort learner zones with dynamic filters and time simulation
 */
export function getFilteredLearnerZones({
  vehicleType = 'all',
  zoneType = 'all',
  minWidth = 0,
  minSafetyScore = 0,
  simulatedHour = null,
  simulatedDay = null,
  userCoord = [-122.4194, 37.7749],
  sourceZones = null
} = {}) {
  const pool = sourceZones && sourceZones.length > 0
    ? sourceZones
    : generateLearnerZonesForLocation(userCoord);

  return pool.filter(zone => {
    if (vehicleType !== 'all' && !zone.vehicleTypes.includes(vehicleType)) return false;
    if (zoneType !== 'all' && zone.type !== zoneType) return false;
    if (minWidth > 0 && zone.widthMeters < minWidth) return false;
    return true;
  }).map(zone => {
    const evaluation = evaluateLocationSafety({
      zone,
      simulatedHour,
      simulatedDay,
      vehicleType: vehicleType === 'all' ? 'car' : vehicleType
    });

    const dist = calculateDistanceKm(userCoord, zone.coordinates);

    return {
      ...zone,
      dynamicScore: evaluation.finalScore,
      evaluation,
      distanceKm: dist,
      isCurrentlyIdealTime: evaluation.stages[2].isIdealTime
    };
  }).filter(z => z.dynamicScore >= minSafetyScore)
    .sort((a, b) => b.dynamicScore - a.dynamicScore);
}

export function getDrillsForVehicle(vehicleType) {
  if (!vehicleType || vehicleType === 'all') return SKILL_DRILLS;
  return SKILL_DRILLS.filter(d => d.vehicle === 'Both' || d.vehicle.toLowerCase() === vehicleType.toLowerCase());
}

export function calculateDistanceKm(coord1, coord2) {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round((R * c) * 10) / 10;
}

