const BaseCommand = require('./BaseCommand');
const Discord = require('discord.js');

class UpdateCacheCommand extends BaseCommand {
  constructor() {
    super(
      'updatecache',
      'Manually update the member cache for all servers',
      '!updatecache',
      ['ADMIN']
    );
  }

  async execute(msg, args, client, utils) {
    const { updateAllMemberCaches, isCacheUpdating, memberCache, cacheTimestamps } = utils;
    
    try {
      if (isCacheUpdating) {
        await msg.reply('⏭️ Cache update already in progress. Please wait...');
        return;
      }
      
      await msg.reply('🚀 Starting manual member cache update for all servers...');
      
      const startTime = Date.now();
      await updateAllMemberCaches();
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      
      const totalMembers = Array.from(memberCache.values()).reduce((sum, cache) => sum + cache.size, 0);
      const totalServers = memberCache.size;
      
      const embed = new Discord.EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('✅ Member Cache Updated')
        .setDescription(`Successfully updated member cache for all servers`)
        .addFields(
          { name: '📊 Servers Cached', value: totalServers.toString(), inline: true },
          { name: '👥 Total Members', value: totalMembers.toLocaleString(), inline: true },
          { name: '⏱️ Update Time', value: `${totalTime}s`, inline: true },
          { name: '🔄 Next Auto Update', value: `In 30 minutes`, inline: true },
          { name: '⚡ Performance', value: `${(totalServers / parseFloat(totalTime)).toFixed(1)} servers/sec`, inline: true },
          { name: '💾 Cache Status', value: `Fresh & Ready`, inline: true }
        )
        .setTimestamp();
      
      await msg.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in manual cache update:', error.message);
      await msg.reply('❌ Error occurred during cache update.');
    }
  }
}

module.exports = UpdateCacheCommand;