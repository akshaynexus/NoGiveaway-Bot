const config = require('../config.json');
const BLConsts = require('./constants/blacklistconsts');

// Cache configuration values for better performance
const blacklistedIdsConf = config.blacklistedids || [];
const blacklistedAvatars = config.blacklistedavatars || [];
const blacklistedNames = config.blacklistednames || [];

// Constants for user age checking
const NEW_USER_THRESHOLD_MS = 2.16e7; // 25 days in milliseconds

// Check if avatar hash is blacklisted
function isBlacklistedAvatar(avatar) {
  if (!avatar) return false;
  return blacklistedAvatars.includes(avatar.toString());
}

// Detect fake BitMEX usernames
function isFakeBitmex(username) {
  if (!username) return false;
  const lowerUsername = username.toLowerCase();
  
  // Check for BitMEX impersonation patterns
  if (!lowerUsername.includes('bitmex')) return false;
  
  // Exclude legitimate BitMEX-related names
  const legitimatePatterns = ['trader', 'arthur'];
  return !legitimatePatterns.some(pattern => lowerUsername.includes(pattern));
}

// Check if ban queue processing is complete
function isBanQueueFinished(banCount, blacklistedCount) {
  // Only return true if there are blacklisted users and we've banned them all
  if (blacklistedCount === 0) return false;
  return banCount >= blacklistedCount;
}

// Improved string matching with error handling
function containsStringInArray(arr, str) {
  if (!arr || !Array.isArray(arr) || !str) return false;
  
  try {
    // Escape special regex characters in array elements
    const escapedArr = arr.map(item => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(escapedArr.join('|'), 'i');
    return regex.test(str);
  } catch (error) {
    console.error('Error in containsStringInArray:', error.message);
    return false;
  }
}

// Enhanced bot impersonation detection
function CheckBLBotImper(username, isBot = false, shouldDecode = true) {
  if (!username || isBot) return false;
  
  const lowerUsername = username.toLowerCase();
  
  // Check if username contains bot impersonation patterns
  const hasImpersonationPattern = containsStringInArray(BLConsts.BotImper, lowerUsername);
  const hasExemptPattern = containsStringInArray(BLConsts.NotBotImper, lowerUsername);
  
  let isImpersonating = hasImpersonationPattern && !hasExemptPattern;
  
  // Try URL decoding if initial check fails and decoding is enabled
  if (!isImpersonating && shouldDecode) {
    try {
      const decodedUsername = decodeURIComponent(username);
      if (decodedUsername !== username) {
        isImpersonating = CheckBLBotImper(decodedUsername, isBot, false);
      }
    } catch (error) {
      console.error('Error decoding username for bot impersonation check:', error.message);
    }
  }
  
  if (isImpersonating && process.env.NODE_ENV !== 'test') {
    console.log(`🚫 Bot impersonation detected: ${username}`);
  }
  
  return isImpersonating;
}

// Helper function for decoding Libra spam messages
function isLibraSpamDecoded(message) {
  try {
    const decodedMessage = decodeURI(message);
    return isLibraSpam(decodedMessage, false);
  } catch (error) {
    console.error('Error decoding message for Libra spam check:', error.message);
    return false;
  }
}

// Detect new coin spam patterns
function isNewCoinspam(message) {
  if (!message) return false;
  return containsStringInArray(BLConsts.NewCoinSpam, message.toLowerCase());
}

// Enhanced Libra spam detection
function isLibraSpam(message, shouldDecode = true) {
  if (!message) return false;
  
  // Check for Libra spam patterns
  let isSpam = containsStringInArray(BLConsts.LibraDetects, message.toLowerCase());
  
  // Try URL decoding if initial check fails
  if (!isSpam && shouldDecode) {
    isSpam = isLibraSpamDecoded(message);
  }
  
  if (isSpam && process.env.NODE_ENV !== 'test') {
    console.log(`🚫 Libra spam detected in message: ${message.substring(0, 50)}...`);
  }
  
  return isSpam;
}

// Check if user ID is in blacklist
function checkIfIDIsBlacklisted(userId) {
  if (!userId) return false;
  // Check both string and number formats since Discord IDs can be either
  return blacklistedIdsConf.includes(userId) || blacklistedIdsConf.includes(Number(userId));
}

// Check if username is blacklisted
function hasBlacklistedUsername(username, isBot) {
  if (!username || isBot) return false;
  
  const lowerUsername = username.toLowerCase();
  return (
    isFakeBitmex(username) ||
    containsStringInArray(blacklistedNames, lowerUsername)
  );
}

// Check if user account is new (within threshold)
function checkIfUserIsNew(createdTimestamp) {
  if (!createdTimestamp) return false;
  const accountAge = Date.now() - createdTimestamp;
  return accountAge <= NEW_USER_THRESHOLD_MS;
}

// Comprehensive blacklist check for user data
function CheckBLMatch(username, userAvatar = null, isBot = false, userId = '') {
  if (!username) return false;
  
  return (
    hasBlacklistedUsername(username, isBot) ||
    CheckBLBotImper(username, isBot) ||
    isBlacklistedAvatar(userAvatar) ||
    checkIfIDIsBlacklisted(userId)
  );
}
// Enhanced member blacklist checking with detailed logging
function CheckBLMatchMember(member) {
  if (!member || !member.user) {
    console.error('Invalid member object provided to CheckBLMatchMember');
    return false;
  }
  
  const { username, bot: isBot, avatar, id: userId, createdTimestamp } = member.user;
  
  // Track which checks trigger for better logging
  const checks = {
    blacklistedAvatar: isBlacklistedAvatar(avatar),
    blacklistedUsername: hasBlacklistedUsername(username, isBot),
    botImpersonation: CheckBLBotImper(username, isBot),
    blacklistedId: checkIfIDIsBlacklisted(userId),
    newUser: checkIfUserIsNew(createdTimestamp)
  };
  
  const isBlacklisted = Object.values(checks).some(Boolean);
  
  if (isBlacklisted) {
    const triggeredChecks = Object.entries(checks)
      .filter(([, value]) => value)
      .map(([key]) => key);
    
    if (process.env.NODE_ENV !== 'test') {
      console.log(
        `🚫 Blacklisted user detected: ${username} (${userId}) in ${member.guild.name} - ` +
        `Triggered checks: ${triggeredChecks.join(', ')}`
      );
    }
  }
  
  return isBlacklisted;
}
// Export all functions with consistent naming
module.exports = {
  isBlacklistedAvatar,
  isFakeBitmex,
  CheckBLBotImper,
  isLibraSpam,
  isNewCoinspam,
  checkIfIDIsBlacklisted,
  checkIfIDIsBlacklised: checkIfIDIsBlacklisted, // Legacy alias
  hasBlacklistedUsername,
  checkIfUserIsNew,
  CheckBLMatch,
  CheckBLMatchMember,
  isBanQueueFinished,
  containsStringInArray,
  
  // Configuration exports
  blacklistedavatars: blacklistedAvatars, // Legacy alias
  blacklistedidsconf: blacklistedIdsConf, // Legacy alias
  blacklistedAvatars,
  blacklistedIdsConf,
  blacklistedNames,
  NEW_USER_THRESHOLD_MS
};
