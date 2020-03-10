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
    buildBlacklist();
    // console.log(client.guilds.keyArray().toString());
    // cleanupServers();
});
client.login(config.token);


function checkForBlacklistAvatar() {
    client.fetchUser("680884223699320851").then(myUser => {
        console.log(myUser.avatarURL)
        console.log(myUser.avatar)
        blacklistedavatars.forEach(function (item,index) {
        if(myUser.avatar != null && myUser.avatar.includes(item.toString())){
            console.log(myUser.avatar);
            console.log("Detected blacklisted at index " +  index)
            }
        });
});
}
async function cleanupServers(){
    client.guilds.keyArray().forEach(function (item,index) {
            //Get guild from msg invoking this command
    list = client.guilds.get(item.toString());
    console.log(list.name + "indexno " + index)

    if(index == 12){
        const role = list.roles.find("name", "NoGiveaway");
        console.log(list.roles[1])
        console.log(list.channels.forEach(function (item,index) {
            // if(item.type == "text" && item.permissionsFor(role).has("SEND_MESSAGES"))
            // console.log(item.name)
            
        }))

    }


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
