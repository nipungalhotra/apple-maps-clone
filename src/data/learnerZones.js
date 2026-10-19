/**
 * Learner Driver & Rider Practice Zones Database
 * Contains large open grounds, empty parking lots, quiet wide streets,
 * and practice tracks tailored for beginners learning Car and Bike handling.
 */

export const LEARNER_ZONES = [
  {
    id: 'candlestick-open-ground',
    name: 'Candlestick Point Practice Grounds',
    subtitle: 'Harney Way & Jamestown Ave, SF',
    type: 'open_ground', // 'open_ground' | 'quiet_road' | 'parking_lot' | 'training_circuit'
    vehicleTypes: ['car', 'bike'],
    safetyScore: 98,
    difficulty: 'Absolute Beginner',
    surface: 'Smooth Asphalt',
    bestHours: 'Daily 7:00 AM - 11:00 AM & 3:00 PM - 6:00 PM',
    trafficLevel: 'Zero to Minimal',
    widthMeters: 45,
    coordinates: [-122.3842, 37.7126],
    polygon: [
      [-122.3860, 37.7140],
      [-122.3820, 37.7135],
      [-122.3825, 37.7110],
      [-122.3865, 37.7115],
      [-122.3860, 37.7140]
    ],
    recommendedDrills: [
      'Clutch & Throttle Balance (1st to 2nd gear)',
      'Figure-8 Turning for Bikes',
      'Smooth Emergency Braking',
      '3-Point Turn & Reversing'
    ],
    description: 'Massive open paved area with zero cross-traffic, no curbs, and wide run-off space. The #1 spot recommended for first-time drivers to get comfortable with pedals and steering.',
    perks: ['No curbs or pillars', 'Over 400m continuous run', 'Ocean breeze', 'Ideal for motorcycle balance']
  },
  {
    id: 'alameda-point-runway',
    name: 'Alameda Naval Airfield Perimeter',
    subtitle: 'West Tower Ave, Alameda, CA',
    type: 'open_ground',
    vehicleTypes: ['car', 'bike'],
    safetyScore: 96,
    difficulty: 'Beginner',
    surface: 'Paved Concrete Runway',
    bestHours: 'Weekends 6:30 AM - 10:00 AM',
    trafficLevel: 'Minimal to None',
    widthMeters: 60,
    coordinates: [-122.3168, 37.7850],
    polygon: [
      [-122.3210, 37.7870],
      [-122.3130, 37.7860],
      [-122.3140, 37.7830],
      [-122.3220, 37.7840],
      [-122.3210, 37.7870]
    ],
    recommendedDrills: [
      'Gear Shifting (Gears 1 to 4)',
      'Slalom & Cone Weaving',
      'High-Speed Deceleration',
      'Bike Counter-Steering Practice'
    ],
    description: 'Expansive historic decommissioned airstrip offering hundreds of meters of unobstructed concrete. Unmatched space to gain confidence shifting through higher gears.',
    perks: ['Extra wide 60m expanse', 'No street furniture', 'Long straightaways']
  },
  {
    id: 'presidio-loop-road',
    name: 'Presidio Montgomery Quiet Loop',
    subtitle: 'Montgomery St & Sheridan Rd, SF',
    type: 'quiet_road',
    vehicleTypes: ['car', 'bike'],
    safetyScore: 92,
    difficulty: 'Novice (Road Ready)',
    surface: 'Paved Asphalt with Clear Markings',
    bestHours: 'Weekdays 10:00 AM - 2:00 PM',
    trafficLevel: 'Very Low (15 mph speed limit)',
    widthMeters: 14,
    coordinates: [-122.4580, 37.7985],
    pathCoordinates: [
      [-122.4560, 37.7995],
      [-122.4580, 37.8010],
      [-122.4610, 37.7990],
      [-122.4590, 37.7975],
      [-122.4560, 37.7995]
    ],
    recommendedDrills: [
      'Stop Sign Etiquette',
      'Gentle Road Curvature & Lane Keeping',
      'Parallel Parking along Wide Curbs',
      'Smooth Braking at Intersections'
    ],
    description: 'Tree-lined quiet circular road with 15 mph speed limit, clear stop signs, and zero commercial truck traffic. Perfect first street environment once open ground practice is mastered.',
    perks: ['15 mph speed cap', 'Wide shoulders for parking practice', 'Clear painted lane lines']
  },
  {
    id: 'treasure-island-perimeter',
    name: 'Treasure Island Clipper Cove Way',
    subtitle: 'Avenue of the Palms, Treasure Island',
    type: 'quiet_road',
    vehicleTypes: ['car', 'bike'],
    safetyScore: 90,
    difficulty: 'Novice',
    surface: 'Smooth Tarmac',
    bestHours: 'Sunday Mornings 7:00 AM - 10:30 AM',
    trafficLevel: 'Low',
    widthMeters: 16,
    coordinates: [-122.3705, 37.8185],
    pathCoordinates: [
      [-122.3730, 37.8220],
      [-122.3680, 37.8210],
      [-122.3670, 37.8160],
      [-122.3710, 37.8150],
      [-122.3730, 37.8220]
    ],
    recommendedDrills: [
      'U-Turn & Roundabout Simulation',
      'Side Mirror & Blind Spot Verification',
      'Bike Leaning & Cornering'
    ],
    description: 'Wide waterfront road with panoramic skyline views, low vehicular movement on weekend mornings, and wide turnarounds.',
    perks: ['Wide turn radius', 'Waterfront visibility', 'Low pedestrian density']
  },
  {
    id: 'ccsf-lower-parking',
    name: 'City College Balboa Practice Lot',
    subtitle: '50 Frida Kahlo Way, SF',
    type: 'parking_lot',
    vehicleTypes: ['car', 'bike'],
    safetyScore: 94,
    difficulty: 'Absolute Beginner',
    surface: 'Freshly Striped Blacktop',
    bestHours: 'Saturday & Sunday All Day',
    trafficLevel: 'None on Weekends',
    widthMeters: 38,
    coordinates: [-122.4520, 37.7265],
    polygon: [
      [-122.4540, 37.7275],
      [-122.4500, 37.7270],
      [-122.4505, 37.7255],
      [-122.4545, 37.7260],
      [-122.4540, 37.7275]
    ],
    recommendedDrills: [
      '90° Perpendicular Bay Parking',
      'Reverse Bay Parking using Mirrors',
      'Slow Speed Bike Friction Zone Control',
      'Slalom between painted parking bays'
    ],
    description: 'Tiered parking facility empty on non-class weekends. Marked bays offer natural guides for learning to align the car within painted lines.',
    perks: ['Pre-painted parking bays', 'Gentle slope for hill start testing', 'Weekend gate access']
  },
  {
    id: 'golden-gate-park-overflow',
    name: 'Ocean Beach Polo Field Roadways',
    subtitle: 'Middle Drive West, Golden Gate Park, SF',
    type: 'quiet_road',
    vehicleTypes: ['car', 'bike'],
    safetyScore: 91,
    difficulty: 'Beginner to Intermediate',
    surface: 'Asphalt with Speed Bumps',
    bestHours: 'Tuesday - Thursday 1:00 PM - 3:30 PM',
    trafficLevel: 'Slow Local Traffic Only',
    widthMeters: 12,
    coordinates: [-122.4950, 37.7680],
    pathCoordinates: [
      [-122.4920, 37.7690],
      [-122.4980, 37.7685],
      [-122.5020, 37.7675]
    ],
    recommendedDrills: [
      'Speed Bump Negotiation',
      'Maintaining Consistent 20 mph Throttle',
      'Bicycle & Pedestrian Awareness'
    ],
    description: 'Peaceful park road buffered by greenery. Great for practicing speed control over gentle road cushions and calming beginner anxieties.',
    perks: ['Cushioned speed bumps', '20 mph speed ceiling', 'Shaded lanes']
  }
];

export const SKILL_DRILLS = [
  {
    id: 'drill-1',
    title: 'Level 1: The Friction Zone & First Motion',
    vehicle: 'Both',
    description: 'Find biting point without stalling. Practice rolling forward 5 meters and stopping smoothly using both brakes.',
    difficulty: 'Starter'
  },
  {
    id: 'drill-2',
    title: 'Level 2: The Perfect Figure-8',
    vehicle: 'Bike',
    description: 'Keep your eyes looking where you want to go. Lean the motorcycle slightly while keeping weight balanced to complete 5 continuous figure-8s.',
    difficulty: 'Essential'
  },
  {
    id: 'drill-3',
    title: 'Level 3: 3-Point Turn & Reversing',
    vehicle: 'Car',
    description: 'Check mirrors, full lock steering, stop before curb, engage reverse, check 360 blind spots, roll back, and exit cleanly.',
    difficulty: 'Intermediate'
  },
  {
    id: 'drill-4',
    title: 'Level 4: Parallel Parking Alignment',
    vehicle: 'Car',
    description: 'Pull alongside target, 45° angle reverse cut, straighten wheels, full opposite lock into the bay within 6 inches of the curb.',
    difficulty: 'Test Ready'
  }
];
