const BaseCommand = require('./BaseCommand');
const Discord = require('discord.js');

class UserInfoCommand extends BaseCommand {
  constructor() {
    super(
      'userinfo',
      'Show detailed information about a user',
      '!userinfo [user_id]',
      ['ADMIN']
    );
  }

  async execute(msg, args, client, utils) {
    try {
      let user;
      let member = null;
      
      if (args.length > 0) {
        // Get specific user by ID
        const userId = args[0];
        try {
          user = await client.users.fetch(userId);
          if (msg.guild) {
            member = await msg.guild.members.fetch(userId).catch(() => null);
          }
        } catch (error) {
          await msg.reply(`❌ User with ID \`${userId}\` not found.`);
          return;
        }
      } else {
        // Use command author
        user = msg.author;
        member = msg.member;
      }
      
      const createdAt = user.createdAt.toDateString();
      const joinedAt = member ? member.joinedAt.toDateString() : 'Not in server';
      
      const embed = new Discord.EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`👤 User Info: ${user.username}`)
        .setDescription(`Information about **${user.username}**`)
        .addFields(
          { name: '🆔 User ID', value: user.id, inline: true },
          { name: '📅 Account Created', value: createdAt, inline: true },
          { name: '🤝 Joined Server', value: joinedAt, inline: true },
          { name: '🤖 Bot', value: user.bot ? 'Yes' : 'No', inline: true }
        )
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();
      
      if (member) {
        const roles = member.roles.cache
          .filter(role => role.name !== '@everyone')
          .map(role => role.name)
          .join(', ') || 'None';
        
        embed.addFields(
          { name: '🎭 Roles', value: roles.length > 1024 ? 'Too many roles to display' : roles, inline: false },
          { name: '🔐 Permissions', value: member.permissions.has('Administrator') ? '✅ Administrator' : 'Limited', inline: true }
        );
        
        if (member.nickname) {
          embed.addFields({ name: '🏷️ Nickname', value: member.nickname, inline: true });
        }
      }
      
      await msg.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error showing user info:', error.message);
      await msg.reply('❌ Error occurred while getting user information.');
    }
  }
}

module.exports = UserInfoCommand;