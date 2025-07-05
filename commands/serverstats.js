const BaseCommand = require('./BaseCommand');
const Discord = require('discord.js');

class ServerStatsCommand extends BaseCommand {
  constructor() {
    super(
      'serverstats',
      'Show detailed server statistics',
      '!serverstats',
      ['ADMIN']
    );
  }

  async execute(msg, args, client, utils) {
    try {
      const guilds = client.guilds.cache;
      const totalMembers = guilds.reduce((acc, guild) => acc + guild.memberCount, 0);
      const totalChannels = guilds.reduce((acc, guild) => acc + guild.channels.cache.size, 0);
      const totalRoles = guilds.reduce((acc, guild) => acc + guild.roles.cache.size, 0);
      
      // Calculate server sizes
      const smallServers = guilds.filter(g => g.memberCount < 100).size;
      const mediumServers = guilds.filter(g => g.memberCount >= 100 && g.memberCount < 1000).size;
      const largeServers = guilds.filter(g => g.memberCount >= 1000).size;
      
      // Get top servers by member count
      const topServers = guilds
        .sort((a, b) => b.memberCount - a.memberCount)
        .first(5)
        .map(g => `${g.name}: ${g.memberCount.toLocaleString()} members`)
        .join('\n');
      
      const embed = new Discord.EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('📊 Detailed Server Statistics')
        .setDescription(`Analysis of ${guilds.size} servers`)
        .addFields(
          { name: '📈 Total Statistics', value: `**Servers:** ${guilds.size.toLocaleString()}\n**Members:** ${totalMembers.toLocaleString()}\n**Channels:** ${totalChannels.toLocaleString()}\n**Roles:** ${totalRoles.toLocaleString()}`, inline: true },
          { name: '📊 Server Sizes', value: `**Small (<100):** ${smallServers}\n**Medium (100-1K):** ${mediumServers}\n**Large (1K+):** ${largeServers}`, inline: true },
          { name: '🏆 Top 5 Servers', value: topServers || 'None found', inline: false }
        )
        .setTimestamp();
      
      await msg.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error showing server stats:', error.message);
      await msg.reply('❌ Error occurred while getting server statistics.');
    }
  }
}

module.exports = ServerStatsCommand;