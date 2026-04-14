const express = require('express');
const { runMonitor } = require('../cron/weatherMonitor.js');

const router = express.Router();

// GET /api/admin/trigger-monitor
// This manually runs the cron logic once for demo purposes
router.get('/trigger-monitor', async (req, res) => {
  try {
    // Run it asynchronously instead of blocking completely,
    // but wait for finish to return proper response if preferred.
    // Given it's a demo trigger, waiting is a good idea.
    await runMonitor();
    res.json({ success: true, message: 'Monitor run successfully.' });
  } catch (err) {
    console.error('Trigger monitor error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
