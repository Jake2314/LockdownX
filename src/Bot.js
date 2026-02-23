const { Client, GatewayIntentBits } = require('discord.js');
const GuildConfig = require('./dashboard/models/GuildConfig');

const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

client.login(process.env.TOKEN);

module.exports = client;