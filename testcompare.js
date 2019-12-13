const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json')

var list;
var blacklistedmatches = 0;
var bancount = 0;
var userlist = [];
//Blacklisted avatars
const blacklistedavatars = config.blacklistedavatars;
const modlogChannelID = config.modchanelid;
//whitelist the real giveaway bot and nogiveaway bot
var whitelistedids = config.whitelistedids;
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity(`Protecting ${client.guilds.size} servers from giveaway spam`);
    list = client.guilds.get("455359252010237971");
    checkForBlacklistAvatar();
});
client.login(config.token);


function checkForBlacklistAvatar() {
    client.fetchUser("654876386493857802").then(myUser => {
        blacklistedavatars.forEach(function (item,index) {
            console.log(myUser.avatar);
            if( myUser.avatar != null && myUser.avatar.includes(item.toString())){
            console.log("Detected blacklisted at index " +  index)
            }
        });
});
}
async function buildBlacklist() {
    if (list != undefined)
        list.fetchMembers().then(code => {
            code.members.forEach(member=>{
            //     blacklistedavatars.forEach(function (item,index) {
                if (member.user.username != null ) {
                    // console.log("Detected blacklisted at index " +  index)
                    bancount++
                    console.log(member.user.username)
            }
            // });
         })

})
}
