/**
 * Guide pages published as static HTML at /guides/<slug>/ (see scripts/build-guides.mjs).
 *
 * RULE: every fact about a state's licensing rules must come from that state's official
 * DMV site, listed in `sources`, with `checkedOn` set to the date it was checked.
 * Do not add a state from memory or from third-party sites. Re-check each guide at least
 * every 6 months and whenever a state announces changes.
 */

export const GUIDES = [
  {
    slug: 'california-learner-permit-practice-hours',
    state: 'California',
    title: 'California learner’s permit: how many practice hours do you need?',
    metaDescription:
      'California teens need 50 hours of supervised practice (10 at night), 6 hours of professional training and 6 months with a permit before the drive test. Checklist and tips.',
    intro:
      'If you are under 18 in California, these are the steps from learner’s permit to driving test, and the practice you need to log along the way.',
    facts: [
      ['Permit age', 'At least 15½ and under 18'],
      ['Before the permit', 'Driver education certificate (completion or enrollment), a parent/guardian signature on the application, a vision exam and a knowledge test (80% to pass)'],
      ['Supervised practice', '50 hours with a licensed adult aged 25 or older'],
      ['Night practice', '10 of the 50 hours'],
      ['Professional training', '6 hours with a licensed driving school'],
      ['Time holding the permit', 'At least 6 months before the drive test (the permit is valid for up to one year)'],
      ['If you fail the drive test', 'Wait 15 days to retake; 3 attempts before you need to reapply'],
      ['First year with a license (under 18)', 'No driving 11 p.m.–5 a.m., and no passengers under 20 unless a licensed driver aged 25+ is with you']
    ],
    sections: [
      {
        heading: 'Your path to a California license',
        steps: [
          'Start or finish driver education and get your certificate.',
          'Apply for your instruction permit at a DMV office with a parent or guardian’s signature; pass the vision exam and knowledge test.',
          'Book your 6 hours of training with a licensed driving school.',
          'Log 50 hours of supervised practice, including 10 at night, with a licensed adult aged 25 or older.',
          'After at least 6 months with your permit, take the drive test.'
        ]
      },
      {
        heading: 'Making 50 hours manageable',
        bullets: [
          'About 2 hours a week gets you to 50 hours in roughly six months, the same time you have to hold the permit anyway.',
          'Start in an empty parking lot: pedals, steering, smooth stops and turns before any traffic.',
          'Move to quiet residential streets, then busier roads, then freeway merging once the basics feel automatic.',
          'Spread night practice across the six months rather than leaving all 10 hours to the end.',
          'Write down every session (date, time, hours, day or night) as you go. Reconstructing it later is hard.'
        ]
      }
    ],
    faqs: [
      ['How many hours of practice do I need in California?', '50 hours of supervised practice, and 10 of those must be at night. You also need 6 hours of training with a licensed driving school.'],
      ['Who can supervise my practice?', 'A licensed adult who is 25 or older.'],
      ['How long do I have to hold my permit?', 'At least 6 months before you can take the drive test. The permit is valid for up to one year.'],
      ['What happens if I fail the drive test?', 'You wait 15 days before retaking it, and you have 3 attempts before you need to reapply.']
    ],
    sources: [
      { label: 'California DMV — Teen Driver Roadmap', url: 'https://www.dmv.ca.gov/portal/teen-drivers/' },
      { label: 'California DMV — Instruction and Learner’s Permits', url: 'https://www.dmv.ca.gov/portal/driver-licenses-identification-cards/learners-permits/' }
    ],
    checkedOn: '2026-11-05'
  },
  {
    slug: 'san-francisco-places-to-practice-driving',
    state: 'California',
    kind: 'spots',
    city: 'San Francisco Bay Area',
    title: 'Places to practice driving in San Francisco',
    metaDescription:
      'Empty lots and quiet roads around San Francisco where learner drivers can practise starts, turns, braking and parking, with suggested drills for each.',
    intro:
      'Starting in a big, empty space takes the stress out of the first few hours behind the wheel. These are the San Francisco Bay Area spots in RoadReady, with the drills that suit each one.',
    sources: [],
    checkedOn: null
  }
];

export const guideUrl = (slug) => `/guides/${slug}/`;
