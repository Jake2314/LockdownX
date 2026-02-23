require('dotenv').config();

const { 
    Client, 
    GatewayIntentBits 
} = require('discord.js');

const mongoose = require('mongoose');
const GuildConfig = require('./src/models/GuildConfig');
const AuditLog = require('./src/models/AuditLog');
const { getIO } = require('./shared/socket');

// =============================
// DISCORD CLIENT SETUP
// =============================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// =============================
// MONGODB CONNECTION
// =============================

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ Mongo Error:', err));

// =============================
// BOT READY
// =============================

client.once('clientReady', () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
});

// =====================================================
// 🔥 ANTI-RAID + MEMBER JOIN SOCKET
// =====================================================

client.on('guildMemberAdd', async (member) => {

    // ✅ Live member join
    try {
        const io = getIO();
        io.emit('memberJoin', {
            guildId: member.guild.id,
            username: member.user.tag
        });
    } catch {}

    try {
        const config = await GuildConfig.findOne({ guildId: member.guild.id });
        if (!config || !config.antiRaidEnabled) return;

        const recentJoins = member.guild.members.cache.filter(
            m => Date.now() - m.joinedTimestamp < 10000
        );

        if (recentJoins.size > config.raidThreshold) {

            await member.kick("Raid Protection");

            await AuditLog.create({
                guildId: member.guild.id,
                action: "Raid Kick",
                user: member.user.tag,
                timestamp: new Date()
            });

            const io = getIO();
            io.emit('raidAction', {
                guildId: member.guild.id,
                message: `${member.user.tag} kicked (Raid Protection)`
            });

            console.log(`🚨 Raid detected in ${member.guild.name}`);
        }
    } catch (err) {
        console.error("Anti-raid error:", err);
    }
});

// =====================================================
// 📊 ANALYTICS SYSTEM
// =====================================================

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    try {
        await GuildConfig.updateOne(
            { guildId: message.guild.id },
            { $inc: { messageCount: 1 } },
            { upsert: true }
        );

        // ✅ Live message socket
        try {
            const io = getIO();
            io.emit('messageUpdate', {
                guildId: message.guild.id,
                channel: message.channel.name,
                user: message.author.tag
            });
        } catch {}

    } catch (err) {
        console.error("Analytics error:", err);
    }
});

// =====================================================
// ⚡ SLASH COMMAND HANDLER
// =====================================================

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    try {
        const command = require(`./src/commands/${interaction.commandName}.js`);
        if (!command) return;

        await command.execute(interaction);

    } catch (error) {
        console.error("Command Error:", error);

        if (interaction.replied || interaction.deferred) {
            interaction.editReply('❌ Error executing command.');
        } else {
            interaction.reply({ 
                content: '❌ Error executing command.', 
                ephemeral: true 
            });
        }
    }
});

// =====================================================
// LOGIN
// =====================================================

client.login(process.env.DISCORD_TOKEN);

module.exports = client;