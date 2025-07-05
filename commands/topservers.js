const BaseCommand = require('./BaseCommand');
const Discord = require('discord.js');

class TopServersCommand extends BaseCommand {
  constructor() {
    super(
      'topservers',
      'Show top servers by member count',
      '!topservers [limit]',
      ['ADMIN']
    );
  }

  async execute(msg, args, client, utils) {
    try {
      const limit = args.length > 0 ? Math.min(parseInt(args[0]) || 10, 25) : 10;
      
      const guilds = client.guilds.cache
        .sort((a, b) => b.memberCount - a.memberCount)
        .first(limit);
      
      if (guilds.length === 0) {
        await msg.reply('❌ No servers found.');
        return;
      }
      
      const serverList = guilds.map((guild, index) => {
        const rank = index + 1;
        const emoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅';
        return `${emoji} **${rank}.** ${guild.name}\n└ 👥 ${guild.memberCount.toLocaleString()} members | 📺 ${guild.channels.cache.size} channels`;
      }).join('\n\n');
      
      const totalMembers = guilds.reduce((acc, guild) => acc + guild.memberCount, 0);
      
      const embed = new Discord.EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle(`🏆 Top ${limit} Servers by Member Count`)
        .setDescription(serverList)
        .addFields(
          { name: '📊 Statistics', value: `**Total Members:** ${totalMembers.toLocaleString()}\n**Average per Server:** ${Math.round(totalMembers / guilds.length).toLocaleString()}`, inline: true },
          { name: '📈 Range', value: `**Largest:** ${guilds[0].memberCount.toLocaleString()}\n**Smallest:** ${guilds[guilds.length - 1].memberCount.toLocaleString()}`, inline: true }
        )
        .setTimestamp();
      
      await msg.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error showing top servers:', error.message);
      await msg.reply('❌ Error occurred while getting top servers.');
    }
  }
}

module.exports = TopServersCommand;