require('dotenv').config();
const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  PermissionsBitField, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');
const express = require('express'); // para Render

// Servidor HTTP para Render
const app = express();
app.get('/', (req, res) => res.send('Bot funcionando'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor HTTP en puerto ${PORT}`));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// Configuración
const prefix = '!';
const verifyChannelName = '🔒║verify';
const verifyRoleName = 'User';
const staffRoleName = 'Staff';
const adminRoleName = 'Admin';
const supportChannelName = '🔖║supported';
const staffSettingsRoleName = 'Staff Settings'; // <— nuevo rol que puede usar comandos
const pollsChannelName = '📊║weekly-polls'; // <— canal de polls

const ticketCategories = {
  general: '🛠️ ║Supported General',
  reportstaff: '👮 ║Report Staff',
  media: '📹 ║Media & Content',
  buycraft: '💸 ║Buycraft Support',
  faction: '⚔️║ Repport Faction',
  appeal: '⚖️ ║Appelations'
};

client.once('ready', () => {
  console.log(`✅ ${client.user.tag} online`);
});

// Comandos
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  // chequeo de rol Staff Settings
  const staffSettingsRole = message.guild.roles.cache.find(r => r.name === staffSettingsRoleName);
  if (!staffSettingsRole) return message.reply('⚠️ No existe el rol Staff Settings.');
  if (!message.member.roles.cache.has(staffSettingsRole.id)) return; // no tiene rol => no ejecuta comandos

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // enviar botón verificación
  if (command === 'sendverify') {
    const channel = message.guild.channels.cache.find(c => c.name === verifyChannelName);
    if (!channel) return message.reply('No existe canal de verificación');

    const embed = new EmbedBuilder()
      .setTitle('✅ Verificación')
      .setDescription('Haz click en el botón para verificarte y acceder al servidor.')
      .setColor('Green');

    const button = new ButtonBuilder()
      .setCustomId('verify')
      .setLabel('Verificarme')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(button);
    channel.send({ embeds: [embed], components: [row] });
    message.reply('Botón de verificación enviado.');
  }

  // enviar menú de tickets
  if (command === 'sendticket') {
    const channel = message.guild.channels.cache.find(c => c.name === supportChannelName);
    if (!channel) return message.reply('No existe canal de soporte');

    const embed = new EmbedBuilder()
      .setTitle('📬 Need assistance?')
      .setDescription(
        `We are here to assist you with any issue.\n\n` +
        `Open a ticket to get in touch with our staff team.\n` +
        `If your request is not answered immediately, please remain patient.\n` +
        `Click one of the options below to choose the type of ticket you wish to create.`
      )
      .setColor('Blue');

    const menu = new StringSelectMenuBuilder()
      .setCustomId('selectTicket')
      .setPlaceholder('🎫 Select your ticket type')
      .addOptions([
        { label: 'General Support', value: 'general', emoji: '🛠️' },
        { label: 'Report Staff', value: 'reportstaff', emoji: '👮' },
        { label: 'Media Team & Support', value: 'media', emoji: '📹' },
        { label: 'Support BuyCraft', value: 'buycraft', emoji: '💸' },
        { label: 'Factions Report', value: 'faction', emoji: '⚔️' },
        { label: 'Appeal Sanction', value: 'appeal', emoji: '⚖️' }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);
    channel.send({ embeds: [embed], components: [row] });
    message.reply('✅ Menú de tickets enviado.');
  }

  // comando poll (manda embed directo a canal 📊║weekly-polls)
  if (command === 'poll') {
    const question = args.join(' ');
    if (!question) return message.reply('Pon la pregunta: `!poll Tu pregunta`');

    const embed = new EmbedBuilder()
      .setTitle('📊 Encuesta')
      .setDescription(question)
      .setColor('Purple');

    const pollsChannel = message.guild.channels.cache.find(c => c.name === pollsChannelName);
    if (!pollsChannel) return message.reply('No existe canal de polls.');

    const pollMsg = await pollsChannel.send({ embeds: [embed] });
    await pollMsg.react('✅');
    await pollMsg.react('❌');
    message.reply('📊 Encuesta enviada al canal de polls.');
  }

  // comando say (bot escribe como si fuera él)
  if (command === 'say') {
    const text = args.join(' ');
    if (!text) return message.reply('Escribe algo: `!say tu texto`');
    await message.delete().catch(() => {}); // borra tu mensaje
    message.channel.send(text); // bot lo dice
  }
});

// botones y select menu
client.on('interactionCreate', async interaction => {
  // verificación
  if (interaction.isButton() && interaction.customId === 'verify') {
    const role = interaction.guild.roles.cache.find(r => r.name === verifyRoleName);
    if (!role) return interaction.reply({ content: 'No existe rol de verificación.', ephemeral: true });
    await interaction.member.roles.add(role);
    return interaction.reply({ content: '✅ Verificado.', ephemeral: true });
  }

  // select de tickets
  if (interaction.isStringSelectMenu() && interaction.customId === 'selectTicket') {
    const type = interaction.values[0];
    const categoryName = ticketCategories[type];
    const staffRole = interaction.guild.roles.cache.find(r => r.name === staffRoleName);
    const adminRole = interaction.guild.roles.cache.find(r => r.name === adminRoleName);
    if (!categoryName) return interaction.reply({ content: 'No se encuentra la categoría.', ephemeral: true });

    const existing = interaction.guild.channels.cache.find(c => c.name === `ticket-${interaction.user.username.toLowerCase()}`);
    if (existing) return interaction.reply({ content: 'Ya tienes un ticket abierto.', ephemeral: true });

    const category = interaction.guild.channels.cache.find(c => c.name === categoryName && c.type === 4);
    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: 0,
      parent: category ? category.id : null,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: staffRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: adminRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const embedTicket = new EmbedBuilder()
      .setTitle('🎫 Ticket de Soporte')
      .setDescription(
        `Ticket creado por <@${interaction.user.id}>.\n` +
        `Por favor espera a que un miembro de nuestro <@&${staffRole.id}> atienda tu ticket.`
      )
      .setColor('Orange');

    const btnClaim = new ButtonBuilder()
      .setCustomId('claim')
      .setLabel('Reclamar ticket')
      .setStyle(ButtonStyle.Primary);

    const btnClose = new ButtonBuilder()
      .setCustomId('close')
      .setLabel('Cerrar ticket')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(btnClaim, btnClose);

    await channel.send({ embeds: [embedTicket], components: [row] });
    return interaction.reply({ content: `✅ Ticket creado: ${channel}`, ephemeral: true });
  }

  // reclamar ticket
  if (interaction.isButton() && interaction.customId === 'claim') {
    const staffRole = interaction.guild.roles.cache.find(r => r.name === staffRoleName);
    if (!interaction.member.roles.cache.has(staffRole.id)) {
      return interaction.reply({ content: 'Solo Staff puede reclamar.', ephemeral: true });
    }

    await interaction.channel.permissionOverwrites.edit(staffRole.id, {
      ViewChannel: true,
      SendMessages: false
    });
    await interaction.channel.permissionOverwrites.edit(interaction.member.id, {
      SendMessages: true
    });

    return interaction.reply({ content: `🎫 Ticket reclamado por ${interaction.user}`, ephemeral: false });
  }

  // cerrar ticket
  if (interaction.isButton() && interaction.customId === 'close') {
    await interaction.reply({ content: '🔒 Cerrando ticket…' });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
  }
});

client.login(process.env.TOKEN);