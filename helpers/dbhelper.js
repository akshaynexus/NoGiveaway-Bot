const ServerJoin = require('../models/serverjoin');
const mongoose = require('mongoose');
const BlacklistIDModel = require('../models/blacklistidmodel');
const TgMsg = require('../models/tgmsg');

// Database helper utilities with improved error handling

// Save blacklisted IDs to database with error handling
async function saveBlacklistedIDS(ids) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    console.log('💾 No blacklisted IDs to save');
    return;
  }
  
  try {
    const blacklistObj = new BlacklistIDModel({
      _id: new mongoose.Types.ObjectId(),
      userid: ids,
      timestamp: new Date(),
      count: ids.length
    });
    
    await blacklistObj.save();
    console.log(`💾 Successfully saved ${ids.length} blacklisted IDs to database`);
    
  } catch (error) {
    console.error('❌ Error saving blacklisted IDs:', error.message);
    throw error;
  }
}
// mongoose.set('debug', true);

// Enhanced member join logging with better error handling
async function AddJoinToCollection(member) {
  if (!member || !member.user || !member.guild) {
    console.error('❌ Invalid member object provided to AddJoinToCollection');
    return false;
  }
  
  try {
    const { user, guild } = member;
    const avatarHash = user.avatar || 'null';
    const avatarUrl = avatarHash !== 'null' ? user.avatarURL({ size: 256 }) : 'null';
    
    const serverJoinObj = new ServerJoin({
      _id: new mongoose.Types.ObjectId(),
      username: `${user.username}#${user.discriminator}`,
      userid: user.id,
      usertimestamp: user.createdTimestamp,
      joinTimestamp: Date.now(),
      avatar: avatarHash,
      avatarurl: avatarUrl,
      servername: guild.name,
      serverid: guild.id,
      isBot: user.bot || false
    });
    
    await serverJoinObj.save();
    console.log(`💾 Logged join: ${user.username} joined ${guild.name}`);
    return true;
    
  } catch (error) {
    console.error('❌ Error saving member join:', error.message);
    return false;
  }
}

// Save Telegram message links with enhanced data
async function saveTgMsg(message, context = {}) {
  if (!message || typeof message !== 'string') {
    console.error('❌ Invalid message provided to saveTgMsg');
    return false;
  }
  
  try {
    // Extract Telegram links from the message
    const tgLinkRegex = /(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/[a-zA-Z0-9_]+/gi;
    const tgLinks = message.match(tgLinkRegex) || [];
    
    const tgMsgObj = new TgMsg({
      _id: new mongoose.Types.ObjectId(),
      message: message,
      telegramLinks: tgLinks,
      timestamp: new Date(),
      source: {
        guildId: context.guildId || null,
        guildName: context.guildName || null,
        userId: context.userId || null,
        username: context.username || null
      },
      linkCount: tgLinks.length
    });
    
    await tgMsgObj.save();
    console.log(`💾 Saved Telegram message with ${tgLinks.length} links`);
    return true;
    
  } catch (error) {
    console.error('❌ Error saving Telegram message:', error.message);
    return false;
  }
}

// Find guild information for a user with modern async/await
async function findGuild(userId) {
  if (!userId) {
    console.error('❌ No user ID provided to findGuild');
    return null;
  }
  
  try {
    const userData = await ServerJoin.findOne(
      { userid: userId },
      'serverid servername joinTimestamp'
    ).sort({ joinTimestamp: -1 }); // Get most recent join
    
    if (!userData) {
      console.log(`📊 No guild data found for user: ${userId}`);
      return null;
    }
    
    console.log(`📊 Found guild data for user ${userId}: ${userData.servername}`);
    return userData.serverid;
    
  } catch (error) {
    console.error('❌ Error finding guild for user:', error.message);
    return null;
  }
}

// Additional database utility functions

// Get user join statistics
async function getUserJoinStats(userId) {
  try {
    const joins = await ServerJoin.find({ userid: userId }).sort({ joinTimestamp: -1 });
    return {
      totalJoins: joins.length,
      servers: joins.map(join => ({
        serverId: join.serverid,
        serverName: join.servername,
        joinTime: join.joinTimestamp
      })),
      firstSeen: joins.length > 0 ? joins[joins.length - 1].joinTimestamp : null,
      lastSeen: joins.length > 0 ? joins[0].joinTimestamp : null
    };
  } catch (error) {
    console.error('❌ Error getting user join stats:', error.message);
    return null;
  }
}

// Clean up old database entries
async function cleanupOldEntries(daysOld = 30) {
  try {
    const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
    
    const joinCleanup = await ServerJoin.deleteMany({
      joinTimestamp: { $lt: cutoffDate }
    });
    
    const tgCleanup = await TgMsg.deleteMany({
      timestamp: { $lt: cutoffDate }
    });
    
    console.log(`🧹 Cleanup completed: Removed ${joinCleanup.deletedCount} old joins and ${tgCleanup.deletedCount} old TG messages`);
    
    return {
      joinsRemoved: joinCleanup.deletedCount,
      tgMessagesRemoved: tgCleanup.deletedCount
    };
    
  } catch (error) {
    console.error('❌ Error during database cleanup:', error.message);
    return null;
  }
}

// Get database statistics
async function getDatabaseStats() {
  try {
    const [joinCount, blacklistCount, tgMsgCount] = await Promise.all([
      ServerJoin.countDocuments(),
      BlacklistIDModel.countDocuments(),
      TgMsg.countDocuments()
    ]);
    
    return {
      totalJoins: joinCount,
      totalBlacklists: blacklistCount,
      totalTgMessages: tgMsgCount,
      lastUpdated: new Date()
    };
    
  } catch (error) {
    console.error('❌ Error getting database stats:', error.message);
    return null;
  }
}

// Export all database functions
module.exports = {
  // Core functions
  AddJoinToCollection,
  findGuild,
  saveBlacklistedIDS,
  saveTgMsg,
  
  // Utility functions
  getUserJoinStats,
  cleanupOldEntries,
  getDatabaseStats,
  
  // Mongoose instance
  mongoose
};
