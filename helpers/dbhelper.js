
const ServerJoin = require('../models/serverjoin');
const mongoose = require('mongoose');
const config = require('../config.json')
const BlacklistIDModel = require('../models/blacklistidmodel');

function connectDB(){
//Database code
 mongoose.connect('mongodb://' + config.db.user + ':' + config.db.pass + '@' +'localhost/nogiveaway', function (err) {
         if (err){
                return false   
            } 
    return true;

});
}

function saveBlacklistedIDS(ids){
    //Save blacklist to db before clearing
    var blacklistobj = new BlacklistIDModel({
        _id: new mongoose.Types.ObjectId(),
        userid: ids
    });
    blacklistobj.save();
}

function AddJoinToCollection(member){
    var avtstring = member.user.avatar != null ? member.user.avatar : "null";
    var serverjoinobj = new ServerJoin({
        _id: new mongoose.Types.ObjectId(),
        username : member.user.username+ "#"+ member.user.discriminator,
        userid: member.user.id,
        usertimestamp:member.user.createdTimestamp,
        avatar:avtstring,
        avatarurl : avtstring != "null" ? member.user.avatarURL : avtstring,
        servername:member.guild.name,
        serverid:member.guild.id,
    })
    serverjoinobj.save();
}

async function findGuild(userid){
    await ServerJoin.find({userid: userid} , function(err, data){
        if(err){
          console.log(err);
        };
        if(data.length == 0) {
            return null;
        }
        return data[0].serverid;
      });
}

module.exports = {
    AddJoinToCollection,
    findGuild,
    connectDB,
    saveBlacklistedIDS,
    mongoose
}
