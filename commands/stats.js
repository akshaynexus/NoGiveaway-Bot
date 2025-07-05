const BaseCommand = require('./BaseCommand');
const Discord = require('discord.js');

class StatsCommand extends BaseCommand {
  constructor() {
    super(
      'stats',
      'Show bot statistics and performance metrics',
      '!stats'
    );
  }

  async execute(msg, args, client, utils) {
    try {
      const uptime = process.uptime();
      const uptimeString = this.formatUptime(uptime);
      
      const totalGuilds = client.guilds.cache.size;
      const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
      const totalChannels = client.channels.cache.size;
      
      // Memory usage
      const memUsage = process.memoryUsage();
      const memoryUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
      const memoryTotal = Math.round(memUsage.heapTotal / 1024 / 1024);
      
      // Cache stats
      const { memberCache, cacheTimestamps } = utils;
      const cachedServers = memberCache ? memberCache.size : 0;
      const cachedMembers = memberCache ? Array.from(memberCache.values()).reduce((sum, cache) => sum + cache.size, 0) : 0;
      
      const embed = new Discord.EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('📊 Bot Statistics')
        .setDescription('Current bot performance and statistics')
        .addFields(
          { name: '🤖 Bot Info', value: `**Name:** ${client.user.username}\n**Uptime:** ${uptimeString}\n**Ping:** ${client.ws.ping}ms`, inline: true },
          { name: '📈 Server Stats', value: `**Servers:** ${totalGuilds.toLocaleString()}\n**Members:** ${totalMembers.toLocaleString()}\n**Channels:** ${totalChannels.toLocaleString()}`, inline: true },
          { name: '💾 Memory Usage', value: `**Used:** ${memoryUsed} MB\n**Total:** ${memoryTotal} MB\n**Usage:** ${Math.round((memoryUsed / memoryTotal) * 100)}%`, inline: true },
          { name: '🚀 Performance', value: `**Runtime:** Bun ${process.versions.bun}\n**Platform:** ${process.platform}\n**Node Version:** ${process.version}`, inline: true },
          { name: '💾 Cache System', value: `**Cached Servers:** ${cachedServers}\n**Cached Members:** ${cachedMembers.toLocaleString()}\n**Hit Rate:** ${cachedServers > 0 ? Math.round((cachedServers / totalGuilds) * 100) : 0}%`, inline: true },
          { name: '⚡ Speed Metrics', value: `**Cleanup Speed:** ${cachedServers > 0 ? 'INSTANT' : 'Fast'}\n**Cache Status:** ${cachedServers > 0 ? '✅ Active' : '⚠️ Building'}\n**Parallel Processing:** ✅ Enabled`, inline: true }
        )
        .setThumbnail(client.user.displayAvatarURL())
        .setTimestamp();
      
      await msg.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error showing stats:', error.message);
      await msg.reply('❌ Error occurred while getting statistics.');
    }
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}

module.exports = StatsCommand;