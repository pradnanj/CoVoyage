/**
 * Fetches real Marriott-brand hotels near a destination using OpenStreetMap Overpass API.
 * No API key required. Returns hotels formatted for the CoVoyage app.
 */

// All Marriott International brand names (as they appear in OSM)
const MARRIOTT_BRANDS = [
  'marriott', 'jw marriott', 'westin', 'sheraton', 'w hotel', 'w hotels',
  'st. regis', 'st regis', 'le méridien', 'le meridien', 'luxury collection',
  'the luxury collection', 'tribute portfolio', 'design hotels', 'autograph collection',
  'renaissance', 'delta hotels', 'marriott executive apartments',
  'courtyard', 'courtyard by marriott', 'four points', 'four points by sheraton',
  'springhill suites', 'springhill suites by marriott', 'fairfield',
  'fairfield inn', 'fairfield inn & suites', 'ac hotels', 'ac hotel',
  'moxy hotels', 'moxy', 'element', 'element hotels', 'residence inn',
  'residence inn by marriott', 'towneplace suites', 'towneplace suites by marriott',
  'aloft', 'aloft hotels', 'gaylord hotels', 'gaylord',
];

// Unsplash hotel photo pool — real hotel-looking photos
const HOTEL_PHOTOS = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
  'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80',
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80',
  'https://images.unsplash.com/photo-1455587734955-081b22074882?w=600&q=80',
  'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=600&q=80',
];

const AMENITIES_BY_BRAND = {
  'jw marriott':       ['Spa', 'Fine Dining', 'Pool', 'Concierge', 'Fitness Center', 'Room Service'],
  'st. regis':         ['Butler Service', 'Spa', 'Fine Dining', 'Bar', 'Concierge', 'Pool'],
  'st regis':          ['Butler Service', 'Spa', 'Fine Dining', 'Bar', 'Concierge', 'Pool'],
  'w hotel':           ['AWAY Spa', 'WET Pool', 'FUEL Bar', 'Concierge', 'Fitness Center'],
  'w hotels':          ['AWAY Spa', 'WET Pool', 'FUEL Bar', 'Concierge', 'Fitness Center'],
  'westin':            ['Heavenly Spa', 'Pool', 'RunWESTIN', 'Fitness Center', 'Restaurant'],
  'sheraton':          ['Pool', 'Fitness Center', 'Restaurant', 'Bar', 'Meeting Rooms'],
  'renaissance':       ['Pool', 'R Bar', 'Fitness Center', 'Restaurant', 'Concierge'],
  'marriott':          ['Pool', 'Restaurant', 'Fitness Center', 'Bar', 'Room Service'],
  'courtyard':         ['Pool', 'Bistro', 'Fitness Center', 'Free Parking'],
  'fairfield':         ['Free Breakfast', 'Pool', 'Fitness Center', 'Free Parking'],
  'residence inn':     ['Free Breakfast', 'Kitchen Suite', 'Pool', 'Fitness Center'],
  'springhill suites': ['Free Breakfast', 'Pool', 'Fitness Center', 'Free Parking'],
  'aloft':             ['WXYZ Bar', 'Pool', 'Re:fuel Pantry', 'Fitness Center'],
  'moxy':              ['Bar', 'Fitness Center', 'Social Spaces'],
  'ac hotel':          ['AC Kitchen', 'AC Bar', 'Fitness Center', 'Pool'],
  'element':           ['Free Breakfast', 'Bike Rentals', 'Pool', 'Fitness Center', 'Kitchen Suite'],
  'four points':       ['Four Comfort Bed', 'Pool', 'Restaurant', 'Bar'],
  'gaylord':           ['Indoor Water Park', 'Spa', 'Multiple Restaurants', 'Entertainment', 'Pool'],
  'le meridien':       ['Pool', 'Espresso Bar', 'Fitness Center', 'Restaurant'],
  'le méridien':       ['Pool', 'Espresso Bar', 'Fitness Center', 'Restaurant'],
};

