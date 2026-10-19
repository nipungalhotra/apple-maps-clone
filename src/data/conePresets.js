/**
 * Virtual Cone Course Presets
 * Generates relative cone coordinates (offsets in meters) around a chosen center anchor
 */

export const CONE_PRESETS = [
  {
    id: 'slalom',
    name: 'Slalom Weave Track',
    description: '5 in-line cones spaced 8 meters apart. Practice smooth steering, progressive throttle, and bike leaning.',
    difficulty: 'Beginner',
    vehicle: 'Both',
    icon: 'Activity',
    generateCones: (centerLng, centerLat) => {
      // 5 cones placed in a line with slight lateral offset
      return [0, 1, 2, 3, 4].map(i => ({
        id: `cone-slalom-${i}`,
        type: 'orange',
        label: `${i + 1}`,
        lng: centerLng + (i - 2) * 0.00014,
        lat: centerLat + (i % 2 === 0 ? 0.00004 : -0.00004)
      }));
    }
  },
  {
    id: 'parallel-box',
    name: 'Parallel Parking Box',
    description: 'Exact regulation parking bay (6m x 2.4m). Practice reverse angle cut and straightening.',
    difficulty: 'Intermediate',
    vehicle: 'Car',
    icon: 'Square',
    generateCones: (centerLng, centerLat) => {
      return [
        { id: 'cone-p1', type: 'orange', label: 'Front L', lng: centerLng - 0.00012, lat: centerLat + 0.00006 },
        { id: 'cone-p2', type: 'orange', label: 'Front R', lng: centerLng + 0.00012, lat: centerLat + 0.00006 },
        { id: 'cone-p3', type: 'orange', label: 'Rear L', lng: centerLng - 0.00012, lat: centerLat - 0.00006 },
        { id: 'cone-p4', type: 'orange', label: 'Rear R', lng: centerLng + 0.00012, lat: centerLat - 0.00006 },
        { id: 'cone-p5', type: 'white', label: 'Curb 1', lng: centerLng - 0.00012, lat: centerLat - 0.00012 },
        { id: 'cone-p6', type: 'white', label: 'Curb 2', lng: centerLng + 0.00012, lat: centerLat - 0.00012 }
      ];
    }
  },
  {
    id: 'figure-8',
    name: 'Motorcycle Figure-8',
    description: 'Two center pivot cones with 8 perimeter boundary gates. Practice head rotation and counter-balancing.',
    difficulty: 'Essential',
    vehicle: 'Bike',
    icon: 'RotateCw',
    generateCones: (centerLng, centerLat) => {
      const cones = [
        { id: 'cone-f1', type: 'orange', label: 'Pivot 1', lng: centerLng - 0.00010, lat: centerLat },
        { id: 'cone-f2', type: 'orange', label: 'Pivot 2', lng: centerLng + 0.00010, lat: centerLat }
      ];
      // 8 perimeter markers
      for (let angle = 0; angle < 360; angle += 45) {
        const rad = (angle * Math.PI) / 180;
        cones.push({
          id: `cone-perim-${angle}`,
          type: 'white',
          label: '',
          lng: centerLng + Math.cos(rad) * 0.00022,
          lat: centerLat + Math.sin(rad) * 0.00014
        });
      }
      return cones;
    }
  },
  {
    id: 'three-point-box',
    name: '3-Point Turn Enclosure',
    description: 'Simulates a narrow 8-meter road dead-end to master full-lock turning and reverse clearance.',
    difficulty: 'Intermediate',
    vehicle: 'Car',
    icon: 'Repeat',
    generateCones: (centerLng, centerLat) => {
      return [
        { id: 'cone-3p-1', type: 'orange', label: 'Curb L1', lng: centerLng - 0.00015, lat: centerLat + 0.00008 },
        { id: 'cone-3p-2', type: 'orange', label: 'Curb L2', lng: centerLng, lat: centerLat + 0.00008 },
        { id: 'cone-3p-3', type: 'orange', label: 'Curb L3', lng: centerLng + 0.00015, lat: centerLat + 0.00008 },
        { id: 'cone-3p-4', type: 'white', label: 'Curb R1', lng: centerLng - 0.00015, lat: centerLat - 0.00008 },
        { id: 'cone-3p-5', type: 'white', label: 'Curb R2', lng: centerLng, lat: centerLat - 0.00008 },
        { id: 'cone-3p-6', type: 'white', label: 'Curb R3', lng: centerLng + 0.00015, lat: centerLat - 0.00008 }
      ];
    }
  }
];
