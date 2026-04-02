import axios from 'axios';

const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY || process.env.OWM_API_KEY;
const OPENCAGE_KEY = process.env.OPENCAGE_API_KEY;

export async function getLocationFromRequest(req) {
  // Prefer explicit client-provided location (mock GPS)
  const hdrCity = req.headers['x-client-city'];
  if (hdrCity) return { city: String(hdrCity), source: 'client_header' };

  // Best-effort IP-based lookup (may be blocked in local dev)
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().split(',')[0].trim();
  if (!ip) return { city: null, source: 'none' };

  try {
    const r = await axios.get('https://ipapi.co/json/', { timeout: 3000 });
    const city = r.data?.city ? String(r.data.city) : null;
    return { city, source: 'ipapi' };
  } catch {
    return { city: null, source: 'none' };
  }
}

export async function reverseGeocodeCity(lat, lon) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { detected_city: null, source: 'none' };
  }

  // 1) Prefer OpenWeather reverse geocode if key exists
  if (OPENWEATHER_KEY) {
    try {
      const r = await axios.get('https://api.openweathermap.org/geo/1.0/reverse', {
        params: { lat: latitude, lon: longitude, limit: 1, appid: OPENWEATHER_KEY },
        timeout: 10_000,
      });
      const city = r.data?.[0]?.name ? String(r.data[0].name) : null;
      return { detected_city: city, source: 'openweather_geo' };
    } catch {
      // fallthrough
    }
  }

  // 2) Fallback to OpenCage if key exists
  if (OPENCAGE_KEY) {
    try {
      const r = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
        params: { q: `${latitude},${longitude}`, key: OPENCAGE_KEY, no_annotations: 1, limit: 1 },
        timeout: 10_000,
      });
      const comp = r.data?.results?.[0]?.components || {};
      const city = comp.city || comp.town || comp.village || comp.county || null;
      return { detected_city: city ? String(city) : null, source: 'opencage' };
    } catch {
      // fallthrough
    }
  }

  // 3) Mock fallback (never break)
  return { detected_city: null, source: 'mock' };
}
