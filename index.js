require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const clockDataFile = 'clockData.json';
let clockData = fs.existsSync(clockDataFile) ? JSON.parse(fs.readFileSync(clockDataFile)) : {};

const commands = [
  new SlashCommandBuilder().setName('clockin').setDescription('Clock in'),
  new SlashCommandBuilder().setName('clockout').setDescription('Clock out'),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`${client.user.tag} is online and ready!`);
  } catch (err) {
    console.error(err);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const userId = interaction.user.id;
  const username = interaction.user.username;

  if (!clockData[userId]) {
    clockData[userId] = { current: {}, history: [] };
  }

  if (interaction.commandName === 'clockin') {
    if (clockData[userId].current.clockedIn) {
      return interaction.reply({ content: 'You already clocked in.', ephemeral: true });
    }

    const now = new Date();
    clockData[userId].current = {
      clockedIn: true,
      start: now.toISOString()
    };

    fs.writeFileSync(clockDataFile, JSON.stringify(clockData, null, 2));
    interaction.reply(`**${username}**, clocked in at **${now.toLocaleTimeString()}** on **${now.toDateString()}**.`);
  }

  if (interaction.commandName === 'clockout') {
    const current = clockData[userId].current;
    if (!current?.clockedIn) {
      return interaction.reply({ content: 'You are not clocked in.', ephemeral: true });
    }

    const start = new Date(current.start);
    const end = new Date();
    const duration = ((end - start) / 3600000).toFixed(2);

    clockData[userId].history.push({
      start: current.start,
      end: end.toISOString(),
      hours: parseFloat(duration)
    });

    clockData[userId].current = { clockedIn: false };
    fs.writeFileSync(clockDataFile, JSON.stringify(clockData, null, 2));

    interaction.reply(
      `**${username}**, clocked out at **${end.toLocaleTimeString()}** on **${end.toDateString()}**.\n` +
      `Total hours worked: **${duration} hours**.`
    );
  }
});

client.login(process.env.TOKEN);
