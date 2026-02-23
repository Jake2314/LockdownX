const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  guildId: String,
  action: String,
  user: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', schema);