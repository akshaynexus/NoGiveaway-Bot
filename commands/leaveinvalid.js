const BaseCommand = require('./BaseCommand');
const Discord = require('discord.js');

class LeaveInvalidCommand extends BaseCommand {
  constructor() {
    super(
      'leaveinvalid',
      'Leave servers without required permissions',
      '!leaveinvalid',
      ['ADMIN']
    );
  }

  async execute(msg, args, client, utils) {
    try {
      const guilds = client.guilds.cache;
      const invalidServers = [];
      
      // Check each server for required permissions
      for (const guild of guilds.values()) {
        try {
          const botMember = guild.members.cache.get(client.user.id);
          
          if (!botMember) {
            invalidServers.push({
              guild,
              reason: 'Bot not found in server',
              canLeave: false
            });
            continue;
          }
          
          const permissions = botMember.permissions;
          const hasAdmin = permissions.has('Administrator');
          const hasBan = permissions.has('BanMembers');
          
          // Server is invalid if it doesn't have ban permissions
          if (!hasAdmin && !hasBan) {
            invalidServers.push({
              guild,
              reason: 'No ban permissions',
              canLeave: true
            });
          }
          
          // Also check for very small servers that might be spam
          if (guild.memberCount < 5 && !hasAdmin) {
            invalidServers.push({
              guild,
              reason: 'Small server without admin permissions',
              canLeave: true
            });
          }
          
        } catch (error) {
          invalidServers.push({
            guild,
            reason: `Error checking permissions: ${error.message}`,
            canLeave: false
          });
        }
      }
      
      if (invalidServers.length === 0) {
        await msg.reply('✅ No invalid servers found! All servers have proper permissions.');
        return;
      }
      
      const leaveableServers = invalidServers.filter(s => s.canLeave);
      
      const serverList = invalidServers.slice(0, 15).map(server => 
        `**${server.guild.name}** (${server.guild.memberCount} members)\n└ ${server.canLeave ? '🚪' : '⚠️'} ${server.reason}\n└ ID: ${server.guild.id}`
      ).join('\n\n');
      
      const embed = new Discord.EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('🚪 Invalid Servers Detected')
        .setDescription(`Found ${invalidServers.length} servers with issues`)
        .addFields(
          { name: '📊 Summary', value: `**Total Issues:** ${invalidServers.length}\n**Can Leave:** ${leaveableServers.length}\n**Require Manual Review:** ${invalidServers.length - leaveableServers.length}`, inline: true },
          { name: '🔍 Server List', value: serverList, inline: false }
        )
        .setTimestamp();
      
      if (leaveableServers.length > 0) {
        embed.addFields({
          name: '⚠️ Confirmation Required',
          value: `React with ✅ to leave **${leaveableServers.length}** invalid servers\nReact with ❌ to cancel this operation`,
          inline: false
        });
      }
      
      if (invalidServers.length > 15) {
        embed.setFooter({ text: `Showing first 15 of ${invalidServers.length} invalid servers` });
      }
      
      const sentMsg = await msg.reply({ embeds: [embed] });
      
      if (leaveableServers.length > 0) {
        // Add reactions
        await sentMsg.react('✅');
        await sentMsg.react('❌');
        
        // Create reaction collector
        const filter = (reaction, user) => {
          return ['✅', '❌'].includes(reaction.emoji.name) && user.id === msg.author.id;
        };
        
        const collector = sentMsg.createReactionCollector({ filter, time: 30000, max: 1 });
        
        collector.on('collect', async (reaction) => {
          if (reaction.emoji.name === '✅') {
            // Leave invalid servers
            const embed = new Discord.EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle('🚪 Leaving Invalid Servers...')
              .setDescription('Processing server departures...')
              .setTimestamp();
            
            await sentMsg.edit({ embeds: [embed] });
            
            let leftCount = 0;
            let errorCount = 0;
            
            for (const server of leaveableServers) {
              try {
                await server.guild.leave();
                console.log(`🚪 Left invalid server: ${server.guild.name}`);
                leftCount++;
              } catch (error) {
                console.error(`❌ Failed to leave ${server.guild.name}:`, error.message);
                errorCount++;
              }
            }
            
            const finalEmbed = new Discord.EmbedBuilder()
              .setColor(leftCount > 0 ? 0x2ecc71 : 0xe74c3c)
              .setTitle('✅ Server Cleanup Complete')
              .setDescription(`Successfully left ${leftCount} invalid servers`)
              .addFields(
                { name: '📊 Results', value: `**Left Successfully:** ${leftCount}\n**Errors:** ${errorCount}\n**Total Processed:** ${leaveableServers.length}`, inline: true }
              )
              .setTimestamp();
            
            await sentMsg.edit({ embeds: [finalEmbed] });
          } else {
            const cancelEmbed = new Discord.EmbedBuilder()
              .setColor(0x95a5a6)
              .setTitle('❌ Operation Cancelled')
              .setDescription('No servers were left.')
              .setTimestamp();
            
            await sentMsg.edit({ embeds: [cancelEmbed] });
          }
        });
        
        collector.on('end', async (collected) => {
          if (collected.size === 0) {
            const timeoutEmbed = new Discord.EmbedBuilder()
              .setColor(0x95a5a6)
              .setTitle('⏱️ Operation Timed Out')
              .setDescription('No response received within 30 seconds.')
              .setTimestamp();
            
            await sentMsg.edit({ embeds: [timeoutEmbed] });
          }
        });
      }
      
    } catch (error) {
      console.error('Error in leave invalid servers:', error.message);
      await msg.reply('❌ Error occurred while checking invalid servers.');
    }
  }
}

module.exports = LeaveInvalidCommand;