const RATE_BY_BRAND = {
  'st. regis': [550, 900], 'st regis': [550, 900],
  'jw marriott': [350, 600], 'w hotel': [320, 580], 'w hotels': [320, 580],
  'westin': [220, 420], 'sheraton': [180, 380], 'renaissance': [200, 400],
  'marriott': [180, 350], 'autograph collection': [200, 450],
  'le méridien': [210, 390], 'le meridien': [210, 390],
  'courtyard': [130, 220], 'fairfield': [110, 180],
  'residence inn': [150, 260], 'springhill suites': [130, 220],
  'aloft': [130, 230], 'moxy': [110, 200], 'ac hotel': [150, 280],
  'element': [130, 240], 'four points': [120, 200],
  'gaylord': [300, 550], 'delta hotels': [150, 280],
  'towneplace suites': [110, 190],
};

const STARS_BY_BRAND = {
  'st. regis': 5.0, 'st regis': 5.0, 'jw marriott': 4.9, 'w hotel': 4.7, 'w hotels': 4.7,
  'westin': 4.6, 'sheraton': 4.4, 'renaissance': 4.5, 'marriott': 4.4,
  'autograph collection': 4.5, 'le méridien': 4.5, 'le meridien': 4.5,
  'courtyard': 4.2, 'fairfield': 4.1, 'residence inn': 4.3,
  'springhill suites': 4.1, 'aloft': 4.3, 'moxy': 4.2, 'ac hotel': 4.4,
  'element': 4.2, 'four points': 4.1, 'gaylord': 4.7, 'delta hotels': 4.3,
  'towneplace suites': 4.0, 'luxury collection': 4.8, 'the luxury collection': 4.8,
};

const BONVOY_BY_BRAND = {
  'st. regis': 8000, 'st regis': 8000, 'jw marriott': 5500, 'w hotel': 5000,
  'westin': 3800, 'sheraton': 3200, 'renaissance': 3500, 'marriott': 3200,
  'courtyard': 1800, 'fairfield': 1200, 'residence inn': 2000,
  'springhill suites': 1800, 'aloft': 2000, 'moxy': 1800, 'ac hotel': 2200,
  'element': 1900, 'four points': 1600, 'gaylord': 4500, 'delta hotels': 2500,
};

function detectBrand(name = '') {
  const lc = name.toLowerCase();
  return MARRIOTT_BRANDS.find(b => lc.includes(b)) || 'marriott';
}

function rateForBrand(brand) {
  const [lo, hi] = RATE_BY_BRAND[brand] || [150, 300];
  const base = Math.round(lo + Math.random() * (hi - lo));
  const original = Math.round(base * (1.1 + Math.random() * 0.2));
  return { rate: base, originalRate: original };
}

function distanceLabel(meters) {
  const mi = meters / 1609;
  if (mi < 0.1) return 'On-site';
  if (mi < 1) return `${(mi * 5280 / 100).toFixed(0) * 100} ft away`;
  return `${mi.toFixed(1)} mi from city center`;
}

let _hotelCache = {};

/**
 * Fetch real Marriott hotels near a lat/lng using OSM Overpass API.
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusKm - search radius in km (default 30)
 * @returns {Promise<Array>} array of hotel objects formatted for CoVoyage
 */
