const config = require('../config.json')
var blacklistedidsconf = config.blacklistedids;
var blacklistedavatars = config.blacklistedavatars;


function isBlacklistedAvatar(avatar){
    for(var i=0;i<blacklistedavatars.length;i++){
        if (avatar != null && avatar.includes(blacklistedavatars[i].toString())) {
            return true;
       }
    }
   return false;
}

function isFakeBitmex(username){
    return (username.includes("BitMex") || username.includes("Bitmex")) 
}

function isBanQueueFinished(bancount,blacklistedcount){
    return bancount == blacklistedcount;
}

function CheckBLBotImper(user,isBot = false){
    var toreturnbool = false;

    if(user != undefined  && !isBot &&(
        (user.toLowerCase().includes("update") && !user.toLowerCase().includes("updates"))||
        (user.toLowerCase().includes("bot") && (user.toLowerCase().includes("update") ||user.toLowerCase().includes("news")))||
        user.toLowerCase().includes("вот") ||
        user.toLowerCase().includes("воt") ||
        user.toLowerCase().includes("updаtеwаllеtвоt")
        )){
        toreturnbool = true;
    }
    else{
        toreturnbool = false;

    }
    if(!toreturnbool){
        try{
            user = decodeURI(user).toString();
            toreturnbool = user != undefined  && !isBot &&(
                (user.toLowerCase().includes("update") && !user.toLowerCase().includes("updates"))||
                (user.toLowerCase().includes("bot") && (user.toLowerCase().includes("update") ||user.toLowerCase().includes("news")))||
                user.toLowerCase().includes("вот") ||
                user.toLowerCase().includes("воt") ||
                user.toLowerCase().includes("updаtеwаllеtвоt")
                )
        }
        catch(e){
            // console.log(e)
            return false
        }
    }
    return toreturnbool;
}
function isLibraSpamDecode(msg){
    var Returnval = false;
    try{
    msg = decodeURI(msg)
    if ( msg.toLowerCase().includes("https://imgur.com/lu79bwq") 
     || msg.toLowerCase().includes("getlⅰbra.cc") 
     || msg.toLowerCase().includes("hey just saw this tweet: https://imgur.com/")
     || msg.toLowerCase().includes("https://imgur.com/H8MZuke")
     || msg.toLowerCase().includes("librasecure.net")
     || msg.toLowerCase().includes("ⅼⅰbrasecure.net")
     || msg.toLowerCase().includes("for the ones who are interested in facebooks libra coin, it just got released")
     || msg.toLowerCase().includes("and the tweet https://imgur.com")
     || msg.toLowerCase().includes("imgur.ⅽom/zHnd8eh")
     || msg.toLowerCase().includes("for the ones who are interested in facebooks ⅼⅰbra currency, it just got released, means you can buy some cheap at the moment"))
     Returnval = true;
    }
    catch(e){
        return false;
    }
    return Returnval;
}
function isLibraSpam(msg){
    var Returnval = false;
    if ( msg.toLowerCase().includes("https://imgur.com/lu79bwq") 
     || msg.toLowerCase().includes("getlⅰbra.cc") 
     || msg.toLowerCase().includes("hey just saw this tweet: https://imgur.com/")
     || msg.toLowerCase().includes("https://imgur.com/H8MZuke")
     || msg.toLowerCase().includes("librasecure.net")
     || msg.toLowerCase().includes("ⅼⅰbrasecure.net")
     || msg.toLowerCase().includes("for the ones who are interested in facebooks libra coin, it just got released")
     || msg.toLowerCase().includes("and the tweet https://imgur.com")
     || msg.toLowerCase().includes("imgur.ⅽom/zHnd8eh")
     || msg.toLowerCase().includes("for the ones who are interested in facebooks ⅼⅰbra currency, it just got released, means you can buy some cheap at the moment"))
     Returnval = true;

     if(!Returnval){
        Returnval = isLibraSpamDecode(msg)
     }
     return Returnval;
}

function checkIfIDIsBlacklised(userid){
    for(var g=0;g<blacklistedidsconf.length;g++){
        if(userid.toString() == blacklistedidsconf[g].toString())
           return true;
    }
    return false;
}

function hasBlacklistedUsername(username,isBot){
    var toReturn = isFakeBitmex(username) && !isBot;
    if(!toReturn)
        for(var i=0;i<config.blacklistednames.length;i++){
        toReturn = username.toLowerCase().includes(config.blacklistednames[i]) && !isBot;
        if(config.blacklistednames[i] == "magic"){
            toReturn =  username.toLowerCase() == config.blacklistednames[i] && !isBot;
        }
        if(toReturn)
            return toReturn;
    }
    return toReturn;
}

 //Check if username matches blacklist array
function CheckBLMatch(username,useravatar=null ,isBot=false,userid=0){
    return hasBlacklistedUsername(username,isBot) || CheckBLBotImper(username,isBot) ||isBlacklistedAvatar(useravatar) || checkIfIDIsBlacklised(userid);
}
 //Check if username matches blacklist array
 function CheckBLMatchMember(member){
     const username = member.user.username
     const isBot = member.user.bot
     const useravatar = member.user.avatar
     const userid = member.user.id
    return hasBlacklistedUsername(username,isBot) || CheckBLBotImper(username,isBot) ||isBlacklistedAvatar(useravatar) || checkIfIDIsBlacklised(userid);
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
    isBanQueueFinished
  }