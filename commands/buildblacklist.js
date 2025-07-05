const BaseCommand = require('./BaseCommand');
const Discord = require('discord.js');

class BuildBlacklistCommand extends BaseCommand {
  constructor() {
    super(
      'buildblacklist',
      'Build blacklist for the current server',
      '!buildblacklist',
      ['ADMIN']
    );
  }

  async execute(msg, args, client, utils) {
    const { BlacklistUtil, clearVars } = utils;
    
    try {
      // Reset existing blacklist
      const blacklistedIds = utils.blacklistedIds || [];
      const banCount = utils.banCount || 0;
      
      if (blacklistedIds.length > 0 || banCount > 0) {
        clearVars();
      }
      
      const guild = msg.guild;
      if (!guild) {
        await msg.reply('❌ This command can only be used in a server.');
        return;
      }
      
      console.log(`🔍 Building blacklist for server: ${guild.name}`);
      await msg.reply('🔄 Building blacklist... This may take a moment.');
      
      // Fetch all members
      const members = await guild.members.fetch();
      console.log(`📥 Fetched ${members.size} members from ${guild.name}`);
      
      let foundCount = 0;
      
      // Check each member against blacklist
      for (const member of members.values()) {
        if (BlacklistUtil.CheckBLMatchMember(member)) {
          console.log(`🚫 Found blacklisted user: ${member.user.username} (${member.user.id})`);
          blacklistedIds.push(member.user.id);
          foundCount++;
        }
      }
      
      console.log(`✅ Blacklist built: ${foundCount} blacklisted users found`);
      
      const embed = new Discord.EmbedBuilder()
        .setColor(foundCount > 0 ? 0xff6b6b : 0x2ecc71)
        .setTitle('✅ Blacklist Built Successfully')
        .setDescription(`Scanned ${members.size} members in **${guild.name}**`)
        .addFields(
          { name: '🔍 Members Scanned', value: members.size.toLocaleString(), inline: true },
          { name: '🚫 Blacklisted Found', value: foundCount.toString(), inline: true },
          { name: '📈 Detection Rate', value: `${((foundCount / members.size) * 100).toFixed(2)}%`, inline: true }
        )
        .setTimestamp();
      
      if (foundCount > 0) {
        embed.addFields({
          name: '⚠️ Next Steps',
          value: `Use \`!banblacklisted\` to ban all ${foundCount} blacklisted users`,
          inline: false
        });
      }
      
      await msg.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error building blacklist:', error.message);
      await msg.reply('❌ Error occurred while building blacklist.');
    }
  }
}

module.exports = BuildBlacklistCommand;