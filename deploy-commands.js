require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('antiraid')
        .setDescription('Enable or disable anti-raid')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Enable or disable')
                .setRequired(true)
                .addChoices(
                    { name: 'enable', value: 'enable' },
                    { name: 'disable', value: 'disable' }
                )
        ),

    new SlashCommandBuilder()
        .setName('lockdown')
        .setDescription('Disable lockdown')
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Registering slash commands...');

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands.map(command => command.toJSON()) }
        );

        console.log('Slash commands registered successfully.');
    } catch (error) {
        console.error(error);
    }
})();
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = require(`./src/commands/${interaction.commandName}.js`);
    if (!command) return;

    await command.execute(interaction);
});
