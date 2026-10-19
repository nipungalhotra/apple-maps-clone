export const PRESET_PLACES = [
  {
    id: 'apple-park',
    name: 'Apple Park',
    subtitle: '1 Apple Park Way, Cupertino, CA',
    category: 'Landmark',
    coordinates: [-122.0090, 37.3349],
    rating: 4.9,
    reviewsCount: 14820,
    priceLevel: 'Free',
    isOpen: true,
    hours: 'Open until 7:00 PM',
    phone: '+1 (408) 996-1010',
    website: 'https://www.apple.com',
    photos: [
      'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80'
    ],
    description: "Apple's corporate headquarters featuring the iconic circular ring design, Steve Jobs Theater, and the public Visitor Center with augmented reality experiences.",
    amenities: ['Wheelchair accessible', 'Restrooms', 'Apple Store', 'Caffè Macs', 'EV Charging']
  },
  {
    id: 'golden-gate',
    name: 'Golden Gate Bridge',
    subtitle: 'San Francisco, CA 94129',
    category: 'Sightseeing',
    coordinates: [-122.4783, 37.8199],
    rating: 4.8,
    reviewsCount: 39512,
    priceLevel: '$9.00 Toll',
    isOpen: true,
    hours: 'Open 24 hours',
    phone: '+1 (415) 921-5858',
    website: 'https://www.goldengate.org',
    photos: [
      'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&w=800&q=80'
    ],
    description: "The world-famous suspension bridge spanning the Golden Gate strait between San Francisco and Marin County. Known for its International Orange color and Art Deco towers.",
    amenities: ['Pedestrian Walkway', 'Bike Path', 'Welcome Center', 'Scenic Overlooks']
  },
  {
    id: 'ferry-building',
    name: 'Ferry Building Marketplace',
    subtitle: '1 Ferry Building, San Francisco, CA',
    category: 'Food & Drink',
    coordinates: [-122.3937, 37.7955],
    rating: 4.7,
    reviewsCount: 9240,
    priceLevel: '$$',
    isOpen: true,
    hours: 'Open until 8:00 PM',
    phone: '+1 (415) 983-8030',
    website: 'https://www.ferrybuildingmarketplace.com',
    photos: [
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'
    ],
    description: "Historic transit hub and world-renowned food hall hosting artisanal food merchants, local restaurants, and the celebrated thrice-weekly Farmers Market.",
    amenities: ['Dine-in', 'Outdoor Seating', 'Waterfront Views', 'Ferry Terminals']
  },
  {
    id: 'alcatraz-island',
    name: 'Alcatraz Island',
    subtitle: 'San Francisco Bay, CA',
    category: 'Museum',
    coordinates: [-122.4230, 37.8270],
    rating: 4.7,
    reviewsCount: 22100,
    priceLevel: '$$$',
    isOpen: true,
    hours: 'First ferry 8:40 AM',
    phone: '+1 (415) 561-4900',
    website: 'https://www.nps.gov/alca',
    photos: [
      'https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=800&q=80'
    ],
    description: "Iconic former federal maximum-security penitentiary that held Al Capone and Machine Gun Kelly, now a national park with audio tours.",
    amenities: ['Audio Tour Included', 'Historic Exhibits', 'Ferry Access Only']
  },
  {
    id: 'palace-fine-arts',
    name: 'Palace of Fine Arts',
    subtitle: '3301 Lyon St, San Francisco, CA',
    category: 'Sightseeing',
    coordinates: [-122.4488, 37.8029],
    rating: 4.8,
    reviewsCount: 16400,
    priceLevel: 'Free',
    isOpen: true,
    hours: 'Open 24 hours',
    phone: '+1 (415) 563-6504',
    website: 'https://palaceoffinearts.org',
    photos: [
      'https://images.unsplash.com/photo-1541464522988-31b420f688b9?auto=format&fit=crop&w=800&q=80'
    ],
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
