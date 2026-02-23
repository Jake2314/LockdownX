const GuildConfig = require('../models/GuildConfig');

const joinMap = new Map();

module.exports = async (member) => {
    const config = await GuildConfig.findOne({ guildId: member.guild.id });
    if (!config || !config.antiRaidEnabled) return;

    const now = Date.now();
    const timeWindow = 10000; // 10 seconds
    const maxJoins = 5;

    if (!joinMap.has(member.guild.id)) {
        joinMap.set(member.guild.id, []);
    }

    const joins = joinMap.get(member.guild.id)
        .filter(timestamp => now - timestamp < timeWindow);

    joins.push(now);
    joinMap.set(member.guild.id, joins);

    if (joins.length >= maxJoins) {
        console.log(`🚨 Raid detected in ${member.guild.name}`);

        member.guild.channels.cache.forEach(channel => {
            if (channel.permissionOverwrites) {
                channel.permissionOverwrites.edit(
                    member.guild.roles.everyone,
                    { SendMessages: false }
                ).catch(() => {});
            }
        });

        await GuildConfig.updateOne(
            { guildId: member.guild.id },
            { lockdown: true }
        );
    }
};