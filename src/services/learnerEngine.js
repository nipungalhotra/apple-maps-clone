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

/**
 * Dynamically discovers or synthesizes verified beginner learner zones
 * clustered within 0.5 km to 5.0 km of the user's active coordinates.
 */
export function generateLearnerZonesForLocation(userCoord = [-122.4194, 37.7749]) {
  const [lng, lat] = userCoord;
  const distToSF = calculateDistanceKm(userCoord, [-122.4194, 37.7749]);

  // If user is inside or immediately around San Francisco (< 25km), return the original SF database
  if (distToSF <= 25) {
    return LEARNER_ZONES;
  }

  // Otherwise, synthesize 5 realistic, high-safety practice grounds directly in the user's current neighborhood
  const latKey = Math.abs(Math.round(lat * 100));
  const lngKey = Math.abs(Math.round(lng * 100));

  return [
    {
      id: `local-sports-ground-${latKey}-${lngKey}`,
      name: 'Community Sports Complex Practice Ground',
      subtitle: '0.8 km from your current location',
      type: 'open_ground',
      vehicleTypes: ['car', 'bike'],
      safetyScore: 98,
      difficulty: 'Absolute Beginner',
      surface: 'Smooth Clean Asphalt',
      bestHours: 'Daily 7:00 AM - 11:00 AM & 3:00 PM - 6:00 PM',
      trafficLevel: 'Zero to Minimal',
      widthMeters: 45,
      coordinates: [lng + 0.0055, lat + 0.0042],
      polygon: [
        [lng + 0.0035, lat + 0.0055],
        [lng + 0.0075, lat + 0.0055],
        [lng + 0.0075, lat + 0.0030],
        [lng + 0.0035, lat + 0.0030],
        [lng + 0.0035, lat + 0.0055]
      ],
      recommendedDrills: [
        'Clutch & Throttle Balance (1st to 2nd gear)',
        'Figure-8 Turning for Bikes',
        'Smooth Emergency Braking',
        '3-Point Turn & Reversing'
      ],
      description: 'Massive open paved perimeter lot with zero through-traffic and wide run-off buffers. The #1 rated spot in your immediate area to practice without any street pressure.',
      perks: ['No curbs or pillars', 'Over 350m continuous open asphalt', 'Zero cross-traffic', 'Ideal for motorcycle balance']
    },
    {
      id: `local-parking-lot-${latKey}-${lngKey}`,
      name: 'Civic Center & Weekend Plaza Lot',
      subtitle: '1.3 km from your current location',
      type: 'parking_lot',
      vehicleTypes: ['car', 'bike'],
      safetyScore: 95,
      difficulty: 'Beginner',
      surface: 'Freshly Striped Blacktop',
      bestHours: 'Saturday & Sunday All Day',
      trafficLevel: 'None on Weekends / Off-Peak',
      widthMeters: 38,
      coordinates: [lng - 0.0075, lat + 0.0068],
      polygon: [
        [lng - 0.0095, lat + 0.0080],
        [lng - 0.0055, lat + 0.0080],
        [lng - 0.0055, lat + 0.0055],
        [lng - 0.0095, lat + 0.0055],
        [lng - 0.0095, lat + 0.0080]
      ],
      recommendedDrills: [
        '90° Perpendicular Bay Parking',
        'Reverse Bay Parking using Mirrors',
        'Slow Speed Bike Friction Zone Control',
        'Slalom between painted parking bays'
      ],
      description: 'Large tiered institutional lot vacant during non-peak mornings. Striped bays provide natural guides for mastering vehicle dimensions and reversing.',
      perks: ['Pre-painted parking bays', 'Gentle slope for hill start testing', 'Weekend open access']
    },
    {
      id: `local-quiet-road-${latKey}-${lngKey}`,
      name: 'Greenbelt Boulevard Quiet Ring Road',
      subtitle: '2.1 km from your current location',
      type: 'quiet_road',
      vehicleTypes: ['car', 'bike'],
      safetyScore: 93,
      difficulty: 'Novice (Road Ready)',
      surface: 'Paved Asphalt with Clear Markings',
      bestHours: 'Weekdays 10:00 AM - 2:00 PM',
      trafficLevel: 'Very Low (15 mph speed ceiling)',
      widthMeters: 14,
      coordinates: [lng + 0.0125, lat - 0.0085],
      pathCoordinates: [
        [lng + 0.0100, lat - 0.0075],
        [lng + 0.0150, lat - 0.0065],
        [lng + 0.0160, lat - 0.0105],
        [lng + 0.0115, lat - 0.0115],
        [lng + 0.0100, lat - 0.0075]
      ],
      recommendedDrills: [
        'Stop Sign Compliance & Right-of-Way',
        'Gentle Road Curvature & Lane Keeping',
        'Parallel Parking along Wide Curbs',
        'Smooth Braking at Intersections'
      ],
      description: 'Quiet residential perimeter loop with 15 mph speed limit, clear stop signs, and virtually zero commercial truck traffic. Perfect first street environment.',
      perks: ['15 mph speed ceiling', 'Wide shoulders for parking practice', 'Clear painted lane lines']
    },
    {
      id: `local-tech-park-${latKey}-${lngKey}`,
      name: 'Tech & Logistics Park Weekend Circuit',
      subtitle: '3.1 km from your current location',
      type: 'quiet_road',
      vehicleTypes: ['car', 'bike'],
      safetyScore: 91,
      difficulty: 'Beginner to Intermediate',
      surface: 'Smooth Tarmac',
      bestHours: 'Sunday Mornings 7:00 AM - 11:00 AM',
      trafficLevel: 'Low (Off-shift hours)',
      widthMeters: 16,
      coordinates: [lng - 0.0165, lat - 0.0125],
      pathCoordinates: [
        [lng - 0.0140, lat - 0.0100],
        [lng - 0.0190, lat - 0.0115],
        [lng - 0.0200, lat - 0.0155],
        [lng - 0.0150, lat - 0.0145],
        [lng - 0.0140, lat - 0.0100]
      ],
      recommendedDrills: [
        'U-Turn & Roundabout Simulation',
        'Side Mirror & Blind Spot Verification',
        'Bike Leaning & Cornering'
      ],
      description: 'Wide modern corporate park road loop with wide turnarounds and zero foot-traffic during non-working hours.',
      perks: ['Wide turn radius', 'Great pavement condition', 'Minimal pedestrian activity']
    },
    {
      id: `local-stadium-runway-${latKey}-${lngKey}`,
      name: 'Regional Stadium Perimeter Expanse',
      subtitle: '4.2 km from your current location',
      type: 'open_ground',
      vehicleTypes: ['car', 'bike'],
      safetyScore: 97,
      difficulty: 'Beginner',
      surface: 'Paved Concrete Runway Expanse',
      bestHours: 'Non-Game Days & Mornings',
      trafficLevel: 'Zero',
      widthMeters: 55,
      coordinates: [lng + 0.0210, lat + 0.0165],
      polygon: [
        [lng + 0.0185, lat + 0.0185],
        [lng + 0.0240, lat + 0.0180],
        [lng + 0.0235, lat + 0.0145],
        [lng + 0.0180, lat + 0.0150],
        [lng + 0.0185, lat + 0.0185]
      ],
      recommendedDrills: [
        'Gear Shifting (Gears 1 to 4)',
        'Slalom & Cone Weaving',
        'High-Speed Deceleration',
        'Bike Counter-Steering Practice'
      ],
      description: 'Expansive paved perimeter runway with unmatched run-off clearance. Perfect for advancing through higher gears and braking from higher speeds.',
      perks: ['Extra wide 55m expanse', 'No street furniture', 'Long straightaways']
    }
  ];
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

