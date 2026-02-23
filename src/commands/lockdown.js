const GuildConfig = require('../models/GuildConfig');

module.exports = {
    name: 'lockdown',
    description: 'Disable lockdown',

    async execute(interaction) {

        // ✅ Updated way (replaces ephemeral: true)
        await interaction.deferReply({ flags: 64 });

        const config = await GuildConfig.findOne({ guildId: interaction.guild.id });

        if (!config) {
            return interaction.editReply('Config not found.');
        }

        config.lockdown = false;
        await config.save();

        // Unlock all channels
        interaction.guild.channels.cache.forEach(channel => {
            if (channel.permissionOverwrites) {
                channel.permissionOverwrites.edit(
                    interaction.guild.roles.everyone,
                    { SendMessages: true }
                ).catch(() => {});
            }
        });

        await interaction.editReply('🔓 Lockdown disabled.');
    }
};