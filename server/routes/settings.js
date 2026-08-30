const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

router.get('/', async (req, res) => {
  try {
    const doc = await Settings.findOne({ key: 'stationName' });
    res.json({ stationName: doc ? doc.value : 'Station Name' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const { stationName } = req.body;
    await Settings.findOneAndUpdate(
      { key: 'stationName' },
      { value: stationName },
      { upsert: true }
    );
    res.json({ stationName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;