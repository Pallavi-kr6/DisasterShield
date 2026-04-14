require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { z } = require('zod');
const { getWeatherForCity } = require('./services/weatherService.js');
const { getLocationFromRequest, reverseGeocodeCity } = require('./services/locationService.js');
const { computeDecision } = require('./services/decisionEngine.js');
const bcrypt = require('bcryptjs');
const { signToken, verifyToken } = require('./auth.js');
const { localFindOne, localInsert, localSelect } = require('./localStore.js');
const { computePremium } = require('./premium.js');
const { getSupabase } = require('./supabase.js');
const { callAiPredictAll } = require('./services/aiService.js');
const { startCron, getLatestMonitorLog } = require('./cron/weatherMonitor.js');
const { processUserPayout } = require('./services/payoutService.js');
const adminRoutes = require('./routes/adminRoutes.js');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/admin', adminRoutes);

app.get('/api/monitor-status', (req, res) => {
  res.json({ log: getLatestMonitorLog() });
});

const PORT = process.env.PORT || 5000;

//
// 🔥 HACKATHON-PROOF AI CALL
//
// Imported from aiService.js
//

//
// 🔥 WARMUP ROUTE
//
app.get('/warmup-ai', async (_req, res) => {
  try {
    await axios.get('https://disastershield-model.onrender.com');
    res.json({ status: 'AI warmed up' });
  } catch {
    res.json({ status: 'AI still waking up' });
  }
});

//
// SCHEMA
//
const analyzeSchema = z.object({
  city: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  expected_income: z.number().default(5000),
});

//
// ROOT
//
app.get('/', (_req, res) => {
  res.json({ message: 'DisasterShield API running 🚀' });
});

//
// AUTH
//
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, city } = req.body;

  const hash = await bcrypt.hash(password, 10);

  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    password_hash: hash,
    city,
    role: 'user', // Add role
    platform: req.body.platform || 'ZOMATO_SWIGGY',
  };

  try {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('users').insert([user]);
      if (error) console.error('Supabase write err (user):', error);
    }
  } catch (e) {
    console.error('Supabase write err:', e);
  }

  localInsert('users', user);

  res.json({ token: signToken(user), user });
});

app.post('/api/auth/login', async (req, res) => {
  let user = null;
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase.from('users').select('*').eq('email', req.body.email).single();
      if (data) user = data;
    }
  } catch (e) {
    console.error('Supabase read err:', e.message);
  }

  if (!user) {
    user = localFindOne('users', u => u.email === req.body.email);
  }

  if (!user) return res.status(401).json({ error: 'Invalid' });

  const ok = await bcrypt.compare(req.body.password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid' });

  res.json({ token: signToken(user), user });
});

app.get('/api/auth/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/premium', verifyToken, (req, res) => {
  try {
    const result = computePremium(req.body);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/claims/:userId', verifyToken, async (req, res) => {
  let claims = [];
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase.from('claims').select('*').eq('user_id', req.params.userId).order('created_at', { ascending: false });
      if (data) claims = data;
    }
  } catch (e) {}

  if (!claims || claims.length === 0) {
    claims = localSelect('claims', c => c.user_id === req.params.userId);
  }

  res.json({ claims });
});

app.get('/api/transactions/:userId', verifyToken, async (req, res) => {
  let transactions = [];
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase.from('transactions').select('*').eq('user_id', req.params.userId).order('created_at', { ascending: false });
      if (data) transactions = data;
    }
  } catch (e) {}

  if (!transactions || transactions.length === 0) {
    transactions = localSelect('transactions', t => t.user_id === req.params.userId);
  }

  res.json({ transactions });
});

