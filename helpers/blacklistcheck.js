const config = require("../config.json");
const BLConsts = require("./constants/blacklistconsts");
var blacklistedidsconf = config.blacklistedids;
var blacklistedavatars = config.blacklistedavatars;

function isBlacklistedAvatar(avatar) {
  return avatar != null && blacklistedavatars.includes(avatar.toString());
}

function isFakeBitmex(username) {
  return (
    (username.includes("BitMex") || username.includes("Bitmex")) &&
    !username.includes("Trader")
  );
}

function isBanQueueFinished(bancount, blacklistedcount) {
  return bancount == blacklistedcount;
}

function containsStringInarray(arr, str) {
  return new RegExp(arr.join("|")).test(str);
}

function CheckBLBotImper(user, isBot = false, fCheck = true) {
  var toreturnbool =
    user != undefined &&
    !isBot &&
    containsStringInarray(BLConsts.BotImper, user.toLowerCase()) &&
    !containsStringInarray(BLConsts.NotBotImper, user.toLowerCase());

  if (!toreturnbool && fCheck) {
    try {
      user = decodeURIComponent(user);
      toreturnbool = CheckBLBotImper(user, isBot, false);
    } catch (e) {
      console.error(e);
      return false;
    }
  }
  return toreturnbool;
}

function isLibraSpamDecode(msg) {
  var Returnval = false;
  try {
    msg = decodeURI(msg);
    Returnval = isLibraSpam(msg, false);
  } catch (e) {
    return false;
  }
  return Returnval;
}

function isNewCoinspam(msg) {
  return containsStringInarray(BLConsts.NewCoinSpam, msg.toLowerCase());
}

function isLibraSpam(msg, fCheck = true) {
  var Returnval = containsStringInarray(
    BLConsts.LibraDetects,
    msg.toLowerCase()
  );
  if (!Returnval && fCheck) {
    Returnval = isLibraSpamDecode(msg);
  }
  return Returnval;
}

function checkIfIDIsBlacklised(userid) {
  return blacklistedidsconf.includes(userid);
}

function hasBlacklistedUsername(username, isBot) {
  return (
    (isFakeBitmex(username) ||
      containsStringInarray(config.blacklistednames, username.toLowerCase())) &&
    !isBot
  );
}

function checkIfUserIsNew(timestamp, avatar) {
  //Check if user is less than 4d old
  return Date.now() - timestamp <= 2.16e7;
}

//Check if username matches blacklist array
function CheckBLMatch(username, useravatar = null, isBot = false, userid = 0) {
  return (
    hasBlacklistedUsername(username, isBot) ||
    CheckBLBotImper(username, isBot) ||
    isBlacklistedAvatar(useravatar) ||
    checkIfIDIsBlacklised(userid)
  );
}
//Check if username matches blacklist array
function CheckBLMatchMember(member) {
  const username = member.user.username;
  const isBot = member.user.bot;
  var useravatar = member.user.avatar;
  const userid = member.user.id;
  return (
    isBlacklistedAvatar(useravatar) ||
    hasBlacklistedUsername(username, isBot) ||
    CheckBLBotImper(username, isBot) ||
    checkIfIDIsBlacklised(userid) ||
    checkIfUserIsNew(member.user.createdTimestamp, useravatar)
  );
}
module.exports = {
  isBlacklistedAvatar,
  isFakeBitmex,
  CheckBLBotImper,
  isLibraSpam,
  checkIfIDIsBlacklised,
  blacklistedavatars,
  blacklistedidsconf,
  CheckBLMatch,
  CheckBLMatchMember,
  checkIfUserIsNew,
  isBanQueueFinished,
  isNewCoinspam,
};
