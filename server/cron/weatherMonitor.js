const cron = require('node-cron');
const crypto = require('crypto');
const { getSupabase } = require('../supabase.js');
const { localInsert } = require('../localStore.js');

let latestMonitorLog = null;

// To properly import ES modules that are used by the main app, we can use 
// dynamic imports or rely on the way index.js currently handles requires.
// In the existing codebase, require() seems to handle these transparently (via node re-parsing).
const { getWeatherForCity } = require('../services/weatherService.js');
const { computeDecision } = require('../services/decisionEngine.js');
const { callAiPredictAll } = require('../services/aiService.js');
const { processUserPayout } = require('../services/payoutService.js');

async function runMonitor() {
  console.log("Running automated monitoring...");
  const supabase = getSupabase();
  if (!supabase) {
    console.error("Supabase client not available, skipping cron.");
    return;
  }

  // Fetch users from Supabase
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, city, lat, lon, fraud_count, last_claim_time, expected_income');

  if (usersErr) {
    console.error("Error fetching users:", usersErr);
    return;
  }
  
  if (!users) {
    console.log("No users found.");
    return;
  }

  const now = new Date();

  for (const user of users) {
    console.log(`Checking user: ${user.id}`);

    // Prevent Spam / Abuse / Duplicate payouts
    if (user.last_claim_time) {
      const lastClaim = new Date(user.last_claim_time);
      const diffMins = (now - lastClaim) / (1000 * 60);
      if (diffMins < 60) {
        console.log("Skipped due to recent claim (within 1 hour)");
        continue;
      }
    }

    try {
      const city = user.city || 'Mumbai';
      const expected_income = user.expected_income || 5000;

      // 3. WEATHER FETCHING
      const weather = await Promise.resolve(getWeatherForCity(city)); // using promise resolve in case it returns an object directly or promise
      
      const delivery_drop =
        (weather.rainfall / 150) * 0.5 +
        (weather.aqi / 300) * 0.3;

      // 4. AUTOMATED ANALYSIS
      const aiPayload = {
        city,
        rainfall: weather.rainfall,
        temperature: weather.temperature,
        aqi: weather.aqi,
        delivery_drop,
        expected_income,
      };

      const ml = await callAiPredictAll(aiPayload);

      // 5. TRIGGER CONDITIONS
      // Rainfall above threshold OR AI "triggered" = true
      const rainfall_threshold = 80;
      const isTriggered = weather.rainfall > rainfall_threshold || ml.triggered;

      if (!isTriggered) {
        latestMonitorLog = {
           id: crypto.randomUUID(),
           time: Date.now(),
           message: `Background check finished for ${users.length} user(s). Conditions normal, no triggers detected.`
        };
        continue; // Condition not met
      }

      console.log("Trigger detected");

      // 6. FRAUD + TRUST ENGINE
      const decisionData = computeDecision({
        ...ml,
        delivery_drop,
        rainfall: weather.rainfall,
        aqi: weather.aqi,
        expected_income,
        user_history: { past_fraud: user.fraud_count > 0 },
      });

      // Insert into claims
      const claim = {
        id: crypto.randomUUID(),
        user_id: user.id,
        created_at: now.toISOString(),
        risk_level: ml.risk_level || 'MEDIUM',
        predicted_loss: ml.predicted_loss || 0,
        trigger_status: isTriggered,
        fraud_score: decisionData.components?.fraud_score || ml.fraud_score || 0,
        penalties: decisionData.components?.past_fraud_penalty || 0,
        trust_score: decisionData.trust_score,
        decision: decisionData.decision,
        final_payout: decisionData.final_payout,
        weather_snapshot: weather,
      };

      if (supabase) {
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!existingUser) {
          console.log("User not found in DB, skipping insert");
        } else {
          const { error: claimsErr } = await supabase.from('claims').insert([claim]);
          if (claimsErr) console.error("Error inserting claim:", claimsErr);

          if ((decisionData.decision === 'APPROVED' || decisionData.decision === 'PARTIAL') && decisionData.final_payout > 0) {
            
            // Execute real payout
            const payoutResult = await processUserPayout(user, decisionData.final_payout);
            const payoutStatus = payoutResult?.status?.includes('failed') ? 'failed' : 'processed';
            
            const transaction = {
              id: crypto.randomUUID(),
              user_id: user.id,
              claim_id: claim.id,
              amount: decisionData.final_payout,
              razorpay_payout_id: payoutResult?.payout_id || payoutResult?.id || null,
              status: payoutStatus,
              created_at: now.toISOString(),
            };

            const { error: txnErr } = await supabase.from('transactions').insert([transaction]);
            if (txnErr) console.error("Error inserting txn:", txnErr);
            
            localInsert('transactions', transaction);
            
            if (payoutStatus === 'processed') {
               console.log(`Payout processed: ₹${decisionData.final_payout}`);
            }
            
            latestMonitorLog = {
               id: crypto.randomUUID(),
               time: Date.now(),
               message: `Automated Risk Monitor Executed! Result: ${decisionData.decision} | Payout: ₹${decisionData.final_payout} | RZP Status: ${payoutStatus}`
            };
          }
        }
      } else {
         // Local simulation only if no supabase
         if ((decisionData.decision === 'APPROVED' || decisionData.decision === 'PARTIAL') && decisionData.final_payout > 0) {
            const payoutResult = await processUserPayout(user, decisionData.final_payout);
            const payoutStatus = payoutResult?.status?.includes('failed') ? 'failed' : 'processed';
            
            const transaction = {
              id: crypto.randomUUID(),
              user_id: user.id,
              claim_id: claim.id,
              amount: decisionData.final_payout,
              razorpay_payout_id: payoutResult?.payout_id || payoutResult?.id || null,
              status: payoutStatus,
              created_at: now.toISOString(),
            };
            localInsert('transactions', transaction);
            if (payoutStatus === 'processed') {
               console.log(`Payout processed: ₹${decisionData.final_payout}`);
            }
            latestMonitorLog = {
               id: crypto.randomUUID(),
               time: Date.now(),
               message: `Automated Risk Monitor Executed! Result: ${decisionData.decision} | Payout: ₹${decisionData.final_payout} | RZP Status: ${payoutStatus}`
            };
         }
      }
      
      // Update User Local always
      let newFraudCount = user.fraud_count || 0;
      if (ml.fraud_flagged || (decisionData.components?.fraud_score > 0.8)) {
          newFraudCount += 1;
      }
      
      const { error: updateErr } = await supabase
        .from('users')
        .update({ last_claim_time: now.toISOString(), fraud_count: newFraudCount })
        .eq('id', user.id);
        
      if (updateErr) console.error("Error updating user:", updateErr);

    } catch (err) {
      console.error(`Error processing user ${user.id}:`, err.message);
    }
  }
}

function startCron() {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', runMonitor);
  console.log("Weather monitor cron scheduled (every 15 min).");
}

function getLatestMonitorLog() {
  return latestMonitorLog;
}

module.exports = {
  startCron,
  runMonitor,
  getLatestMonitorLog
};
