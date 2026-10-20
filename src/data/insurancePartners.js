// Model 3: Auto Insurance Affiliate Partners Data
// High-Ticket Affiliate CPA Integration ($50 - $120 per completed quote)

export const INSURANCE_PARTNERS = [
  {
    id: 'geico',
    name: 'GEICO',
    logo: '🦎',
    tagline: '15 Minutes Could Save You 15% or More',
    avgDiscount: '15% Driver Training Discount',
    estimatedAnnualSavings: 580,
    cpaPayout: 75.00,
    quoteTimeMins: '3 mins',
    features: [
      'Official Driver Education Certification Discount',
      'Good Student Discount (B average or higher)',
      '24/7 Roadside Assistance & Mobile Claim App'
    ],
    badge: 'Most Popular for Teens',
    affiliateUrl: 'https://www.geico.com/auto-insurance/?utm_source=apple_maps_learner&utm_medium=app_referral&utm_campaign=first_time_driver'
  },
  {
    id: 'progressive',
    name: 'Progressive',
    logo: '🔷',
    tagline: 'Snapshot® Telematics Safe Driver Discount',
    avgDiscount: 'Up to $156 First-Term Discount',
    estimatedAnnualSavings: 620,
    cpaPayout: 85.00,
    quoteTimeMins: '2 mins',
    features: [
      'Snapshot® mobile telematics rewards smooth driving',
      'Name Your Price® budget customization tool',
      'Multi-vehicle discount for family cars'
    ],
    badge: 'Best Telematics Match',
    affiliateUrl: 'https://www.progressive.com/auto/?utm_source=apple_maps_learner&utm_medium=app_referral&utm_campaign=dmv_pass'
  },
  {
    id: 'state-farm',
    name: 'State Farm',
    logo: '🔴',
    tagline: 'Steer Clear® Safe Driver Certification',
    avgDiscount: 'Up to 20% Under-25 Discount',
    estimatedAnnualSavings: 650,
    cpaPayout: 70.00,
    quoteTimeMins: '4 mins',
    features: [
      'Steer Clear® program recognizes 50-hour practice logs',
      'Dedicated local agent support for parents',
      'Student Away at School discount available'
    ],
    badge: 'Highest Parent Rating',
    affiliateUrl: 'https://www.statefarm.com/insurance/auto?utm_source=apple_maps_learner&utm_medium=app_referral&utm_campaign=steer_clear'
  },
  {
    id: 'root',
    name: 'Root Insurance',
    logo: '🌱',
    tagline: 'Rates Based Primarily on How You Drive',
    avgDiscount: 'Up to $900/year for Good Drivers',
    estimatedAnnualSavings: 720,
    cpaPayout: 95.00,
    quoteTimeMins: 'App test-drive',
    features: [
      'Zero penalty for being a young driver if you drive safely',
      'Test-drive directly on your smartphone',
      'App-native policy management'
    ],
    badge: 'Best for Tech-Savvy Teens',
    affiliateUrl: 'https://www.joinroot.com/?utm_source=apple_maps_learner&utm_medium=app_referral&utm_campaign=mobile_practice'
  }
];

export const calculateEstimatedInsuranceSavings = ({ age = 'teen', hasLogbook = true, goodStudent = true }) => {
  let baseSavings = 380;
  if (hasLogbook) baseSavings += 140; // 50-hr supervised driving discount
  if (goodStudent) baseSavings += 100; // Good student discount
  if (age === 'teen') baseSavings += 60; // Teen specific high baseline savings
  return baseSavings;
};
