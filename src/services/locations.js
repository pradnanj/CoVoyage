// US City/Location autocomplete using Census Bureau geocoder + OpenDataSoft
// Falls back to a curated list of popular US destinations if API is unavailable

const POPULAR_US_DESTINATIONS = [
  'Atlanta, GA', 'Austin, TX', 'Baltimore, MD', 'Boston, MA',
  'Charlotte, NC', 'Chicago, IL', 'Cincinnati, OH', 'Cleveland, OH',
  'Columbus, OH', 'Dallas, TX', 'Denver, CO', 'Detroit, MI',
  'Fort Lauderdale, FL', 'Fort Worth, TX', 'Honolulu, HI', 'Houston, TX',
  'Indianapolis, IN', 'Jacksonville, FL', 'Kansas City, MO', 'Las Vegas, NV',
  'Los Angeles, CA', 'Louisville, KY', 'Memphis, TN', 'Miami, FL',
  'Milwaukee, WI', 'Minneapolis, MN', 'Nashville, TN', 'New Orleans, LA',
  'New York City, NY', 'Newark, NJ', 'Oakland, CA', 'Oklahoma City, OK',
  'Omaha, NE', 'Orlando, FL', 'Philadelphia, PA', 'Phoenix, AZ',
  'Pittsburgh, PA', 'Portland, OR', 'Raleigh, NC', 'Richmond, VA',
  'Sacramento, CA', 'Salt Lake City, UT', 'San Antonio, TX', 'San Diego, CA',
  'San Francisco, CA', 'San Jose, CA', 'Seattle, WA', 'St. Louis, MO',
  'Tampa, FL', 'Tucson, AZ', 'Virginia Beach, VA', 'Washington, DC',
  'Anaheim, CA', 'Arlington, TX', 'Aurora, CO', 'Bakersfield, CA',
  'Baton Rouge, LA', 'Buffalo, NY', 'Chandler, AZ', 'Chesapeake, VA',
  'Colorado Springs, CO', 'Corpus Christi, TX', 'Durham, NC', 'El Paso, TX',
  'Fresno, CA', 'Garland, TX', 'Greensboro, NC', 'Henderson, NV',
  'Hialeah, FL', 'Irving, TX', 'Jersey City, NJ', 'Laredo, TX',
  'Lexington, KY', 'Lincoln, NE', 'Long Beach, CA', 'Lubbock, TX',
  'Madison, WI', 'Mesa, AZ', 'Modesto, CA', 'Montgomery, AL',
  'Moreno Valley, CA', 'North Las Vegas, NV', 'Plano, TX', 'Reno, NV',
  'Riverside, CA', 'Rochester, NY', 'Santa Ana, CA', 'Scottsdale, AZ',
  'Spokane, WA', 'St. Paul, MN', 'St. Petersburg, FL', 'Stockton, CA',
  'Tacoma, WA', 'Toledo, OH', 'Tulsa, OK', 'Winston-Salem, NC',
];

let _cache = {};

/**
 * Search US cities/places matching a query string.
 * Uses the OpenDataSoft US cities dataset (no API key needed).
 * Falls back to the static list on any error.
 */
export async function searchUSLocations(query) {
  if (!query || query.length < 2) return [];

  const q = query.trim().toLowerCase();

  // Check cache first
  if (_cache[q]) return _cache[q];

  // Try OpenDataSoft US cities API (free, no key)
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://public.opendatasoft.com/api/records/1.0/search/?dataset=us-cities-demographics&q=${encoded}&rows=8&facet=city&facet=state_name&sort=total_population`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const json = await res.json();
      const results = (json.records || []).map(r => {
        const city = r.fields?.city || '';
        const state = r.fields?.state_name || '';
        // Convert full state name to abbreviation for display
        return `${city}, ${STATE_ABBR[state] || state}`;
      }).filter(Boolean);

      if (results.length > 0) {
        _cache[q] = results;
        return results;
      }
    }
  } catch {
    // Fall through to static list
  }

  // Try Census Bureau Geocoder (no key, very reliable)
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://geocoding.geo.census.gov/geocoder/locations/address?street=&city=${encoded}&state=&benchmark=4&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const json = await res.json();
      const matches = json.result?.addressMatches || [];
      const results = [...new Set(
        matches.map(m => {
          const c = m.addressComponents?.city || '';
          const s = m.addressComponents?.state || '';
          return c && s ? `${c}, ${s}` : null;
        }).filter(Boolean)
      )];
      if (results.length > 0) {
        _cache[q] = results;
        return results;
      }
    }
  } catch {
    // Fall through to static list
  }

  // Fallback: filter static popular destinations
  const results = POPULAR_US_DESTINATIONS.filter(d =>
    d.toLowerCase().includes(q)
  ).slice(0, 8);
  _cache[q] = results;
  return results;
}

/** Given a city name like "Orlando, FL", return geocoords {lat, lng} */
export async function geocodeCity(cityLabel) {
  try {
    const encoded = encodeURIComponent(cityLabel + ', USA');
    const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encoded}&benchmark=4&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const json = await res.json();
      const match = json.result?.addressMatches?.[0];
      if (match?.coordinates) {
        return { lat: match.coordinates.y, lng: match.coordinates.x };
      }
    }
  } catch { /* ignore */ }

  // Fallback: well-known cities
  return CITY_COORDS[cityLabel.split(',')[0].trim().toLowerCase()] || null;
}

const STATE_ABBR = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA',
  'Colorado':'CO','Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA',
  'Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA',
  'Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD',
  'Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS',
  'Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH',
  'New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC',
  'North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA',
  'Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD','Tennessee':'TN',
  'Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA','Washington':'WA',
  'West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY','District of Columbia':'DC',
};

const CITY_COORDS = {
  'orlando':      { lat: 28.5383, lng: -81.3792 },
  'miami':        { lat: 25.7617, lng: -80.1918 },
  'new york city':{ lat: 40.7128, lng: -74.0060 },
  'los angeles':  { lat: 34.0522, lng: -118.2437 },
  'chicago':      { lat: 41.8781, lng: -87.6298 },
  'las vegas':    { lat: 36.1699, lng: -115.1398 },
  'nashville':    { lat: 36.1627, lng: -86.7816 },
  'san francisco':{ lat: 37.7749, lng: -122.4194 },
  'seattle':      { lat: 47.6062, lng: -122.3321 },
  'boston':       { lat: 42.3601, lng: -71.0589 },
  'denver':       { lat: 39.7392, lng: -104.9903 },
  'atlanta':      { lat: 33.7490, lng: -84.3880 },
  'dallas':       { lat: 32.7767, lng: -96.7970 },
  'houston':      { lat: 29.7604, lng: -95.3698 },
  'phoenix':      { lat: 33.4484, lng: -112.0740 },
  'san diego':    { lat: 32.7157, lng: -117.1611 },
  'washington':   { lat: 38.9072, lng: -77.0369 },
  'austin':       { lat: 30.2672, lng: -97.7431 },
};
