//Import needed libraries and files
const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json')
//Global vars,will be removed once db integration is complete
var list;
var blacklistedmatches = 0;
var bancount = 0;
var blacklistedids = [];

//Blacklisted avatars
const blacklistedavatars = config.blacklistedavatars;
//whitelist the real giveaway bot and nogiveaway bot
const whitelistedids = config.whitelistedids;
var blacklistedidsconf = config.blacklisedids;

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
    // Do nothing if the channel wasn't found on this server
    if (!channel) return;
    //check if user joined has a blacklisted avatar hash
    checkForBlacklistedAvatarandBan(member)
    // Send the message, mentioning the member
    channel.send(`Welcome to the server, ${member}`);
  });

client.on('message', msg => {
    //Check if there is a guild in message,dont go further if its a dm.
    if (!msg.guild) return;

    if (msg.content === 'ping') {
        msg.reply('pong');
    } else if (msg.content === 'buildblacklist') {
        buildBlacklist(msg);
        msg.reply("Built Blacklist");
    } else if (msg.content === 'getblacklistcount') {
        msg.reply(blacklistedmatches);
    } else if (msg.content === 'banBlacklisted') {
        banBlacklisted(msg,null);
    }

});
//Login to discord with token
client.login(config.token);

//Check if username matches blacklist array
function checkforBlacklistedUsernameContentOrID(member){
    config.blacklistednames.forEach(item =>{
        var isBlacklisted = member.user.username.toLowerCase().includes(item.toString()) && member.user.id != whitelistedids[0] && member.user.id != whitelistedids[1];
        if(item.toString() == "magic"){
            isBlacklisted =  member.user.username.toLowerCase() == item.toString() && member.user.id != whitelistedids[0] && member.user.id != whitelistedids[1]
        }
        if(isBlacklisted){
            console.log("Adding blacklisted userid :" + member.user.id);
            blacklistedmatches = blacklistedids.push(member.user.id);
        }
        else{
            //Check if avatar matches blacklist
            checkForBlacklistedAvatar(member.user);
        }
    });
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
                checkforBlacklistedUsernameContentOrID(member);
            });
        });
    }
}
function addGuildtoDB(guildid){
    //Write db code here

}

function checkIfIDIsBlacklised(user){
    blacklistedidsconf.forEach(function(item){
        if(user.id == item)
           return true;
    });
}
function checkForBlacklistedAvatar(user) {
    blacklistedavatars.forEach(function(item) {
        if (user.avatar != null && user.avatar.includes(item.toString())) {
            console.log("Adding blacklisted userid :" + user.id);
            blacklistedmatches = blacklistedids.push(user.id);
        }
    });
}

function checkForBlacklistedAvatarandBan(user) {
    blacklistedavatars.forEach(function(item) {
        if (user.user.avatar != null && user.user.avatar.includes(item.toString())) {
            console.log("Adding blacklisted userid :" + user.id);
            blacklistedmatches = blacklistedids.push(user.user.id);
            banBlacklisted(null,user)
        }
    });
}

async function banBlacklisted(msg,memberx) {
    if(msg != null){
        blacklistedids.forEach(function(item) {
            banUser(msg,msg.guild.member(item))
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
            console.log("Banned sucessfully :" + bancount + "Username " + member.user.username)
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
            msg.reply('I was unable to ban the member');
            // Log the error
            console.error(err);
        });
    } else {
        // The mentioned user isn't in this guild
        msg.reply('That user isn\'t in this guild!');
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
    //TODO add log channel configurtion commnd to code.

}

//Reset global vars
function clearVars(){
    blacklistedids = [];
    bancount = 0;
    blacklistedmatches = 0;
}