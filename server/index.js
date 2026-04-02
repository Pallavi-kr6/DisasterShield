import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabase } from './supabase.js';
import {
  computePremium,
  premiumRequestSchema,
} from './premium.js';
import {
  mockWeather,
  mockDeliveryDrop,
  mockPayment,
} from './mocks.js';
import bcrypt from 'bcryptjs';
import { signToken, verifyToken, checkRole } from './auth.js';
import { computeDecision } from './services/decisionEngine.js';
import { localFindOne, localInsert, localSelect, localUpsertById } from './localStore.js';
import { getWeatherForCity } from './services/weatherService.js';
import { getLocationFromRequest, reverseGeocodeCity } from './services/locationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Health
app.get('/health', (_req, res) => {
  return res.status(200).json({ status: 'OK' });
});

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  next();
});

const PORT = process.env.PORT || 5000;

//
// ✅ AI CALL (FINAL FIX)
//
async function callAiPredictAll(payload) {
  try {
    const res = await axios.post(
      'https://disastershield-model.onrender.com/predict-all',
      payload,
      { timeout: 10000 }
    );
    return res.data;
  } catch (err) {
    console.error('[AI ERROR]', err?.message);
    throw new Error(err?.response?.data?.detail || err.message || 'AI_API_FAILED');
  }
}

// -----------------------------
// SCHEMA
// -----------------------------
const analyzeSchema = z.object({
  city: z.string().min(1).optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
  expected_income: z.number().min(0).default(5000),
});

// Root
app.get('/', (_req, res) => {
  return res.json({
    message: 'DisasterShield AI Node API',
    health: '/health',
  });
});

// -----------------------------
// AUTH
// -----------------------------
const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  city: z.string().min(1),
  platform: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function handleAuthRegister(req, res) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json(parsed.error);

  const password_hash = await bcrypt.hash(parsed.data.password, 10);

  const user = {
    id: cryptoRandomId(),
    ...parsed.data,
    email: parsed.data.email.toLowerCase(),
    password_hash,
    role: 'user',
  };

  localInsert('users', user);

  const token = signToken(user);
  res.json({ token, user });
}

async function handleAuthLogin(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json(parsed.error);

  const user = localFindOne('users', u => u.email === parsed.data.email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(parsed.data.password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken(user);
  res.json({ token, user });
}

app.post('/api/auth/register', handleAuthRegister);
app.post('/api/auth/login', handleAuthLogin);

// -----------------------------
// ANALYZE
// -----------------------------
app.post('/api/analyze', verifyToken, async (req, res) => {
  const parsed = analyzeSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(422).json(parsed.error);

  try {
    const city = parsed.data.city || req.user.city || 'Mumbai';

    const weather = await getWeatherForCity(city);

    const delivery_drop = clamp01(
      (weather.rainfall / 150) * 0.45 +
      (weather.aqi / 300) * 0.25 +
      (Math.max(0, weather.temperature - 35) / 10) * 0.2 +
      0.05
    );

    const gps = await reverseGeocodeCity(parsed.data.lat, parsed.data.lon);
    const loc = await getLocationFromRequest(req);

    const detected_city = gps.detected_city || loc.city || null;

    const aiPayload = {
      city,
      rainfall: weather.rainfall,
      temperature: weather.temperature,
      aqi: weather.aqi,
      delivery_drop,
      expected_income: parsed.data.expected_income,
    };

    const ml = await callAiPredictAll(aiPayload);

    const decision = computeDecision({
      ...ml,
      delivery_drop,
      rainfall: aiPayload.rainfall,
      aqi: aiPayload.aqi,
      expected_income: aiPayload.expected_income,
      user_history: { past_fraud: false },
    });

    res.json({
      ...ml,
      weather,
      delivery_drop,
      detected_city,
      ...decision,
    });

  } catch (e) {
    console.error('[ERROR]', e);
    res.status(500).json({ error: e.message });
  }
});

// -----------------------------
// PREMIUM
// -----------------------------
app.post('/api/premium', (req, res) => {
  const parsed = premiumRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json(parsed.error);

  res.json(computePremium(parsed.data));
});

// -----------------------------
// TRIGGER
// -----------------------------
app.post('/api/trigger', verifyToken, async (req, res) => {
  const weather = mockWeather({ mode: 'HEAVY_RAIN' });
  const delivery_drop = mockDeliveryDrop({ mode: 'HEAVY_RAIN' });

  const ai = await callAiPredictAll({
    ...weather,
    delivery_drop,
    expected_income: 5000,
  });

  res.json({ weather, ai });
});

// -----------------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// -----------------------------
function cryptoRandomId() {
  return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function clamp01(x) {
  return Math.max(0, Math.min(1, Number(x) || 0));
}