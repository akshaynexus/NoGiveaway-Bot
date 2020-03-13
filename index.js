//Import needed libraries and files
const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json')
var util = require('util');
const fs = require('fs');
const DatabaseUtil = require('./helpers/dbhelper');
const DiscordUtil = require('./helpers/discordhelper');
const BlacklistUtil = require('./helpers/blacklistcheck');
var bancount = 0;
var blacklistedids = [];
const prefix = '!'
//debug.log log code
var logFile = fs.createWriteStream('debug.log', { flags: 'a' });

  // Or 'w' to truncate the file every time the process starts.
var logStdout = process.stdout;

console.log = function () {
  logFile.write(util.format.apply(null, arguments) + '\n');
  logStdout.write(util.format.apply(null, arguments) + '\n');
}
//Database code

DatabaseUtil.mongoose.connect('mongodb://' + config.db.user + ':' + config.db.pass + '@' +'localhost/nogiveaway', {useNewUrlParser: true,useUnifiedTopology: true}, function (err) {
    if (err) throw err;
    client.login(config.token);    
    client.setMaxListeners(1000);
});

//Executes when connected successfully after login with token
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity(`Protecting servers from giveaway spam`);
});
// This event triggers when the bot joins a guild.
client.on("guildCreate", guild => {
    // This event triggers when the bot joins a guild.
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    client.user.setActivity(`Protecting servers from giveaway spam`);
});

// Create an event listener for new guild members
client.on('guildMemberAdd', member => {
    DatabaseUtil.AddJoinToCollection(member);
    console.log(`Welcome to the server Name: ${member.guild.name} Server ID: ${member.guild.id},UserID :${member} Username: ${member.user.username}#${member.user.discriminator} Join timestamp ${member.user.createdTimestamp}  `);
    if(BlacklistUtil.CheckBLMatch(member.user.username,member.user.avatar,member.user.bot,member.user.id))
        DiscordUtil.banUser(null,member,false);
});

client.on('message', msg => {
    //Check if there is a guild in message,dont go further if its a dm.
    if (!msg.guild) return;
    if(msg.content.toLocaleLowerCase().includes("t.me")){
        DatabaseUtil.saveTgMsg(msg.content);
    }
    if (msg.content === prefix + 'buildblacklist') {
        buildBlacklist(msg);
    } else if (msg.content === prefix + 'getblacklistcount') {
        msg.reply(blacklistedids.length);
    }
    else if (msg.content === prefix +'banBlacklisted') {
        if(blacklistedids.length >0)
            DiscordUtil.banBlacklisted(msg,null,bancount,blacklistedids);
    }
    else if (msg.content === prefix +'clearList') {
        clearVars();
        msg.reply(blacklistedids.length);
    }
    else if (BlacklistUtil.isLibraSpam(msg.content)){
        DiscordUtil.banUser(null,msg.guild.member(msg.author.id),true);
    }
    else if (msg.content === prefix +'cleanupServers'){
        cleanupServers();
    }

});
client.on('userUpdate', (oldUser,newUser) => {
    //Check if there is a guild in message,dont go further if its a dm
    if(oldUser.username != newUser.username)
        console.log("User ID: "  + newUser.id + " changed username from " + oldUser.username + " to " + newUser.username);
    if(BlacklistUtil.CheckBLBotImper(newUser.username,newUser.bot)){
        const servid = DatabaseUtil.findGuild(newUser.id);
        const memtoban = DiscordUtil.getMember(client,servid,newUser.id);
        if(memtoban != null){
            DiscordUtil.banUser(null,memtoban,false);
       }
    }
});

//Builds blacklist array
async function buildBlacklist(msg) {
    if (blacklistedids.length > 0 || bancount > 0) {
        //reset fields,just incase as we only support one server for now per instance
        clearVars();
    }
    //Get guild from msg invoking this command
    var list = msg.guild;
    if (list != undefined){
       //Fetch members,using fetchmemebers are users are normally greater than 250 on crypto servers
       list.members.fetch().then(code => {
        for(var j=0;j<code.size;j++){
            //Check if member matched blacklist
            if(BlacklistUtil.CheckBLMatchMember(code.array()[j])){
                console.log("Found blacklisted user " + code.array()[j].user.username)
                //push id to blacklistedids for data retrival
                blacklistedids.push(code.array()[j].user.id)
            }
        }
    });
        msg.reply("Built Blacklist");

    }
}

function cleanupServers(){
    for(var i=0;i<client.guilds.cache.keyArray().length;i++){
    //Get guild from msg invoking this command
    var list = client.guilds.cache.get(client.guilds.cache.keyArray()[i].toString());
    if (list != undefined){
        console.log( "cleaning up Server : "+ list.name + " Index number : " + i);
        list.members.fetch().then(code => {
            for(var j=0;j<code.size;j++){
                //Check if member matched blacklist
                if(BlacklistUtil.CheckBLMatchMember(code.array()[j])){
                    console.log("Found blacklisted user " + code.array()[j].user.username)
                    //push id to blacklistedids for data retrival
                    blacklistedids.push(code.array()[j].user.id)
                    //TODO find why this gives a cleanupservers failed even though it bans the detected user sucessfully
                    if(DiscordUtil.banUser(null,code.array()[j],false)){
                         //Increment bancount and log ban data
                        ++bancount;
                        console.log("Total Ban count " + bancount + "\n" + "Remaining : " + blacklistedids.length - bancount + "\n" );
                        if(BlacklistUtil.isBanQueueFinished(bancount,blacklistedids.length)){
                            clearVars();
                            return true;
                        }
                        else{continue;}

                    }
                    else{
                        // console.log("Cleanupservers failed\n")
                        // return false;
                    }
                }
            }
        });
    }
}
}

//Reset global vars
function clearVars(){
    DatabaseUtil.saveBlacklistedIDS(blacklistedids);
    blacklistedids = [];
    bancount = 0;
}