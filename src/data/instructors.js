// Model 2: Driving Instructor & School Marketplace Data
// Local DMV-licensed instructors offering 1-on-1 coaching at verified safe grounds

export const DRIVING_INSTRUCTORS = [
  {
    id: 'inst-dave-miller',
    name: 'Dave Miller',
    schoolName: 'Bay Area Master Drivers Academy',
    title: 'DMV Road Test Specialist (Ex-DMV Examiner)',
    rating: 4.96,
    reviewsCount: 184,
    studentsPassed: 412,
    hourlyRate: 75,
    car: '2024 Honda Civic (Dual-Brake Controls)',
    transmission: ['Automatic'],
    phone: '(415) 890-3419',
    licenseNumber: 'CA-DS-77491',
    bio: 'Former DMV examiner with 14 years experience. Specializes in turning nervous first-time drivers into confident test-passers on official local DMV routes.',
    specialties: [
      'Official DMV Road Test Simulation',
      'Parallel Parking & Reverse Bay Docking',
      'Uncontrolled 4-Way Stop Scenarios',
      'Nervous & Anxious Beginners'
    ],
    pricingPackages: [
      { id: 'eval-1hr', name: '1-Hour Safe Ground Evaluation', price: 75, duration: '60 mins', desc: 'Focus on vehicle controls, friction point, and cone drills.' },
      { id: 'dmv-2hr', name: '2-Hour DMV Test Route Simulation', price: 140, duration: '120 mins', desc: 'Drive the exact examiner test route with live mock scoring.' },
      { id: 'full-6hr', name: '6-Hour Teen State Certification Pack', price: 390, duration: '6 hours', desc: 'Fulfills state commercial behind-the-wheel certification.' }
    ],
    meetAtGrounds: ['candlestick-open-ground', 'ccsf-lower-parking', 'civic-center-plaza', 'stadium-runway'],
    availableToday: true,
    nextSlot: 'Today at 3:30 PM'
  },
  {
    id: 'inst-sarah-chen',
    name: 'Sarah Chen',
    schoolName: 'Pacific Coast Driving Institute',
    title: 'Teen & Nervous Driver Coach',
    rating: 4.98,
    reviewsCount: 226,
    studentsPassed: 530,
    hourlyRate: 80,
    car: '2023 Toyota Corolla Hybrid (Dual-Pedal Safety)',
    transmission: ['Automatic'],
    phone: '(415) 762-9902',
    licenseNumber: 'CA-DS-81042',
    bio: 'Calm, patient, zero-yelling instructor specializing in teens and high-anxiety learners. 98% first-try DMV pass rate.',
    specialties: [
      'High-Anxiety & Calming Techniques',
      'Smooth Highway Merging',
      'Pedestrian Scan & Blind-Spot Checks',
      'Night Driving Hours'
    ],
    pricingPackages: [
      { id: 'eval-1hr', name: '1-Hour Parking Lot Calibration', price: 80, duration: '60 mins', desc: 'Cones, mirror setup, and smooth braking.' },
      { id: 'dmv-2hr', name: '2-Hour DMV Prep & Mock Test', price: 150, duration: '120 mins', desc: 'Strict DMV examiner mock trial.' },
      { id: 'night-2hr', name: '2-Hour Certified Night Driving', price: 160, duration: '120 mins', desc: 'Fulfill night driving requirements safely.' }
    ],
    meetAtGrounds: ['ccsf-lower-parking', 'quiet-boulevard', 'ocean-beach-lot'],
    availableToday: true,
    nextSlot: 'Tomorrow at 10:00 AM'
  },
  {
    id: 'inst-marcus-vance',
    name: 'Marcus Vance',
    schoolName: 'Apex Stick-Shift & Performance Control',
    title: 'Manual Transmission & Motorcycle MSF Coach',
    rating: 4.94,
    reviewsCount: 142,
    studentsPassed: 280,
    hourlyRate: 85,
    car: '2022 Mazda 3 (6-Speed Manual) + Yamaha MT-03',
    transmission: ['Manual', 'Automatic', 'Motorcycle'],
    phone: '(415) 630-1188',
    licenseNumber: 'CA-DS-90412',
    bio: 'Teaches clutch biting point, hill-starts without rolling back, downshift rev-matching, and motorcycle parking-lot friction zones.',
    specialties: [
      'Manual Stick-Shift Clutch Mastery',
      'Hill Starts Without Handbrake Rollback',
      'Motorcycle MSF Cone Drills & Figure-8',
      'Emergency Threshold Braking'
    ],
    pricingPackages: [
      { id: 'manual-2hr', name: '2-Hour Clutch & Stick-Shift Boot Camp', price: 160, duration: '120 mins', desc: 'Learn manual clutch control from scratch without stalling.' },
      { id: 'msf-2hr', name: '2-Hour Motorcycle Parking-Lot Drills', price: 150, duration: '120 mins', desc: 'Box turns, swerves, and emergency stops on cones.' }
    ],
    meetAtGrounds: ['candlestick-open-ground', 'industrial-tech-loop', 'stadium-runway'],
    availableToday: false,
    nextSlot: 'Thursday at 1:00 PM'
  }
];

export const getInstructorsForGround = (groundId) => {
  const matched = DRIVING_INSTRUCTORS.filter(inst => 
    inst.meetAtGrounds.includes(groundId)
  );
  return matched.length > 0 ? matched : DRIVING_INSTRUCTORS;
};
