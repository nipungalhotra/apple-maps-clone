/**
 * Official DMV Driving Test Routes & Examiner Checkpoints
 */

export const DMV_TEST_ROUTES = [
  {
    id: 'dmv-sf-fell',
    name: 'San Francisco DMV Official Test Route',
    officeName: 'SF Central DMV (1377 Fell St)',
    coordinates: [-122.4385, 37.7735],
    durationMins: 18,
    distanceMiles: 3.4,
    passScoreThreshold: 85,
    description: 'The standard urban licensing course testing multi-lane navigation, one-way transitions, pedestrian awareness, and hill parking.',
    checkpoints: [
      {
        id: 'cp-1',
        title: 'Fell St Departure & Signal Check',
        instruction: 'Check mirrors, signal left for 3 seconds, look over shoulder, and smoothly merge into traffic.',
        points: 15,
        criteria: 'Mirror-Signal-Shoulder check sequence'
      },
      {
        id: 'cp-2',
        title: 'Baker St 4-Way Stop Sign',
        instruction: 'Come to a complete stop before the limit line. Hold for 3 seconds. Check left, center, right, left before proceeding.',
        points: 20,
        criteria: 'Complete halt, zero rolling stop'
      },
      {
        id: 'cp-3',
        title: 'Curb Alignment & 30-Foot Reverse',
        instruction: 'Pull smoothly parallel within 12 inches of the curb. Reverse straight for 3 car lengths looking out the back window.',
        points: 25,
        criteria: 'Parallel to curb, head turned backward'
      },
      {
        id: 'cp-4',
        title: 'Oak St Hill Parking & Wheel Angle',
        instruction: 'Park on the gentle slope: turn wheels towards curb (downhill) or away from curb (uphill). Engage emergency brake.',
        points: 20,
        criteria: 'Correct wheel turn direction + handbrake'
      },
      {
        id: 'cp-5',
        title: 'Final Return & Bay Parking',
        instruction: 'Enter DMV lot at 5 mph, signal, and center vehicle evenly between painted bay lines.',
        points: 20,
        criteria: 'Vehicle centered, smooth braking'
      }
    ],
    pathCoordinates: [
      [-122.4385, 37.7735],
      [-122.4410, 37.7740],
      [-122.4435, 37.7715],
      [-122.4415, 37.7690],
      [-122.4365, 37.7710],
      [-122.4385, 37.7735]
    ]
  },
  {
    id: 'dmv-daly-city',
    name: 'Daly City Suburban Licensing Route',
    officeName: 'Daly City DMV (1500 Sullivan Ave)',
    coordinates: [-122.4705, 37.6910],
    durationMins: 20,
    distanceMiles: 4.2,
    passScoreThreshold: 85,
    description: 'Suburban route featuring residential speed limits, uncontrolled T-intersections, roundabouts, and school zone speed reductions.',
    checkpoints: [
      {
        id: 'dc-1',
        title: 'Sullivan Ave Pull-Out',
        instruction: 'Signal, check mirrors, shoulder check, merge smoothly without forcing other vehicles to slow down.',
        points: 15,
        criteria: 'Safe gap selection'
      },
      {
        id: 'dc-2',
        title: '25 MPH Speed Zone Consistency',
        instruction: 'Maintain a steady speed between 22 and 25 mph. Do not exceed the posted 25 mph limit.',
        points: 20,
        criteria: 'Steady throttle, speed adherence'
      },
      {
        id: 'dc-3',
        title: 'Uncontrolled T-Intersection Yield',
        instruction: 'Approach with foot hovering over brake. Yield right-of-way to through traffic before executing turn.',
        points: 25,
        criteria: 'Defensive scanning & proper yield'
      },
      {
        id: 'dc-4',
        title: '3-Point Turn in Cul-de-sac',
        instruction: 'Complete 3-point turn using full lock steering with 360-degree blind spot checks before each directional shift.',
        points: 20,
        criteria: 'Zero curb touches, continuous scanning'
      },
      {
        id: 'dc-5',
        title: 'DMV Approach & Bay Reversal',
        instruction: 'Back into the designated testing stall using side mirrors.',
        points: 20,
        criteria: 'Centered within 6 inches of lines'
      }
    ],
    pathCoordinates: [
      [-122.4705, 37.6910],
      [-122.4750, 37.6930],
      [-122.4780, 37.6890],
      [-122.4730, 37.6860],
      [-122.4690, 37.6880],
      [-122.4705, 37.6910]
    ]
  }
];
