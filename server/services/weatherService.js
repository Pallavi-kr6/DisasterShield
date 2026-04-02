import axios from 'axios';
import { mockWeather } from '../mocks.js';

const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY || process.env.OWM_API_KEY;

function kToC(k) {
  return k - 273.15;
}

export async function getWeatherForCity(city) {
  // If no API key, always mock (system never breaks)
  if (!OPENWEATHER_KEY) return { ...mockWeather({ city, mode: 'NORMAL' }), source: 'mock' };

  try {
    // 1) Weather (temp + rain + coords)
    const w = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: { q: city, appid: OPENWEATHER_KEY },
      timeout: 10_000,
    });

    const tempC = w.data?.main?.temp != null ? kToC(Number(w.data.main.temp)) : 30;
    const rain1h = Number(w.data?.rain?.['1h'] ?? 0);
    const rain3h = Number(w.data?.rain?.['3h'] ?? 0);
    const rainfall = Math.max(rain1h, rain3h); // mm
    const lat = Number(w.data?.coord?.lat);
    const lon = Number(w.data?.coord?.lon);

    // 2) AQI (uses coords)
    let aqi = 100;
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      const p = await axios.get('https://api.openweathermap.org/data/2.5/air_pollution', {
        params: { lat, lon, appid: OPENWEATHER_KEY },
        timeout: 10_000,
      });
      // OpenWeather provides AQI 1..5; map to a 50..300-ish scale for our model
      const aqi1to5 = Number(p.data?.list?.[0]?.main?.aqi ?? 2);
      const map = { 1: 60, 2: 100, 3: 160, 4: 230, 5: 290 };
      aqi = map[aqi1to5] ?? 100;
    }

    return {
      city,
      rainfall: Number(rainfall.toFixed(2)),
      temperature: Number(tempC.toFixed(2)),
      aqi: Number(aqi),
      source: 'openweather',
      coord: { lat, lon },
    };
  } catch {
    return { ...mockWeather({ city, mode: 'NORMAL' }), source: 'mock_fallback' };
  }
}