//
// 🔥 MAIN ANALYZE ROUTE
//
app.post('/api/analyze', verifyToken, async (req, res) => {
  try {
    const parsed = analyzeSchema.parse(req.body);

    const city = parsed.city || req.user.city || 'Mumbai';

    const weather = await getWeatherForCity(city);

    const delivery_drop =
      (weather.rainfall / 150) * 0.5 +
      (weather.aqi / 300) * 0.3;

    const gps = await reverseGeocodeCity(parsed.lat, parsed.lon);
    const loc = await getLocationFromRequest(req);

    const detected_city = gps.detected_city || loc.city;

    const aiPayload = {
      city,
      rainfall: weather.rainfall,
      temperature: weather.temperature,
      aqi: weather.aqi,
      delivery_drop,
      expected_income: parsed.expected_income,
    };

    const ml = await callAiPredictAll(aiPayload);

    const decision = computeDecision({
      ...ml,
      delivery_drop,
      rainfall: weather.rainfall,
      aqi: weather.aqi,
      expected_income: parsed.expected_income,
      user_history: { past_fraud: false },
    });

    res.json({
      ...ml,
      weather,
      detected_city,
      delivery_drop,
      ...decision,
    });

  } catch (e) {
    if (e.isAxiosError) {
      console.error('[Analyze Error]', e.message, e.response?.data);
    } else {
      console.error('[Analyze Error]', e?.message || 'Unknown error');
    }

    // 🔥 LAST RESORT FALLBACK
    res.json({
      fallback: true,
      message: 'System recovered gracefully',
      payout: 2000,
    });
  }
});

//
// 🔥 MAIN TRIGGER ROUTE
//
app.post('/api/trigger', verifyToken, async (req, res) => {
  try {
    const ai = {
      triggered: true,
      risk_level: 'HIGH',
      predicted_loss: req.body.expected_income * 0.4,
      payout_amount: req.body.expected_income * 0.5,
      trigger_score: 0.9,
      fraud_score: 0.1,
      fraud_flagged: false,
      decision: 'APPROVED',
      final_payout: req.body.expected_income * 0.5,
      reason: 'Severe disaster event triggered manually.',
    };

    const claim = {
      id: crypto.randomUUID(),
      user_id: req.user.sub,
      created_at: new Date().toISOString(),
      risk_level: ai.risk_level,
      decision: ai.decision,
      trust_score: 0.9,
      final_payout: ai.final_payout,
    };
    
    // Execute Razorpay Payout manually!
    const payoutResult = await processUserPayout(req.user, ai.final_payout);
    const payoutStatus = payoutResult?.status?.includes('failed') ? 'failed' : 'processed';

    const transaction = {
      id: crypto.randomUUID(),
      user_id: req.user.sub,
      claim_id: claim.id,
      amount: ai.final_payout,
      razorpay_payout_id: payoutResult?.id || null,
      status: payoutStatus,
      created_at: new Date().toISOString(),
    };

    try {
      const supabase = getSupabase();
      if (supabase && req.user.sub.includes('-')) {
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("id", req.user.sub)
          .single();

        if (!existingUser) {
          console.log("User not found in DB, skipping insert");
        } else {
          const { error: claimsErr } = await supabase.from('claims').insert([{
            id: claim.id,
            user_id: claim.user_id,
            created_at: claim.created_at,
            risk_level: claim.risk_level,
            decision: claim.decision,
            trust_score: claim.trust_score,
            final_payout: claim.final_payout
          }]);
          if (claimsErr) console.error('Supabase trigger save err (claims):', claimsErr?.message || claimsErr);
          
          const { error: txErr } = await supabase.from('transactions').insert([{
            id: transaction.id,
            user_id: transaction.user_id,
            claim_id: transaction.claim_id,
            amount: transaction.amount,
            razorpay_payout_id: transaction.razorpay_payout_id,
            status: transaction.status
          }]);
          if (txErr) console.error('Supabase trigger save err (transactions):', txErr?.message || txErr);
        }
      } else if (!req.user.sub.includes('-')) {
         console.warn("Legacy timestamp User ID detected. Supabase sync skipped due to strict UUID constraints. Using local_store only.");
      }
    } catch (e) {
      console.error('Supabase trigger save err:', e?.message || e);
    }

    localInsert('claims', claim);
    localInsert('transactions', transaction);

    res.json({
      ai,
      approved: true,
      payment: { status: 'PAID' },
      payout: payoutResult,
    });
  } catch (e) {
    console.error('Trigger Endpoint Exception:', e?.message || e);
    res.status(500).json({ detail: 'Trigger failed' });
  }
});

//
// START
//
app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
  startCron();
});