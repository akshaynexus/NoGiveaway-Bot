
const ServerJoin = require('../models/serverjoin');
const mongoose = require('mongoose');
const BlacklistIDModel = require('../models/blacklistidmodel');
const TgMsg = require('../models/tgmsg');

function saveBlacklistedIDS(ids){
    //Save blacklist to db before clearing
    var blacklistobj = new BlacklistIDModel({
        _id: new mongoose.Types.ObjectId(),
        userid: ids
    });
    blacklistobj.save();
}
// mongoose.set('debug', true);

function AddJoinToCollection(member){
    var avtstring = member.user.avatar != null ? member.user.avatar : "null";
    var serverjoinobj = new ServerJoin({
        _id: new mongoose.Types.ObjectId(),
        username : member.user.username+ "#"+ member.user.discriminator,
        userid: member.user.id,
        usertimestamp:member.user.createdTimestamp,
        avatar:avtstring,
        avatarurl : avtstring != "null" ? member.user.avatarURL() : avtstring,
        servername:member.guild.name,
        serverid:member.guild.id,
    })
    serverjoinobj.save();
}

function saveTgMsg(msg){
    var tgmsgobj = new TgMsg({
        _id: new mongoose.Types.ObjectId(),
        message : msg,
    })
    tgmsgobj.save();
}

async function findGuild(userid){
    await ServerJoin.findOne({userid: userid} , function(err, data){
        if(err){
          console.log(err);
          return;
        };
        if(data.length == 0) {
            return null;
        }
        return data;
      });
}

module.exports = {
    AddJoinToCollection,
    findGuild,
    saveBlacklistedIDS,
    mongoose,
    saveTgMsg
}
