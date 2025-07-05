const BaseCommand = require('./BaseCommand');
const Discord = require('discord.js');

class CacheStatsCommand extends BaseCommand {
  constructor() {
    super(
      'cachestats',
      'Show statistics about the member cache system',
      '!cachestats',
      ['ADMIN']
    );
  }

  async execute(msg, args, client, utils) {
    const { memberCache, cacheTimestamps, isCacheUpdating, isCacheValid } = utils;
    
    try {
      const totalMembers = Array.from(memberCache.values()).reduce((sum, cache) => sum + cache.size, 0);
      const totalServers = memberCache.size;
      const validCaches = Array.from(cacheTimestamps.keys()).filter(guildId => isCacheValid(guildId)).length;
      const expiredCaches = totalServers - validCaches;
      
      // Calculate cache ages
      const now = Date.now();
      const cacheAges = Array.from(cacheTimestamps.values()).map(timestamp => now - timestamp);
      const avgAge = cacheAges.length > 0 ? cacheAges.reduce((sum, age) => sum + age, 0) / cacheAges.length : 0;
      const oldestAge = cacheAges.length > 0 ? Math.max(...cacheAges) : 0;
      
      const embed = new Discord.EmbedBuilder()
        .setColor(validCaches > expiredCaches ? 0x00ff00 : 0xff6b6b)
        .setTitle('💾 Member Cache Statistics')
        .setDescription(`Current status of the member cache system`)
        .addFields(
          { name: '📊 Cache Overview', value: `**Total Servers:** ${totalServers}\n**Valid Caches:** ${validCaches}\n**Expired Caches:** ${expiredCaches}`, inline: true },
          { name: '👥 Member Data', value: `**Total Cached:** ${totalMembers.toLocaleString()}\n**Avg per Server:** ${Math.round(totalMembers / totalServers)}\n**Update Status:** ${isCacheUpdating ? 'Updating...' : 'Idle'}`, inline: true },
          { name: '⏰ Cache Ages', value: `**Average Age:** ${Math.round(avgAge / 60000)} minutes\n**Oldest Cache:** ${Math.round(oldestAge / 60000)} minutes\n**Cache Duration:** 30 minutes`, inline: true },
          { name: '🚀 Performance Impact', value: `**Cleanup Speed:** ${validCaches > 0 ? 'INSTANT' : 'Fetch Required'}\n**Cache Hit Rate:** ${Math.round((validCaches / totalServers) * 100)}%\n**Status:** ${validCaches > expiredCaches ? '✅ Optimal' : '⚠️ Needs Update'}`, inline: false }
        )
        .setTimestamp();
      
      await msg.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error showing cache stats:', error.message);
      await msg.reply('❌ Error occurred while getting cache statistics.');
    }
  }
}

module.exports = CacheStatsCommand;