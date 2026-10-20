// Model 4: Motorcycle Safety Course (MSF) Basic RiderCourse Prep Pack Data
// Exact parking lot cone dimensions for official MSF & CMSP licensing evaluations

export const MSF_DRILLS = [
  {
    id: 'msf-box-figure8',
    name: 'The MSF U-Turn Box (Figure-8)',
    subtitle: 'Exercise #10: Slow-speed friction zone & head turns',
    dimensions: '20ft x 60ft Box (≤600cc) or 24ft x 60ft (>600cc)',
    failCondition: 'Foot dab (-5 pts) or boundary line tire touch (-8 pts)',
    techniqueTips: [
      'Turn head & eyes completely toward the opposite corner before initiating turn',
      'Keep clutch slipping in the friction zone — never fully release or pull all the way in',
      'Lightly drag the rear brake for stabilization; never touch the front brake in low-speed turn'
    ],
    generateCones: (centerLng, centerLat) => {
      const cones = [];
      const dLat = 0.00015; // ~16 meters / 52 ft
      const dLng = 0.00008; // ~7 meters / 23 ft
      
      // 4 Corner Cones
      cones.push({ id: 'box-c1', label: 'C1', type: 'orange', lng: centerLng - dLng, lat: centerLat - dLat });
      cones.push({ id: 'box-c2', label: 'C2', type: 'orange', lng: centerLng + dLng, lat: centerLat - dLat });
      cones.push({ id: 'box-c3', label: 'C3', type: 'orange', lng: centerLng + dLng, lat: centerLat + dLat });
      cones.push({ id: 'box-c4', label: 'C4', type: 'orange', lng: centerLng - dLng, lat: centerLat + dLat });
      
      // Mid-point reference cones
      cones.push({ id: 'box-mid1', label: 'Mid-L', type: 'yellow', lng: centerLng - dLng, lat: centerLat });
      cones.push({ id: 'box-mid2', label: 'Mid-R', type: 'yellow', lng: centerLng + dLng, lat: centerLat });
      
      // Center pivot point for figure-8 crossover
      cones.push({ id: 'box-pivot', label: 'Pivot', type: 'green', lng: centerLng, lat: centerLat });
      return cones;
    }
  },
  {
    id: 'msf-obstacle-swerve',
    name: 'The 15-MPH Obstacle Swerve',
    subtitle: 'Exercise #12: Counter-steering around emergency barrier',
    dimensions: '12ft Swerve Gate with 8ft approach chute',
    failCondition: 'Touching barrier cone or braking while motorcycle is leaned',
    techniqueTips: [
      'Maintain steady 12-18 mph in 2nd gear through the approach chute',
      'Push right handlebar to swerve right; push left to swerve left (Counter-steering)',
      'Keep motorcycle upright before applying brakes after clearing barrier'
    ],
    generateCones: (centerLng, centerLat) => {
      const cones = [];
      // Approach Chute (4 cones)
      cones.push({ id: 'chute-1', label: 'A1', type: 'orange', lng: centerLng - 0.00005, lat: centerLat - 0.00020 });
      cones.push({ id: 'chute-2', label: 'A2', type: 'orange', lng: centerLng + 0.00005, lat: centerLat - 0.00020 });
      cones.push({ id: 'chute-3', label: 'A3', type: 'orange', lng: centerLng - 0.00005, lat: centerLat - 0.00010 });
      cones.push({ id: 'chute-4', label: 'A4', type: 'orange', lng: centerLng + 0.00005, lat: centerLat - 0.00010 });
      
      // Barrier Wall (3 red/orange cones)
      cones.push({ id: 'wall-1', label: 'Wall', type: 'red', lng: centerLng - 0.00003, lat: centerLat });
      cones.push({ id: 'wall-2', label: 'Wall', type: 'red', lng: centerLng, lat: centerLat });
      cones.push({ id: 'wall-3', label: 'Wall', type: 'red', lng: centerLng + 0.00003, lat: centerLat });
      
      // Escape Lane Exit Cones (Right side)
      cones.push({ id: 'esc-1', label: 'Exit', type: 'green', lng: centerLng + 0.00010, lat: centerLat + 0.00010 });
      cones.push({ id: 'esc-2', label: 'Exit', type: 'green', lng: centerLng + 0.00015, lat: centerLat + 0.00010 });
      return cones;
    }
  },
  {
    id: 'msf-quick-stop',
    name: 'Emergency Threshold Braking',
    subtitle: 'Exercise #11: Max braking from 15-20 mph without skid',
    dimensions: '35ft Cue Gate to Stop Line (Target ≤18ft stopping dist)',
    failCondition: 'Skidding front wheel or exceeding maximum allowable stop distance',
    techniqueTips: [
      'Apply smooth, progressive front brake pressure (70% total stopping power)',
      'Lightly apply rear brake without stomping or locking rear wheel',
      'Keep head and eyes up facing straight ahead; do not look down at the front fender'
    ],
    generateCones: (centerLng, centerLat) => {
      const cones = [];
      // Entry Gate
      cones.push({ id: 'stop-gate-1', label: 'Gate', type: 'yellow', lng: centerLng - 0.00006, lat: centerLat - 0.00015 });
      cones.push({ id: 'stop-gate-2', label: 'Gate', type: 'yellow', lng: centerLng + 0.00006, lat: centerLat - 0.00015 });
      
      // Braking Cue Line (Brake here)
      cones.push({ id: 'stop-cue-1', label: 'BRAKE', type: 'orange', lng: centerLng - 0.00006, lat: centerLat });
      cones.push({ id: 'stop-cue-2', label: 'BRAKE', type: 'orange', lng: centerLng + 0.00006, lat: centerLat });
      
      // Excellent Stop Line (13 ft)
      cones.push({ id: 'stop-target-1', label: '15ft Max', type: 'green', lng: centerLng - 0.00006, lat: centerLat + 0.00008 });
      cones.push({ id: 'stop-target-2', label: '15ft Max', type: 'green', lng: centerLng + 0.00006, lat: centerLat + 0.00008 });
      return cones;
    }
  },
  {
    id: 'msf-offset-slalom',
    name: 'Offset Cone Weave & Clutch Friction',
    subtitle: 'Exercise #6: Low-speed balance & counter-weighting',
    dimensions: '5 Cones spaced 12ft apart with 2ft alternating offset',
    failCondition: 'Hitting a cone or putting foot down',
    techniqueTips: [
      'Counter-weight by shifting body weight opposite to the bike lean',
      'Look two cones ahead, not at the cone directly in front of the tire'
    ],
    generateCones: (centerLng, centerLat) => {
      const cones = [];
      const offsets = [-0.00003, 0.00003, -0.00003, 0.00003, -0.00003];
      offsets.forEach((off, i) => {
        cones.push({
          id: `weave-${i}`,
          label: `${i + 1}`,
          type: 'orange',
          lng: centerLng + off,
          lat: centerLat - 0.00015 + (i * 0.000075)
        });
      });
      return cones;
    }
  }
];
