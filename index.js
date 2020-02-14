//Import needed libraries and files
const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json')
var util = require('util');
const fs = require('fs');
const mongoose = require('mongoose');
const configjson = require('./config.json')

// Models.
const Config = require('./models/config');
const ServerJoin = require('./models/serverjoin');
const BlacklistIDModel = require('./models/blacklistidmodel');
//Global vars,will be removed once db integration is complete
var list;
var blacklistedmatches = 0;
var bancount = 0;
var blacklistedids = [];
var blacklistedavatarsxxx = [];

//Blacklisted avatars
const blacklistedavatars = config.blacklistedavatars;
//whitelist the real giveaway bot and nogiveaway bot
const whitelistedids = config.whitelistedids;
var blacklistedidsconf = config.blacklistedids;

//debug.log log code
var logFile = fs.createWriteStream('debug.log', { flags: 'a' });
  // Or 'w' to truncate the file every time the process starts.
var logStdout = process.stdout;

console.log = function () {
  logFile.write(util.format.apply(null, arguments) + '\n');
  logStdout.write(util.format.apply(null, arguments) + '\n');
}
//Database code
mongoose.connect('mongodb://' + config.db.user + ':' + config.db.pass + '@' +'localhost/nogiveaway', function (err) {

    if (err) throw err;
    // //Save config and blacklist stuff to db
    // const configtosave = new Config({
    //     _id: new mongoose.Types.ObjectId(),
    //     blacklistedavatars : configjson.blacklistedavatars,
    //     blacklistedids: configjson.blacklistedids,
    //     token:configjson.token,
    //     blacklistednames : configjson.blacklistednames,
    //     whitelistedids : configjson.whitelistedids,
    // })
    // configtosave.save();
    //Login to discord with token
client.login(config.token);    
}, {useNewUrlParser: true});
//Executes when connected successfully after login with token
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity(`Protecting ${client.guilds.size} servers from giveaway spam`);
});

// This event triggers when the bot joins a guild.
client.on("guildCreate", guild => {
    // This event triggers when the bot joins a guild.
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    //Add guild to db,needs changes
    addGuildtoDB(guild.id);
    client.user.setActivity(`Protecting ${client.guilds.size} servers from giveaway spam`);
});

// Create an event listener for new guild members
client.on('guildMemberAdd', member => {
    // Send the message to a designated channel on a server:
    const channel = member.guild.channels.find(ch => ch.name === 'member-log');
    AddJoinToCollection(member);
    CheckBLExtra(member,true);
    if (!channel){
        console.log(`Welcome to the server Name: ${member.guild.name} Server ID: ${member.guild.id},Owner: ${member.guild.ownerID} UserID :${member} Username: ${member.user.username}#${member.user.discriminator} Username of owner: ${member.guild.owner.user.username}#${member.guild.owner.user.discriminator} Timestamp ${member.user.createdTimestamp}  `);
    }
    else{
        channel.send(`Welcome to the server, ${member}`);
    }
});

