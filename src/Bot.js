const { Client, GatewayIntentBits } = require('discord.js');

function startBot() {
    const client = new Client({
        intents: [GatewayIntentBits.Guilds]
    });

  client.once('clientReady', () => {
        console.log(`🤖 Logged in as ${client.user.tag}`);
    });

    client.login(process.env.TOKEN);
}

module.exports = startBot;