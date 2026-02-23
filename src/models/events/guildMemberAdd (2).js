const GuildConfig = require('../../dashboard/models/GuildConfig');

const joinMap = new Map();

module.exports = async (member) => {
  try {

    const config = await GuildConfig.findOne({
      guildId: member.guild.id
    });

    if (!config || !config.antiRaidEnabled) return;

    const now = Date.now();
    const timeWindow = config.raidTimeWindow || 10000;
    const maxJoins = config.raidJoinLimit || 5;

    if (!joinMap.has(member.guild.id)) {
      joinMap.set(member.guild.id, []);
    }

    const recentJoins = joinMap
      .get(member.guild.id)
      .filter(timestamp => now - timestamp < timeWindow);

    recentJoins.push(now);
    joinMap.set(member.guild.id, recentJoins);

    /* ---------------- RAID DETECTION ---------------- */

    if (recentJoins.length >= maxJoins) {

      console.log(`🚨 Raid detected in ${member.guild.name}`);

      member.guild.channels.cache.forEach(channel => {
        if (!channel.permissionOverwrites) return;

        channel.permissionOverwrites.edit(
          member.guild.roles.everyone,
          { SendMessages: false }
        ).catch(() => {});
      });

      await GuildConfig.updateOne(
        { guildId: member.guild.id },
        { lockdown: true }
      );
    }

    /* ---------------- ACCOUNT AGE CHECK ---------------- */

    const accountAge = Date.now() - member.user.createdAt;
    const minAgeMs =
      (config.minAccountAge || 0) *
      24 * 60 * 60 * 1000;

    if (accountAge < minAgeMs) {

      if (config.punishment === "ban") {
        await member.ban({
          reason: "Anti-Raid: Account too new"
        });
      } else {
        await member.kick("Anti-Raid: Account too new");
      }

      console.log(`⚠️ Anti-Raid triggered in ${member.guild.name}`);
    }

  } catch (err) {
    console.error("Anti-Raid Error:", err);
  }
};