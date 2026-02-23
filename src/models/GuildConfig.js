const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({

  // =============================
  // CORE
  // =============================

  guildId: { 
    type: String, 
    required: true, 
    unique: true 
  },

  premium: {
    type: Boolean,
    default: false
  },

  // =============================
  // PROTECTION SETTINGS
  // =============================

  antiRaidEnabled: { 
    type: Boolean, 
    default: false 
  },

  lockdown: { 
    type: Boolean, 
    default: false 
  },

  punishment: { 
    type: String, 
    default: 'kick'  // kick | ban
  },

  // =============================
  // RAID DETECTION
  // =============================

  raidJoinLimit: { 
    type: Number, 
    default: 5 
  },

  raidTimeWindow: { 
    type: Number, 
    default: 10000  // milliseconds
  },

  // (keeps compatibility with your old system)
  raidThreshold: {
    type: Number,
    default: 5
  },

  // =============================
  // ACCOUNT SAFETY
  // =============================

  minAccountAge: { 
    type: Number, 
    default: 0  // days
  },

  // =============================
  // ANALYTICS
  // =============================

  messageCount: { 
    type: Number, 
    default: 0 
  },

  // =============================
  // LOGGING
  // =============================

  logChannelId: { 
    type: String, 
    default: null 
  },

  // =============================
  // PERMISSIONS
  // =============================

  whitelistRoles: { 
    type: [String], 
    default: [] 
  },

  // =============================
  // AUTO UNLOCK
  // =============================

  autoUnlockTime: { 
    type: Number, 
    default: 0  // seconds (0 = disabled)
  }

}, { timestamps: true });

module.exports = mongoose.model('GuildConfig', guildConfigSchema);