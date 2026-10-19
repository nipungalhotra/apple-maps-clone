/**
 * Crowdsourced Community Reports & Ground Status
 */

export const INITIAL_COMMUNITY_REPORTS = {
  'candlestick-open-ground': [
    {
      id: 'rep-1',
      author: 'David M. (Instructor)',
      timeAgo: '2 hours ago',
      gateStatus: 'Wide Open',
      securityStatus: 'Zero Security / Safe',
      surfaceCondition: 'Dry & Clean',
      allowCones: true,
      comment: 'Brought 2 students here this morning. Completely empty, brought 10 cones and practiced parallel parking uninterrupted!'
    },
    {
      id: 'rep-2',
      author: 'Sarah K. (Motorcycle Learner)',
      timeAgo: 'Yesterday',
      gateStatus: 'Open',
      securityStatus: 'None',
      surfaceCondition: 'Smooth Asphalt',
      allowCones: true,
      comment: 'Perfect for friction zone drills. Great breeze from the bay keeps the engine cool.'
    }
  ],
  'alameda-point-runway': [
    {
      id: 'rep-3',
      author: 'Marcus P.',
      timeAgo: '3 hours ago',
      gateStatus: 'Open via West Tower Ave',
      securityStatus: 'Patrol wave only',
      surfaceCondition: 'Concrete Runway Clean',
      allowCones: true,
      comment: 'Over 500 meters of open tarmac. Other beginners were practicing manual transmission hill starts on the gentle ramp.'
    }
  ],
  'ccsf-lower-parking': [
    {
      id: 'rep-4',
      author: 'Emily R.',
      timeAgo: '1 day ago',
      gateStatus: 'Open on Weekends',
      securityStatus: 'None on Sunday',
      surfaceCondition: 'Painted Bays Visible',
      allowCones: true,
      comment: 'The painted parking lines make it super easy to know if you are crooked when practicing reverse bay parking!'
    }
  ]
};
