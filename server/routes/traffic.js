import express from 'express';

const router = express.Router();

// Real-Time Local Traffic Congestion Vectors & Incidents
router.get('/', (req, res) => {
  const lat = parseFloat(req.query.lat) || 37.7749;
  const lng = parseFloat(req.query.lng) || -122.4194;

  const currentHour = new Date().getHours();
  const isRushHour = (currentHour >= 8 && currentHour <= 10) || (currentHour >= 17 && currentHour <= 19);

  // Generate real-time flow road segment vectors
  const segments = [
    {
      id: 'traf-seg-1',
      name: 'Main Arterial Northbound',
      congestion: isRushHour ? 'heavy' : 'moderate',
      speedMph: isRushHour ? 9 : 28,
      color: isRushHour ? '#FF3B30' : '#FFCC00',
      coordinates: [
        [lng - 0.006, lat - 0.008],
        [lng - 0.002, lat],
        [lng + 0.001, lat + 0.008]
      ]
    },
    {
      id: 'traf-seg-2',
      name: 'Main Arterial Southbound',
      congestion: isRushHour ? 'moderate' : 'low',
      speedMph: isRushHour ? 19 : 34,
      color: isRushHour ? '#FFCC00' : '#34C759',
      coordinates: [
        [lng + 0.0015, lat + 0.008],
        [lng - 0.0015, lat],
        [lng - 0.0055, lat - 0.008]
      ]
    },
    {
      id: 'traf-seg-3',
      name: 'Cross-Town Connector West',
      congestion: 'low',
      speedMph: 32,
      color: '#34C759',
      coordinates: [
        [lng - 0.012, lat + 0.003],
        [lng - 0.004, lat + 0.003],
        [lng + 0.005, lat + 0.004]
      ]
    },
    {
      id: 'traf-seg-4',
      name: 'Practice Access Ring Road',
      congestion: 'low',
      speedMph: 15,
      color: '#34C759',
      coordinates: [
        [lng + 0.004, lat - 0.006],
        [lng + 0.008, lat - 0.002],
        [lng + 0.010, lat + 0.003]
      ]
    },
    {
      id: 'traf-seg-5',
      name: 'Downtown Commercial Corridor',
      congestion: isRushHour ? 'heavy' : 'moderate',
      speedMph: isRushHour ? 6 : 18,
      color: isRushHour ? '#FF3B30' : '#FFCC00',
      coordinates: [
        [lng - 0.008, lat + 0.006],
        [lng - 0.002, lat + 0.006],
        [lng + 0.006, lat + 0.007]
      ]
    },
    {
      id: 'traf-seg-6',
      name: 'Quiet Residential Perimeter Loop',
      congestion: 'low',
      speedMph: 15,
      color: '#34C759',
      coordinates: [
        [lng - 0.010, lat - 0.003],
        [lng - 0.008, lat - 0.007],
        [lng - 0.003, lat - 0.007],
        [lng - 0.002, lat - 0.004]
      ]
    }
  ];

  // Dynamic Real-Time Incidents (Accidents, Construction, Slowdowns)
  const incidents = [
    {
      id: 'inc-1',
      type: 'construction',
      title: 'Lane Resurfacing & Cones Active',
      delayMinutes: 4,
      coordinates: [lng - 0.004, lat + 0.005],
      severity: 'moderate'
    },
    {
      id: 'inc-2',
      type: 'congestion',
      title: 'School Zone Active (15 MPH Limit)',
      delayMinutes: isRushHour ? 7 : 2,
      coordinates: [lng + 0.003, lat - 0.002],
      severity: isRushHour ? 'high' : 'low'
    }
  ];

  const features = segments.map(seg => ({
    type: 'Feature',
    id: seg.id,
    properties: {
      id: seg.id,
      name: seg.name,
      congestion: seg.congestion,
      speedMph: seg.speedMph,
      color: seg.color
    },
    geometry: {
      type: 'LineString',
      coordinates: seg.coordinates
    }
  }));

  res.json({
    type: 'FeatureCollection',
    isRushHour,
    currentHour,
    overallTrafficIndex: isRushHour ? 78 : 28,
    legend: {
      green: 'Free Flow (Ideal for Learners)',
      yellow: 'Moderate Activity',
      red: 'Congested / Heavy Traffic'
    },
    features,
    incidents
  });
});

export default router;