export async function fetchMarriottHotels(lat, lng, radiusKm = 30) {
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  if (_hotelCache[cacheKey]) return _hotelCache[cacheKey];

  const radiusM = radiusKm * 1000;
  const query = `
    [out:json][timeout:25];
    (
      node["tourism"="hotel"]["name"~"Marriott|Westin|Sheraton|JW |W Hotel|St. Regis|St Regis|Le Méridien|Le Meridien|Renaissance|Courtyard|Fairfield|Residence Inn|SpringHill|Aloft|Moxy|AC Hotel|Element|Four Points|Gaylord|Autograph|Luxury Collection|Tribute Portfolio|Delta Hotels|TownePlace",i](around:${radiusM},${lat},${lng});
      way["tourism"="hotel"]["name"~"Marriott|Westin|Sheraton|JW |W Hotel|St. Regis|St Regis|Le Méridien|Le Meridien|Renaissance|Courtyard|Fairfield|Residence Inn|SpringHill|Aloft|Moxy|AC Hotel|Element|Four Points|Gaylord|Autograph|Luxury Collection|Tribute Portfolio|Delta Hotels|TownePlace",i](around:${radiusM},${lat},${lng});
    );
    out center;
  `;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
    const json = await res.json();
    const elements = json.elements || [];

    if (elements.length === 0) return fallbackHotels(lat, lng);

    const hotels = elements
      .filter(el => el.tags?.name)
      .slice(0, 8)
      .map((el, i) => {
        const name = el.tags.name;
        const brand = detectBrand(name);
        const { rate, originalRate } = rateForBrand(brand);
        const elLat = el.lat ?? el.center?.lat ?? lat;
        const elLng = el.lon ?? el.center?.lon ?? lng;
        const distM = haversineMeters(lat, lng, elLat, elLng);
        const amenities = AMENITIES_BY_BRAND[brand] || ['Pool', 'Restaurant', 'Fitness Center', 'Bar'];
        const address = el.tags['addr:street']
          ? `${el.tags['addr:housenumber'] || ''} ${el.tags['addr:street']}, ${el.tags['addr:city'] || ''}`.trim()
          : el.tags['addr:full'] || name;

        return {
          id: `osm-${el.id}`,
          name,
          address,
          brand,
          distance: distanceLabel(distM),
          stars: STARS_BY_BRAND[brand] || 4.3,
          rate,
          originalRate,
          amenities,
          image: HOTEL_PHOTOS[i % HOTEL_PHOTOS.length],
          bookedBy: [],
          bonvoyPts: BONVOY_BY_BRAND[brand] || 2000,
          highlight: false,
          hotelPriority: false,
          lat: elLat,
          lng: elLng,
        };
      });

    // Sort by distance
    hotels.sort((a, b) => {
      const dA = haversineMeters(lat, lng, a.lat, a.lng);
      const dB = haversineMeters(lat, lng, b.lat, b.lng);
      return dA - dB;
    });

    // Mark the closest as highlight (organizer's pick)
    if (hotels.length > 0) hotels[0].highlight = true;

    _hotelCache[cacheKey] = hotels;
    return hotels;
  } catch (err) {
    console.warn('[fetchMarriottHotels] Overpass error, using fallback:', err.message);
    return fallbackHotels(lat, lng);
  }
}

/** Fallback set of popular Marriott hotels when OSM returns nothing */
function fallbackHotels(lat, lng) {
  return [
    {
      id: 'fb-h1', name: 'Marriott (Downtown)',
      address: 'City Center', brand: 'marriott', distance: '0.2 mi from city center',
      stars: 4.4, rate: 219, originalRate: 259,
      amenities: ['Pool', 'Restaurant', 'Fitness Center', 'Bar', 'Room Service'],
      image: HOTEL_PHOTOS[0], bookedBy: [], bonvoyPts: 3200, highlight: true, hotelPriority: false,
    },
    {
      id: 'fb-h2', name: 'Courtyard by Marriott',
      address: 'Airport Area', brand: 'courtyard', distance: '1.5 mi from city center',
      stars: 4.2, rate: 159, originalRate: 189,
      amenities: ['Pool', 'Bistro', 'Fitness Center', 'Free Parking'],
      image: HOTEL_PHOTOS[1], bookedBy: [], bonvoyPts: 1800, highlight: false, hotelPriority: false,
    },
    {
      id: 'fb-h3', name: 'Residence Inn by Marriott',
      address: 'Business District', brand: 'residence inn', distance: '0.8 mi from city center',
      stars: 4.3, rate: 189, originalRate: 229,
      amenities: ['Free Breakfast', 'Kitchen Suite', 'Pool', 'Fitness Center'],
      image: HOTEL_PHOTOS[2], bookedBy: [], bonvoyPts: 2000, highlight: false, hotelPriority: false,
    },
    {
      id: 'fb-h4', name: 'Fairfield Inn & Suites',
      address: 'Suburban Area', brand: 'fairfield', distance: '2.1 mi from city center',
      stars: 4.1, rate: 129, originalRate: 159,
      amenities: ['Free Breakfast', 'Pool', 'Fitness Center', 'Free Parking'],
      image: HOTEL_PHOTOS[3], bookedBy: [], bonvoyPts: 1200, highlight: false, hotelPriority: false,
    },
  ];
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
