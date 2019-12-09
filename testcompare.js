const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json')

var list;
var blacklistedmatches = 0;
var bancount = 0;
//Blacklisted avatars
const blacklistedavatars = config.blacklistedavatars;
const modlogChannelID = config.modchanelid;
//whitelist the real giveaway bot and nogiveaway bot
var whitelistedids = config.whitelistedids;
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity(`Protecting ${client.guilds.size} servers from giveaway spam`);
    list = client.guilds.get(config.defaultguildid);
    checkForBlacklistAvatar();
});
client.login(config.token);


function checkForBlacklistAvatar() {
    client.fetchUser("653514334198300672").then(myUser => {
        blacklistedavatars.forEach(function (item,index) {
            console.log(myUser.avatarURL);
            if( myUser.avatarURL != null && myUser.avatarURL.includes(item.toString())){
            console.log("Detected blacklisted at index " +  index)
            }
        });
});
}