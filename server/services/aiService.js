const axios = require('axios');

function fallbackAI(payload) {
  const risk = payload.rainfall > 100 ? 'HIGH' : 'MEDIUM';

  return {
    risk_level: risk,
    predicted_loss: payload.expected_income * 0.4,
    payout_amount: payload.expected_income * 0.5,
    trigger_score: payload.rainfall / 20,
    fraud_score: 0.1,
    triggered: payload.rainfall > 80,
  };
}

async function callAiPredictAll(payload) {
  const baseUrl = process.env.AI_URL || 'https://disastershield-model.onrender.com';
  const url = `${baseUrl}/predict-all`;

  // Warmup (non-blocking)
  axios.get(baseUrl).catch(() => {});

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[AI] Attempt ${attempt}`);

      const res = await axios.post(url, payload, {
        timeout: 30000,
      });

      return res.data;

    } catch (err) {
      console.warn(`[AI] Attempt ${attempt} failed:`, err.message);

      if (attempt === 2) {
        console.warn('[AI] Using FALLBACK MOCK');
        return fallbackAI(payload);
      }

      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

module.exports = {
  callAiPredictAll,
  fallbackAI
};
