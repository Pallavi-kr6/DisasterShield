export function mockWeather({ city, mode }) {
  // Basic mock: returns realistic-ish values
  if (mode === 'HEAVY_RAIN') {
    return { city, rainfall: 110, temperature: 38, aqi: 240, mode };
  }
  if (mode === 'FLOOD') {
    return { city, rainfall: 145, temperature: 31, aqi: 180, mode };
  }
  if (mode === 'POLLUTION') {
    return { city, rainfall: 10, temperature: 35, aqi: 275, mode };
  }
  return { city, rainfall: 5, temperature: 30, aqi: 80, mode: 'NORMAL' };
}

export function mockDeliveryDrop({ mode }) {
  if (mode === 'HEAVY_RAIN') return 0.55;
  if (mode === 'FLOOD') return 0.7;
  if (mode === 'POLLUTION') return 0.5;
  return 0.1;
}

export function mockPayment({ amount }) {
  // Simulated payment provider
  return {
    provider: 'MOCK_PAY',
    status: amount > 0 ? 'SUCCESS' : 'FAILED',
    transaction_id: `tx_${Math.random().toString(16).slice(2)}`,
    amount,
    timestamp: new Date().toISOString(),
  };
}

