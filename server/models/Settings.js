const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: mongoose.Schema.Types.Mixed,
});

module.exports = mongoose.model('Settings', SettingsSchema);