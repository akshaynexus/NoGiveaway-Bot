const { EmbedBuilder } = require('discord.js');

// Improved member fetching with error handling
async function getMember(client, serverId, userId) {
  try {
    const guild = client.guilds.cache.get(serverId);
    if (!guild) {
      console.error(`Guild not found: ${serverId}`);
      return null;
    }
    
    return await guild.members.fetch(userId);
  } catch (error) {
    console.error(`Error fetching member ${userId} from guild ${serverId}:`, error.message);
    return null;
  }
}

// Improved mass banning with rate limiting and better error handling
async function banBlacklisted(msg, memberToBan, banCount, blacklistedIds) {
  try {
    if (msg) {
      // Mass ban from command
      let successCount = 0;
      let failCount = 0;
      
      console.log(`🔨 Starting mass ban of ${blacklistedIds.length} users`);
      
      for (let i = 0; i < blacklistedIds.length; i++) {
        const member = msg.guild.members.cache.get(blacklistedIds[i]);
        if (member) {
          const success = await banUser(msg, member, false);
          if (success) {
            successCount++;
          } else {
            failCount++;
          }
          
          // Rate limiting: wait 1 second between bans to avoid API limits
          if (i < blacklistedIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } else {
          failCount++;
        }
      }
      
      await sendBanReport(msg, successCount, failCount);
      console.log(`✅ Mass ban completed: ${successCount} successful, ${failCount} failed`);
      
    } else if (memberToBan) {
      // Single ban
      await banUser(null, memberToBan, false);
    }
    
  } catch (error) {
    console.error('Error in mass ban operation:', error.message);
    if (msg) {
      await msg.reply('❌ An error occurred during the ban operation.');
    }
  }
}

// Improved ban reporting with better formatting
async function sendBanReport(msg, successCount = 0, failCount = 0) {
  try {
    if (msg) {
      const totalAttempted = successCount + failCount;
      const embed = new EmbedBuilder()
        .setAuthor({
          name: `Ban Operation by ${msg.author.username}`,
          iconURL: msg.author.displayAvatarURL()
        })
        .setColor(successCount > 0 ? 'Green' : 'Red')
        .setTimestamp()
        .setDescription(
          `**Action**: Mass Ban\n` +
          `**Total Attempted**: ${totalAttempted}\n` +
          `**Successful**: ${successCount}\n` +
          `**Failed**: ${failCount}\n` +
          `**Success Rate**: ${totalAttempted > 0 ? Math.round((successCount / totalAttempted) * 100) : 0}%\n` +
          `**Reason**: SpamBot Detection`
        )
        .setFooter({ text: 'NoGiveaway Bot - Anti-Spam Protection' });
      
      await msg.channel.send({ embeds: [embed] });
    } else {
      console.log(`✅ Ban operation completed: ${successCount} successful, ${failCount} failed`);
    }
  } catch (error) {
    console.error('Error sending ban report:', error.message);
  }
}

// Enhanced ban function with proper async/await and better error handling
async function banUser(msg, member, isLibraSpam = false) {
  if (!member) {
    console.log('⚠️ Cannot ban: Member not found in guild');
    return false;
  }
  
  try {
    // Check if we can ban this user (role hierarchy)
    const botMember = member.guild.members.cache.get(member.client.user.id);
    if (botMember && member.roles.highest.position >= botMember.roles.highest.position) {
      console.log(`⚠️ Cannot ban ${member.user.username}: Role hierarchy prevents ban`);
      if (msg) {
        await msg.reply(`❌ Cannot ban ${member.user.username}: Their role is higher than or equal to mine.`);
      }
      return false;
    }
    
    // Attempt the ban
    const reason = isLibraSpam ? 'LibraSpam Detection' : 'SpamBot Detection';
    await member.ban({
      reason: reason,
      deleteMessageSeconds: 604800, // 7 days in seconds
    });
    
    console.log(`✅ Successfully banned: ${member.user.username} (${member.user.id}) - Reason: ${reason}`);
    return true;
    
  } catch (error) {
    const errorMsg = `Failed to ban ${member.user.username}: ${error.message}`;
    console.error('❌', errorMsg);
    
    if (msg) {
      if (error.code === 50013) {
        await msg.reply('❌ Missing permissions to ban this user. Please check bot permissions.');
      } else if (error.code === 50035) {
        await msg.reply('❌ Invalid form body. The user might have already been banned.');
      } else {
        await msg.reply(`❌ Unable to ban user: ${error.message}`);
      }
    }
    
    return false;
  }
}

module.exports = {
  getMember,
  sendBanReport,
  banUser,
  banBlacklisted,
};
