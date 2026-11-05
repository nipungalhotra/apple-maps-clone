export const PRESET_PLACES = [
  {
    id: 'golden-gate',
    name: 'Golden Gate Bridge',
    subtitle: 'San Francisco, CA 94129',
    category: 'Sightseeing',
    coordinates: [-122.4783, 37.8199],
    priceLevel: '$9.00 Toll',
    phone: '+1 (415) 921-5858',
    website: 'https://www.goldengate.org',
    description: "The world-famous suspension bridge spanning the Golden Gate strait between San Francisco and Marin County. Known for its International Orange color and Art Deco towers.",
    amenities: ['Pedestrian Walkway', 'Bike Path', 'Welcome Center', 'Scenic Overlooks']
  },
  {
    id: 'ferry-building',
    name: 'Ferry Building Marketplace',
    subtitle: '1 Ferry Building, San Francisco, CA',
    category: 'Food & Drink',
    coordinates: [-122.3937, 37.7955],
    priceLevel: '$$',
    phone: '+1 (415) 983-8030',
    website: 'https://www.ferrybuildingmarketplace.com',
    description: "Historic transit hub and world-renowned food hall hosting artisanal food merchants, local restaurants, and the celebrated thrice-weekly Farmers Market.",
    amenities: ['Dine-in', 'Outdoor Seating', 'Waterfront Views', 'Ferry Terminals']
  },
  {
    id: 'alcatraz-island',
    name: 'Alcatraz Island',
    subtitle: 'San Francisco Bay, CA',
    category: 'Museum',
    coordinates: [-122.4230, 37.8270],
    priceLevel: '$$$',
    phone: '+1 (415) 561-4900',
    website: 'https://www.nps.gov/alca',
    description: "Iconic former federal maximum-security penitentiary that held Al Capone and Machine Gun Kelly, now a national park with audio tours.",
    amenities: ['Audio Tour Included', 'Historic Exhibits', 'Ferry Access Only']
  },
  {
    id: 'palace-fine-arts',
    name: 'Palace of Fine Arts',
    subtitle: '3301 Lyon St, San Francisco, CA',
    category: 'Sightseeing',
    coordinates: [-122.4488, 37.8029],
    priceLevel: 'Free',
    phone: '+1 (415) 563-6504',
    website: 'https://palaceoffinearts.org',
    description: "Monumental Greco-Roman rotunda and colonnades originally built for the 1915 Panama-Pacific International Exposition.",
    amenities: ['Lagoon Walk', 'Photography Spot', 'Theater']
  }
];

export const CATEGORIES = [
  { id: 'explore', label: 'Explore', icon: 'Compass', color: '#007AFF' },
  { id: 'food', label: 'Food & Drink', icon: 'Utensils', color: '#FF9500' },
  { id: 'gas', label: 'Gas / EV', icon: 'Fuel', color: '#34C759' },
  { id: 'grocery', label: 'Groceries', icon: 'ShoppingBag', color: '#5856D6' },
  { id: 'parking', label: 'Parking', icon: 'CircleParking', color: '#AF52DE' },
  { id: 'transit', label: 'Transit', icon: 'Train', color: '#5AC8FA' },
];
