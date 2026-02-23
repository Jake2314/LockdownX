const GuildConfig = require('../models/GuildConfig');
const { EmbedBuilder } = require('discord.js');
const generateCaptcha = require('../utils/captcha');

const joinMap = new Map();
const raidCooldown = new Set();

module.exports = async (member) => {
    try {
        const config = await GuildConfig.findOne({ guildId: member.guild.id });
        if (!config || !config.antiRaidEnabled) return;

        const now = Date.now();
        const guildId = member.guild.id;

        /* =============================
           IGNORE BOTS
        ============================== */
        if (member.user.bot) return;

        /* =============================
           ACCOUNT AGE DETECTION
        ============================== */
        const accountAge = now - member.user.createdTimestamp;

        if (config.minAccountAge && accountAge < config.minAccountAge) {
            if (config.punishment === 'ban') {
                await member.ban({ reason: 'Account too new (anti-raid)' }).catch(() => {});
            } else {
                await member.kick('Account too new (anti-raid)').catch(() => {});
            }

            await sendLog(member.guild, config, `🚫 New account blocked: ${member.user.tag}`);
            return;
        }

        /* =============================
           CAPTCHA VERIFICATION
        ============================== */
        if (config.captchaEnabled) {
            const { text, image } = generateCaptcha();

            try {
                await member.send({
                    content: `Type this code to verify:`,
                    files: [image]
                });

                const filter = m => m.author.id === member.id;
                const collector = member.dmChannel.createMessageCollector({ filter, time: 60000 });

                collector.on('collect', async msg => {
                    if (msg.content === text) {
                        await msg.reply('✅ Verified!');
                        collector.stop();
                    }
                });

                collector.on('end', async collected => {
                    if (collected.size === 0) {
                        await member.kick('Failed captcha verification').catch(() => {});
                    }
                });

            } catch {
                await member.kick('Cannot DM for captcha').catch(() => {});
            }
        }

        /* =============================
           JOIN TRACKING
        ============================== */
        if (!joinMap.has(guildId)) joinMap.set(guildId, []);
        joinMap.get(guildId).push(now);

        const recentJoins = joinMap
            .get(guildId)
            .filter(time => now - time < config.raidTimeWindow);

        joinMap.set(guildId, recentJoins);

        /* =============================
           RAID DETECTION
        ============================== */
        if (
            recentJoins.length >= config.raidJoinLimit &&
            !raidCooldown.has(guildId)
        ) {
            console.log(`🚨 Raid detected in ${member.guild.name}`);
            raidCooldown.add(guildId);

            // LOCK CHANNELS
            member.guild.channels.cache.forEach(channel => {
                if (!channel.permissionOverwrites) return;

                channel.permissionOverwrites.edit(
                    member.guild.roles.everyone,
                    { SendMessages: false }
                ).catch(() => {});
            });

            config.lockdown = true;
            await config.save();

            // PUNISH RECENT JOINERS
            const membersToPunish = member.guild.members.cache.filter(m =>
                !m.user.bot &&
                now - m.joinedTimestamp < config.raidTimeWindow
            );

            for (const [, m] of membersToPunish) {
                try {
                    if (config.punishment === 'ban') {
                        await m.ban({ reason: 'Raid detected' });
                    } else {
                        await m.kick('Raid detected');
                    }
                } catch {}
            }

            await sendLog(member.guild, config,
                `🚨 Raid detected!\nUsers joined: ${recentJoins.length}\nChannels locked.`
            );

            // AUTO UNLOCK
            if (config.autoUnlockTime > 0) {
                setTimeout(async () => {

                    member.guild.channels.cache.forEach(channel => {
                        if (!channel.permissionOverwrites) return;

                        channel.permissionOverwrites.edit(
                            member.guild.roles.everyone,
                            { SendMessages: null }
                        ).catch(() => {});
                    });

                    config.lockdown = false;
                    await config.save();

                    console.log(`🔓 Auto-unlocked ${member.guild.name}`);

                }, config.autoUnlockTime * 1000);
            }

            setTimeout(() => {
                raidCooldown.delete(guildId);
            }, 15000);
        }

    } catch (error) {
        console.error('Anti-raid error:', error);
    }
};

/* =============================
   LOGGING FUNCTION
============================= */

async function sendLog(guild, config, message) {
    if (!config.logChannelId) return;

    const channel = guild.channels.cache.get(config.logChannelId);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('LockdownX Anti-Raid')
        .setDescription(message)
        .setTimestamp();

    channel.send({ embeds: [embed] }).catch(() => {});
}
client.on('guildMemberAdd', async (member) => {
  const config = await GuildConfig.findOne({ guildId: member.guild.id });
  if (!config) return;

  if (!config.antiRaidEnabled) return;

  // Example: Basic raid detection
  const accountAge = Date.now() - member.user.createdAt;

  if (accountAge < 3 * 24 * 60 * 60 * 1000) {
    await member.kick("Anti-Raid: Account too new");
  }
});