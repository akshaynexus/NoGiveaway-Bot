const BaseCommand = require('./BaseCommand');
const Discord = require('discord.js');

class RecentJoinsCommand extends BaseCommand {
  constructor() {
    super(
      'recentjoins',
      'Show recent member joins across all servers',
      '!recentjoins [hours]',
      ['ADMIN']
    );
  }

  async execute(msg, args, client, utils) {
    try {
      const hours = args.length > 0 ? Math.max(parseInt(args[0]) || 24, 1) : 24;
      const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
      
      const recentJoins = [];
      
      for (const guild of client.guilds.cache.values()) {
        try {
          const members = await guild.members.fetch({ limit: 100 });
          
          for (const member of members.values()) {
            if (member.joinedTimestamp && member.joinedTimestamp > cutoffTime) {
              recentJoins.push({
                member,
                guild,
                joinedAt: member.joinedAt
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching members for ${guild.name}:`, error.message);
        }
      }
      
      // Sort by join time (newest first)
      recentJoins.sort((a, b) => b.joinedAt - a.joinedAt);
      
      if (recentJoins.length === 0) {
        await msg.reply(`📭 No recent joins found in the last ${hours} hours.`);
        return;
      }
      
      const joinsList = recentJoins.slice(0, 20).map(join => {
        const timeAgo = Math.round((Date.now() - join.joinedAt) / (1000 * 60));
        const timeString = timeAgo < 60 ? `${timeAgo}m ago` : `${Math.round(timeAgo / 60)}h ago`;
        return `**${join.member.user.username}** joined **${join.guild.name}**\n└ 🕐 ${timeString} | 👥 ${join.guild.memberCount.toLocaleString()} members`;
      }).join('\n\n');
      
      // Group by server for statistics
      const serverStats = {};
      recentJoins.forEach(join => {
        const serverId = join.guild.id;
        if (!serverStats[serverId]) {
          serverStats[serverId] = {
            name: join.guild.name,
            count: 0
          };
        }
        serverStats[serverId].count++;
      });
      
      const topServers = Object.values(serverStats)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(server => `**${server.name}:** ${server.count} joins`)
        .join('\n');
      
      const embed = new Discord.EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle(`📈 Recent Joins (Last ${hours} hours)`)
        .setDescription(joinsList)
        .addFields(
          { name: '📊 Summary', value: `**Total Joins:** ${recentJoins.length}\n**Servers Affected:** ${Object.keys(serverStats).length}`, inline: true },
          { name: '🏆 Most Active Servers', value: topServers || 'None', inline: true }
        )
        .setTimestamp();
      
      if (recentJoins.length > 20) {
        embed.setFooter({ text: `Showing first 20 of ${recentJoins.length} recent joins` });
      }
      
      await msg.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error showing recent joins:', error.message);
      await msg.reply('❌ Error occurred while getting recent joins.');
    }
  }
}

module.exports = RecentJoinsCommand;