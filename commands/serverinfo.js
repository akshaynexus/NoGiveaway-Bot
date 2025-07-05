const BaseCommand = require('./BaseCommand');
const Discord = require('discord.js');

class ServerInfoCommand extends BaseCommand {
  constructor() {
    super(
      'serverinfo',
      'Show detailed information about a specific server',
      '!serverinfo [server_id]',
      ['ADMIN']
    );
  }

  async execute(msg, args, client, utils) {
    try {
      let guild;
      
      if (args.length > 0) {
        // Get specific server by ID
        const guildId = args[0];
        guild = client.guilds.cache.get(guildId);
        
        if (!guild) {
          await msg.reply(`❌ Server with ID \`${guildId}\` not found.`);
          return;
        }
      } else {
        // Use current server
        guild = msg.guild;
        
        if (!guild) {
          await msg.reply('❌ This command must be used in a server or provide a server ID.');
          return;
        }
      }
      
      const owner = await guild.fetchOwner();
      const createdAt = guild.createdAt.toDateString();
      const joinedAt = guild.joinedAt ? guild.joinedAt.toDateString() : 'Unknown';
      
      // Get bot permissions
      const botMember = guild.members.cache.get(client.user.id);
      const permissions = botMember ? botMember.permissions.toArray() : [];
      const hasAdminPerms = permissions.includes('Administrator');
      const hasBanPerms = permissions.includes('BanMembers');
      
      const embed = new Discord.EmbedBuilder()
        .setColor(hasAdminPerms ? 0x2ecc71 : (hasBanPerms ? 0xf39c12 : 0xe74c3c))
        .setTitle(`📋 Server Info: ${guild.name}`)
        .setDescription(`Detailed information about **${guild.name}**`)
        .addFields(
          { name: '🆔 Server ID', value: guild.id, inline: true },
          { name: '👑 Owner', value: `${owner.user.username} (${owner.user.id})`, inline: true },
          { name: '📅 Created', value: createdAt, inline: true },
          { name: '🤝 Joined', value: joinedAt, inline: true },
          { name: '👥 Members', value: guild.memberCount.toLocaleString(), inline: true },
          { name: '📺 Channels', value: guild.channels.cache.size.toString(), inline: true },
          { name: '🎭 Roles', value: guild.roles.cache.size.toString(), inline: true },
          { name: '🔐 Verification', value: guild.verificationLevel.toString(), inline: true },
          { name: '🛡️ Bot Permissions', value: hasAdminPerms ? '✅ Administrator' : (hasBanPerms ? '⚠️ Ban Members' : '❌ Limited'), inline: true }
        )
        .setThumbnail(guild.iconURL())
        .setTimestamp();
      
      if (guild.description) {
        embed.addFields({ name: '📝 Description', value: guild.description, inline: false });
      }
      
      await msg.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error showing server info:', error.message);
      await msg.reply('❌ Error occurred while getting server information.');
    }
  }
}

module.exports = ServerInfoCommand;