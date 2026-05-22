// ─── Design Tokens ───────────────────────────────────────────────────────────
export const M = {
  red:    '#A8262A',
  redDark:'#7d1c1f',
  black:  '#1A1A1A',
  gold:   '#C9A84C',
  teal:   '#006B6B',
  coral:  '#E8725A',
  green:  '#2E7D32',
  gray1:  '#F7F5F2',
  gray2:  '#EDEBE7',
  gray3:  '#D4D0C8',
  gray4:  '#9E9B93',
  gray5:  '#6B6860',
  white:  '#FFFFFF',
};
export const sans  = "'Inter', 'Helvetica Neue', Arial, sans-serif";
export const serif = "'Georgia', 'Times New Roman', serif";

// ─── Trip Metadata ────────────────────────────────────────────────────────────
export const TRIP = {
  id:          'trip-orlando-2026',
  name:        'Orlando Family Adventure',
  destination: 'Orlando, FL',
  startDate:   'Jul 12, 2026',
  endDate:     'Jul 18, 2026',
  startISO:    '2026-07-12',
  endISO:      '2026-07-18',
  families:    5,
  travelers:   18,
  bonvoyPts:   62000,
  shareLink:   'https://crewfare.app/trip/orlando-2026',
  discountRooms: 10,
  discountPct:   12,
};

// ─── Group Members (blank slate — populated at runtime) ──────────────────────
export const MEMBERS = [];

// ─── Hotels ───────────────────────────────────────────────────────────────────
export const HOTELS = [
  {
    id:        'h1',
    name:      'Orlando World Center Marriott',
    badge:     "★ Organizer's Hotel",
    highlight: true,
    address:   '8701 World Center Dr, Orlando, FL',
    distance:  '0.3 mi to Disney Springs',
    stars:     4.6,
    rate:      289,
    originalRate: 329,
    amenities: ['Pool Complex', 'Spa', 'Golf Course', 'Room Service', 'Kids Club', 'Free Shuttle'],
    image:     'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
    bookedBy:  [],
    bonvoyPts: 3200,
    hotelPriority: true,
  },
  {
    id:        'h2',
    name:      'JW Marriott Orlando Grande Lakes',
    badge:     'Luxury Pick',
    highlight: false,
    address:   '4040 Central Florida Pkwy, Orlando, FL',
    distance:  '1.2 mi to SeaWorld',
    stars:     4.8,
    rate:      359,
    originalRate: 399,
    amenities: ['Lazy River', 'Fine Dining', 'Spa', 'Tennis', 'Fitness Center'],
    image:     'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80',
    bookedBy:  [],
    bonvoyPts: 4100,
    hotelPriority: false,
  },
  {
    id:        'h3',
    name:      'Courtyard Orlando Lake Buena Vista',
    badge:     'Best Value',
    highlight: false,
    address:   '8623 Vineland Ave, Orlando, FL',
    distance:  '0.5 mi to Disney Springs',
    stars:     4.2,
    rate:      169,
    originalRate: 199,
    amenities: ['Pool', 'Bistro', 'Free Parking', 'Fitness Center'],
    image:     'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80',
    bookedBy:  [],
    bonvoyPts: 1800,
    hotelPriority: false,
  },
  {
    id:        'h4',
    name:      'Renaissance Orlando at SeaWorld',
    badge:     'Near Parks',
    highlight: false,
    address:   '6677 Sea Harbor Dr, Orlando, FL',
    distance:  'Adjacent to SeaWorld',
    stars:     4.4,
    rate:      229,
    originalRate: 269,
    amenities: ['Pool', 'Restaurant', 'Bar', 'Meeting Rooms', 'Shuttle to Parks'],
    image:     'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80',
    bookedBy:  [],
    bonvoyPts: 2500,
    hotelPriority: false,
  },
];

// ─── Activities (blank slate — attendees submit their own ideas) ──────────────
export const ACTIVITIES = [];

// ─── Itinerary (blank slate — organizer fills in) ────────────────────────────
export const ITINERARY = [];

// ─── Tab definitions ──────────────────────────────────────────────────────────
export const TABS = [
  { id: 'home',       label: 'Home',             icon: '🏠' },
  { id: 'hotels',     label: 'Hotels',           icon: '🏨' },
  { id: 'activities', label: 'Activities',       icon: '🎯' },
  { id: 'itinerary',  label: 'Itinerary',        icon: '📅' },
  { id: 'expenses',   label: 'Expense Tracking', icon: '🧾' },
  { id: 'memories',   label: 'Memories',         icon: '📸' },
  { id: 'invite',     label: 'Invite',           icon: '✉️'  },
];

// ─── Activity Category Colors ─────────────────────────────────────────────────
export const CATEGORY_COLORS = {
  'Theme Park':      M.red,
  'Educational':     M.teal,
  'Pool / Resort':   M.gold,
  'Wellness':        '#7B68EE',
  'Outdoor':         M.green,
  'Food & Beverage': M.coral,
  'Other':           M.gray5,
};

export const TYPE_COLORS = {
  hotel:    M.teal,
  activity: M.red,
  food:     M.coral,
  personal: '#7B68EE',
  transport:'#4A90D9',
};

// ─── Mock Photos ──────────────────────────────────────────────────────────────
export const MOCK_PHOTOS = [
  { id: 'p1', url: 'https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=400&q=70', label: 'Arrival',   day: 'Jul 12', caption: '' },
  { id: 'p2', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=70', label: 'Adventure', day: 'Jul 13', caption: '' },
  { id: 'p3', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&q=70', label: 'Pool',      day: 'Jul 12', caption: '' },
  { id: 'p4', url: 'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=400&q=70', label: 'Food',      day: 'Jul 13', caption: '' },
  { id: 'p5', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=70', label: 'Culture',   day: 'Jul 15', caption: '' },
  { id: 'p6', url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&q=70', label: 'Family',    day: 'Jul 16', caption: '' },
];