client.on('message', msg => {
    //Check if there is a guild in message,dont go further if its a dm.
    if (!msg.guild) return;
    if (msg.content === 'ping') {
        msg.reply('pong');
    } else if (msg.content === 'buildblacklist') {
        buildBlacklist(msg);
    } else if (msg.content === 'getblacklistcount') {
        saveblacklist();
        msg.reply(blacklistedids.length);
    } 
    else if (msg.content === 'banBlacklisted') {
        banBlacklisted(msg,null);
    }
    else if (msg.content === 'clearList') {
        clearVars();
        msg.reply(blacklistedids.length);

    }
    else if (msg.content === 'cleanupServers'){
        cleanupServers(msg);
    }
    else if (msg.content === 'detectNewAvatarduplicates'){
        detectnewBots();
    }

});
function detectnewBots(){
    // find each person with a last name matching 'Ghost', selecting the `name` and `occupation` fields
    ServerJoin.find({}, function (err, join) {
    if (err) return handleError(err);
    // Prints "Space Ghost is a talk show host".
    // join.forEach(item =>{
        
    // });
  });
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

function saveblacklist(){
    fs.writeFile("output.json", JSON.stringify(blacklistedids), 'utf8', function (err) {
        if (err) {
            console.log("An error occured while writing JSON Object to File.");
            return console.log(err);
        }
        console.log("JSON file has been saved.");
    });
}

function saveblacklist(){
    fs.writeFile("output.json", JSON.stringify(blacklistedids), 'utf8', function (err) {
        if (err) {
            console.log("An error occured while writing JSON Object to File.");
            return console.log(err);
        }
        console.log("JSON file has been saved.");
    });
}

//Check if username matches blacklist array
function CheckBLMatch(member,fBanImmediate){
    var isBlacklisted;
    config.blacklistednames.forEach(item =>{
        isBlacklisted = member.user.username.toLowerCase().includes(item.toString()) && member.user.id.toString() != whitelistedids[0] && member.user.id != whitelistedids[1];
        if(item.toString() == "magic"){
            isBlacklisted =  member.user.username.toLowerCase() == item.toString() && member.user.id.toString() != whitelistedids[0] && member.user.id != whitelistedids[1]
        }
    });
    if(isBlacklisted){
        console.log("Adding blacklisted userid :" + member.user.id+ " Username: " + member.user.username);
        blacklistedmatches = blacklistedids.push(member.user.id);
        if(fBanImmediate){
            banBlacklisted(null,member)
        }
    }
    else{
        //Check avatar
        CheckBLExtra(member,fBanImmediate);
    }
}

//Builds blacklist array
async function buildBlacklist(msg) {
    if (blacklistedids.length > 0 || bancount > 0 || blacklistedmatches > 0) {
        //reset fields,just incase as we only support one server for now per instance
        clearVars();
    }
    //Get guild from msg invoking this command
    list = msg.guild;
    if (list != undefined){
       //Fetch members,using fetchmemebers are users are normally greater than 250 on crypto servers
       list.fetchMembers().then(code => {
            code.members.forEach(member=>{
                //Check if user has giveaway,ownerbit or magic in username and isnt in whitelist
                CheckBLMatch(member,false);
            });
        });
        msg.reply("Built Blacklist");

    }
}

async function cleanupServers(msg){
    
    client.guilds.keyArray().forEach(function (item,index) {
    //Get guild from msg invoking this command
    list = client.guilds.get(item.toString());
    if (list != undefined){
        console.log( "cleaning up Server : "+ list.name + "Index number :" + index);
        //Fetch members,using fetchmemebers are users are normally greater than 250 on crypto servers
        list.fetchMembers().then(code => {
            code.members.forEach(member=>{
                //Check if user has giveaway,ownerbit or magic in username and isnt in whitelist
                CheckBLMatch(member,true);
            });
        });
        }
    });
}
function addGuildtoDB(guildid){
    //Write db code here

}

function checkIfIDIsBlacklised(user){
    blacklistedidsconf.forEach(function(item,index){
        if(user.id.toString() == item.toString())
           return true;
    });
}


function CheckBLExtra(member,fBanImmediate) {
    if((new Date().getTime() - member.user.createdTimestamp < 4.32e+8)&& false){
        console.log("Adding blacklisted userid :" + member.user.id+ " Username: " + member.user.username);
        blacklistedmatches = blacklistedids.push(member.user.id);  
    }
    else if (checkIfIDIsBlacklised(member.user)){
        console.log("Adding blacklisted userid :" + member.user.id);
        blacklistedmatches = blacklistedids.push(member.user.id);
        if(fBanImmediate)
            banBlacklisted(null,member)
    }
    else{
        blacklistedavatars.forEach(function(item) {
             if (member.user.avatar != null && member.user.avatar.includes(item.toString())) {
                console.log("Adding blacklisted userid :" + member.user.id);
                blacklistedmatches = blacklistedids.push(member.user.id);
                if(fBanImmediate)
                    banBlacklisted(null,member)
                
            }
        });
    }
}

async function banBlacklisted(msg,memberx) {
    if(msg != null){
        // for(var i=0;i<=blacklistedids.length;i++){
        //     if(banUser(msg,msg.guild.member(blacklistedids[i])))

        //     else{
        //         return false;
        //     }
        // }
        blacklistedids.forEach(async function(item) {
            await banUser(msg,msg.guild.member(item))
        });
    }
    else{
        banUser(msg,memberx)
    }
}

function banUser(msg,member){
    if (member) {
        member.ban({
            reason: 'SpamBot',
        }).then(() => {
            // We let the message author know we were able to ban the person
            ++bancount;
            console.log("Banned sucessfully : " + bancount + " Username " + member.user.username)
            if (bancount == blacklistedmatches) {
               // Sends the RichEmbed in the modlogchannel
                sendBanReport(msg)
                //Clear all count after banning list,TODO Add db based counts for each guild isntead
                clearVars();
            }
        }).catch(err => {
            // An error happened
            // This is generally due to the bot not being able to ban the member,
            // either due to missing permissions or role hierarchy
            clearVars();
            if(msg){
            msg.reply('I was unable to ban the member due to error: ' + err.message + " To ban,Please check and add ban permission to the bot");
            }
            // Log the error
            console.error(err);
            return false;

        });
    } else {
        // The mentioned user isn't in this guild
        console.log('That user isn\'t in this guild!');
    }
}

function sendBanReport(msg){
    if(msg != null){
        const banConfirmationEmbedModlog = new Discord.RichEmbed()
        .setAuthor(`Banned Spammers by **${msg.author.username}#${msg.author.discriminator}**`, msg.author.displayAvatarURL)
        .setColor('RED')
        .setTimestamp()
        .setDescription(`
        **Action**: Ban
        **Bancount**: ${bancount}
        **Reason**: SpamBot`);
        client.channels.get(msg.channel.id).send({
            embed: banConfirmationEmbedModlog
         });
    }
    else
    {
        console.log("Ban task finished with total count: " + bancount)
    }
    //TODO add log channel configurtion commnd to code.
}

//Reset global vars
function clearVars(){
    //Save blacklist to db before clearing
    var blacklistobj = new BlacklistIDModel({
        _id: new mongoose.Types.ObjectId(),
        userid: blacklistedids
    })
    blacklistobj.save();
    blacklistedids = [];
    bancount = 0;
    blacklistedmatches = 0;
}