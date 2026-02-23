const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antiraid')
        .setDescription('Configure anti-raid system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        /* ===== TOGGLE ===== */
        .addSubcommand(sub =>
            sub.setName('toggle')
                .setDescription('Enable or disable anti-raid')
                .addStringOption(o =>
                    o.setName('mode')
                        .setDescription('Enable or disable')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Enable', value: 'enable' },
                            { name: 'Disable', value: 'disable' }
                        )
                )
        )

        /* ===== STATUS ===== */
        .addSubcommand(sub =>
            sub.setName('status')
                .setDescription('View current anti-raid settings')
        )

        /* ===== SET LOG ===== */
        .addSubcommand(sub =>
            sub.setName('setlog')
                .setDescription('Set logging channel')
                .addChannelOption(o =>
                    o.setName('channel')
                        .setDescription('Log channel')
                        .setRequired(true)
                )
        )

        /* ===== RAID LIMIT ===== */
        .addSubcommand(sub =>
            sub.setName('setraidlimit')
                .setDescription('Set raid join limit')
                .addIntegerOption(o =>
                    o.setName('amount').setDescription('Joins before trigger').setRequired(true)
                )
                .addIntegerOption(o =>
                    o.setName('time').setDescription('Time window (seconds)').setRequired(true)
                )
        )

        /* ===== ACCOUNT AGE ===== */
        .addSubcommand(sub =>
            sub.setName('setaccountage')
                .setDescription('Set minimum account age')
                .addIntegerOption(o =>
                    o.setName('minutes')
                        .setDescription('Minimum age in minutes (0 = disable)')
                        .setRequired(true)
                )
        )

        /* ===== WHITELIST ROLE ===== */
        .addSubcommand(sub =>
            sub.setName('whitelist')
                .setDescription('Add or remove whitelist role')
                .addRoleOption(o =>
                    o.setName('role').setDescription('Role to whitelist').setRequired(true)
                )
        )

        /* ===== AUTO UNLOCK TIMER ===== */
        .addSubcommand(sub =>
            sub.setName('autounlock')
                .setDescription('Set auto unlock timer')
                .addIntegerOption(o =>
                    o.setName('seconds')
                        .setDescription('Seconds before auto unlock (0 = disable)')
                        .setRequired(true)
                )
        )

        /* ===== MANUAL UNLOCK ===== */
        .addSubcommand(sub =>
            sub.setName('unlock')
                .setDescription('Manually unlock all channels')
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const sub = interaction.options.getSubcommand();

        let config = await GuildConfig.findOne({ guildId: interaction.guild.id });
        if (!config) config = await GuildConfig.create({ guildId: interaction.guild.id });

        /* ===== TOGGLE ===== */
        if (sub === 'toggle') {
            const mode = interaction.options.getString('mode');
            config.antiRaidEnabled = mode === 'enable';
            await config.save();
            return interaction.editReply(`🛡 Anti-raid ${mode}`);
        }

        /* ===== STATUS ===== */
        if (sub === 'status') {
            const embed = new EmbedBuilder()
                .setColor(0x00aeff)
                .setTitle('🛡 Anti-Raid Status')
                .addFields(
                    { name: 'Enabled', value: String(config.antiRaidEnabled), inline: true },
                    { name: 'Punishment', value: config.punishment, inline: true },
                    { name: 'Join Limit', value: `${config.raidJoinLimit}`, inline: true },
                    { name: 'Time Window', value: `${config.raidTimeWindow / 1000}s`, inline: true },
                    { name: 'Min Account Age', value: `${config.minAccountAge / 60000} min`, inline: true },
                    { name: 'Auto Unlock', value: `${config.autoUnlockTime}s`, inline: true },
                    { name: 'Whitelist Roles', value: config.whitelistRoles.length ? config.whitelistRoles.map(r => `<@&${r}>`).join(', ') : 'None' }
                );

            return interaction.editReply({ embeds: [embed] });
        }

        /* ===== SET LOG ===== */
        if (sub === 'setlog') {
            const channel = interaction.options.getChannel('channel');
            config.logChannelId = channel.id;
            await config.save();
            return interaction.editReply(`📢 Log channel set.`);
        }

        /* ===== RAID LIMIT ===== */
        if (sub === 'setraidlimit') {
            const amount = interaction.options.getInteger('amount');
            const time = interaction.options.getInteger('time');
            config.raidJoinLimit = amount;
            config.raidTimeWindow = time * 1000;
            await config.save();
            return interaction.editReply(`🚨 Updated raid trigger.`);
        }

        /* ===== ACCOUNT AGE ===== */
        if (sub === 'setaccountage') {
            const minutes = interaction.options.getInteger('minutes');
            config.minAccountAge = minutes * 60000;
            await config.save();
            return interaction.editReply(`👶 Updated account age filter.`);
        }

        /* ===== WHITELIST ROLE ===== */
        if (sub === 'whitelist') {
            const role = interaction.options.getRole('role');

            if (config.whitelistRoles.includes(role.id)) {
                config.whitelistRoles = config.whitelistRoles.filter(r => r !== role.id);
                await config.save();
                return interaction.editReply(`❌ Removed ${role.name} from whitelist.`);
            } else {
                config.whitelistRoles.push(role.id);
                await config.save();
                return interaction.editReply(`✅ Added ${role.name} to whitelist.`);
            }
        }

        /* ===== AUTO UNLOCK TIMER ===== */
        if (sub === 'autounlock') {
            const seconds = interaction.options.getInteger('seconds');
            config.autoUnlockTime = seconds;
            await config.save();
            return interaction.editReply(`⏱ Auto-unlock set to ${seconds}s.`);
        }

        /* ===== MANUAL UNLOCK ===== */
        if (sub === 'unlock') {
            interaction.guild.channels.cache.forEach(channel => {
                if (channel.permissionOverwrites) {
                    channel.permissionOverwrites.edit(
                        interaction.guild.roles.everyone,
                        { SendMessages: null }
                    ).catch(() => {});
                }
            });

            config.lockdown = false;
            await config.save();

            return interaction.editReply('🔓 Channels unlocked.');
        }
    }
};