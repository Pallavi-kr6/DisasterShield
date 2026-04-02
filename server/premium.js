import { z } from 'zod';

export const premiumRequestSchema = z.object({
  platform: z.enum(['ZOMATO_SWIGGY', 'ZEPTO_BLINKIT', 'AMAZON_FLIPKART']),
  city: z.string().min(1),
  coverage_pct: z.number().min(0.5).max(0.7).default(0.7),
  risk_level: z.enum(['Low', 'Medium', 'High']),
  trigger_rate: z.number().min(0).max(1).default(0.3), // optional meta
  fraud_history: z.enum(['NONE', 'LOW', 'HIGH']).default('NONE'),
});

const baseRateByPlatform = {
  ZOMATO_SWIGGY: 35,
  ZEPTO_BLINKIT: 30,
  AMAZON_FLIPKART: 40,
};

const cityMultiplier = {
  Mumbai: 1.4,
  Delhi: 1.3,
  Chennai: 1.3,
  Bangalore: 1.2,
  Hyderabad: 1.2,
  Kolkata: 1.1,
  Pune: 1.1,
};

function riskMultiplier(riskLevel) {
  if (riskLevel === 'Low') return 0.9;
  if (riskLevel === 'Medium') return 1.1;
  return 1.3; // High
}

function triggerMultiplier(triggerRate) {
  // More frequent triggers => higher premium
  if (triggerRate >= 0.5) return 1.25;
  if (triggerRate >= 0.3) return 1.1;
  return 1.0;
}

function fraudMultiplier(history) {
  if (history === 'HIGH') return 1.5;
  if (history === 'LOW') return 1.15;
  return 1.0;
}

function coverageMultiplier(coveragePct) {
  // 50% -> 1.0, 60% -> 1.1, 70% -> 1.2
  if (coveragePct >= 0.7) return 1.2;
  if (coveragePct >= 0.6) return 1.1;
  return 1.0;
}

function tierForPremium(p) {
  if (p < 40) return 'Basic';
  if (p < 70) return 'Standard';
  if (p < 100) return 'Premium';
  return 'High Risk';
}

export function computePremium(input) {
  const base = baseRateByPlatform[input.platform];
  const rm = riskMultiplier(input.risk_level);
  const tm = triggerMultiplier(input.trigger_rate ?? 0.3);
  const fm = fraudMultiplier(input.fraud_history);
  const cm = coverageMultiplier(input.coverage_pct);
  const cityM = cityMultiplier[input.city] ?? 1.15;

  const weekly_premium = Number((base * rm * tm * fm * cm * cityM).toFixed(2));
  return {
    weekly_premium,
    premium_tier: tierForPremium(weekly_premium),
    breakdown: {
      base_rate: base,
      risk_multiplier: rm,
      trigger_multiplier: tm,
      fraud_multiplier: fm,
      coverage_multiplier: cm,
      city_multiplier: cityM,
    },
  };
}

