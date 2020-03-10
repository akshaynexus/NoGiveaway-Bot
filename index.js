//Import needed libraries and files
const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json')
var util = require('util');
const fs = require('fs');
const DatabaseUtil = require('./helpers/dbhelper');
const DiscordUtil = require('./helpers/discordhelper');
const BlacklistUtil = require('./helpers/blacklistcheck');
//Global vars,will be removed once db integration is complete
var list;
var bancount = 0;
var blacklistedids = [];

//debug.log log code
var logFile = fs.createWriteStream('debug.log', { flags: 'a' });
  // Or 'w' to truncate the file every time the process starts.
var logStdout = process.stdout;

console.log = function () {
  logFile.write(util.format.apply(null, arguments) + '\n');
  logStdout.write(util.format.apply(null, arguments) + '\n');
}
//Database code
DatabaseUtil.mongoose.connect('mongodb://' + config.db.user + ':' + config.db.pass + '@' +'localhost/nogiveaway', {useNewUrlParser: true}, function (err) {
    if (err) throw err;
    client.login(config.token);    
});
client.setMaxListeners(1000);
//Executes when connected successfully after login with token
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity(`Protecting ${client.guilds.size} servers from giveaway spam`);
});

// This event triggers when the bot joins a guild.
client.on("guildCreate", guild => {
    // This event triggers when the bot joins a guild.
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    client.user.setActivity(`Protecting ${client.guilds.size} servers from giveaway spam`);
});

// Create an event listener for new guild members
client.on('guildMemberAdd', member => {
    // Send the message to a designated channel on a server:
    const channel = member.guild.channels.find(ch => ch.name === 'member-log');
    DatabaseUtil.AddJoinToCollection(member);
    if (!channel){
        console.log(`Welcome to the server Name: ${member.guild.name} Server ID: ${member.guild.id},UserID :${member} Username: ${member.user.username}#${member.user.discriminator} Join timestamp ${member.user.createdTimestamp}  `);
    }
    else{
        channel.send(`Welcome to the server, ${member}`);
    }
    if(BlacklistUtil.CheckBLMatch(member.user.username,member.user.avatar,member.user.bot,member.user.id))
        DiscordUtil.banUser(null,member,false,bancount);
});

client.on('message', msg => {
    //Check if there is a guild in message,dont go further if its a dm.
    if (!msg.guild) return;
    if (msg.content === 'buildblacklist') {
        buildBlacklist(msg);
    } else if (msg.content === 'getblacklistcount') {
        msg.reply(blacklistedids.length);
    }
    else if (msg.content === 'banBlacklisted') {
        if(blacklistedids.length >0)
            DiscordUtil.banBlacklisted(msg,null,bancount,blacklistedids);
    }
    else if (msg.content === 'clearList') {
        clearVars();
        msg.reply(blacklistedids.length);
    }
    else if (BlacklistUtil.isLibraSpam(msg.content)){
        DiscordUtil.banuser(null,msg.guild.member(msg.author.id),true,bancount);
    }
    else if (msg.content === 'cleanupServers'){
        cleanupServers();
    }

});
client.on('userUpdate', (oldUser,newUser) => {
    //Check if there is a guild in message,dont go further if its a dm.
    console.log("User ID: "  + newUser.id + " changed username from " + oldUser.username + " to " + newUser.username);
    if(BlacklistUtil.CheckBLBotImper(newUser.username,newUser.bot)){
        const servid = DatabaseUtil.findGuild(newUser.id);
        const memtoban = DiscordUtil.getMember(client,servid,newUser.id);
        if(memtoban != null){
            DiscordUtil.banUser(null,memtoban,false,bancount);
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
    list = msg.guild;
    if (list != undefined){
       //Fetch members,using fetchmemebers are users are normally greater than 250 on crypto servers
       list.fetchMembers().then(code => {
        for(var j=0;j<code.memberCount;j++){
            if(BlacklistUtil.CheckBLMatchMember(code.members.array()[j])){
                console.log("Found blacklisted user " + code.members.array()[j].user.username)
                blacklistedids.push(code.members.array()[j].user.id)            
            }
        }
    });
        msg.reply("Built Blacklist");

    }
}

function cleanupServers(){
    for(var i=0;i<client.guilds.keyArray().length;i++){
    //Get guild from msg invoking this command
    list = client.guilds.get(client.guilds.keyArray()[i].toString());
    if (list != undefined){
        console.log( "cleaning up Server : "+ list.name + " Index number : " + i);
        list.fetchMembers().then(code => {
            for(var j=0;j<code.memberCount;j++){
                if(BlacklistUtil.CheckBLMatchMember(code.members.array()[j])){
                    console.log("Found blacklisted user " + code.members.array()[j].user.username)
                    blacklistedids.push(code.members.array()[j].user.id)            
                    if(!DiscordUtil.banUser(null,code.members.array()[j],false,bancount)){
                        console.log("Cleanupservers failed\n")
                        return false;
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