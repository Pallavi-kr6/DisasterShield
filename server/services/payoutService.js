const axios = require('axios');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_TEST_ACCOUNT = '232323008523';

function getAuthHeader() {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return null;
  const token = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  return { Authorization: `Basic ${token}` };
}

async function createContact(name, email, referenceId) {
  try {
    const res = await axios.post(
      'https://api.razorpay.com/v1/contacts',
      {
        name,
        email,
        type: 'employee',
        reference_id: referenceId
      },
      { headers: getAuthHeader() }
    );
    return res.data;
  } catch (error) {
    console.error('Razorpay createContact failed:', error?.response?.data || error.message);
    throw error;
  }
}

async function createFundAccount(contactId, upiId) {
  try {
    const res = await axios.post(
      'https://api.razorpay.com/v1/fund_accounts',
      {
        contact_id: contactId,
        account_type: 'vpa',
        vpa: { address: upiId }
      },
      { headers: getAuthHeader() }
    );
    return res.data;
  } catch (error) {
    console.error('Razorpay createFundAccount failed:', error?.response?.data || error.message);
    throw error;
  }
}

async function createPayout(fundAccountId, amountInRupees, referenceId) {
  try {
    const res = await axios.post(
      'https://api.razorpay.com/v1/payouts',
      {
        account_number: RAZORPAY_TEST_ACCOUNT,
        fund_account_id: fundAccountId,
        amount: Math.round(amountInRupees * 100), // convert to paise
        currency: 'INR',
        mode: 'UPI',
        purpose: 'payout',
        queue_if_low_balance: true,
        reference_id: referenceId
      },
      { headers: { ...getAuthHeader(), 'X-Payout-Idempotency': referenceId } }
    );
    const payout = res.data;
    payout.mode = "razorpay";
    payout.is_simulated = false;
    return payout;
  } catch (error) {
    console.log("⚠️ Razorpay unavailable, using fallback payout");
    return {
      id: "mock_" + Date.now(),
      status: "processed",
      amount: Math.round(amountInRupees * 100),
      simulated: true,
      is_simulated: true,
      mode: "fallback"
    };
  }
}

async function processUserPayout(user, amount) {
  // If no keys configured, do a simulated successful payout.
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    console.log("Fallback payout used");
    return { id: `sim_pout_${Date.now()}`, status: 'processed', is_simulated: true };
  }

  console.log("Initiating payout...");
  try {
    const upiId = user.upi_id || 'test@upi';
    const name = user.name || 'DisasterShield Worker';
    const email = user.email || 'worker@example.com';

    let fundAccountId = user.rzp_fund_account_id;
    if (!fundAccountId) {
      try {
        const contact = await createContact(name, email, `ref_${user.id}_${Date.now()}`);
        const fundAcc = await createFundAccount(contact.id, upiId);
        fundAccountId = fundAcc.id;
      } catch (e) {
        // Contact creation fails, standard fallback
        console.log("⚠️ Razorpay unavailable, using fallback payout");
        return { id: "mock_" + Date.now(), status: "processed", simulated: true, amount: amount, is_simulated: true };
      }
    }

    const payout = await createPayout(fundAccountId, amount, `pout_${user.id}_${Date.now()}`);
    
    if (payout.is_simulated) {
      console.log("Fallback payout used");
    } else {
      console.log(`Razorpay success: ${payout.id}`);
    }
    
    return payout;
  } catch (err) {
    console.log("Fallback payout used");
    return {
      success: true,
      simulated: true,
      payout_id: "mock_" + Date.now(),
      status: "processed",
      is_simulated: true
    };
  }
}

module.exports = {
  processUserPayout
};
