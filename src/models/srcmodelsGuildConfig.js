const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    antiRaidEnabled: {
        type: Boolean,
        default: false
    },
    lockdown: {
        type: Boolean,
        default: false
    },
    modRoleId: {
        type: String,
        default: null
    },
    joinLogChannelId: {
        type: String,
        default: null
    }
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);