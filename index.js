const Discord = require('discord.js');
const client = new Discord.Client();
var list;
var blacklistedmatches = 0;
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    list = client.guilds.get("444222945397702658");
    getGiveawayUsers();
});

client.on('message', msg => {
    if (msg.content === 'ping') {
        msg.reply('pong');
    }
});
var blacklistedavatars = ["253c85fb6f0dd090a13283f0931cbc21.png?size=2048",
"58766651d855568a66cad92d84fb2380.png?size=2048",
"9b38a80facc875833c57dd7e80e692e1.png?size=2048",
"3d2e94f55e20531f755de03d30c860b1.png?size=2048",
"32202584a0cb2d2923fa3e4cfecd050e.png?size=2048",
"e5f0ed70aa01a89c3a674bac548cb69e.png?size=2048",
"8413b534ba025e053590f81b8113e15c.png?size=2048",
"a24223c62e6238f8f240533c7588cc52.png?size=2048",
"dfcc4e4f9ccdd290d645586bb49509da.png?size=2048",
"99dfc51eea4606776e369594a45804b3.png?size=2048",
"383a68d62656ac869c8efcc8566db98c.png?size=2048",
"103cd8d7b88204653f0a92cdd54ddb75.png?size=2048"
];
client.login('tokenhere');
async function getGiveawayUsers() {
    console.log("getting users in guild");
    if (list != undefined)
        list.members.forEach(member => {
            if (member.user.username.toLowerCase().includes("giveaway") && (member.user.username != "NoGiveaway" || member.user.username != "GiveawayBot")){
                console.log(member.user.username);
            }
            checkForBlacklistAvatar(member.user.id)
        });
        

}
function checkForBlacklistAvatar(userid) {
    client.fetchUser(userid).then(myUser => {
        blacklistedavatars.forEach(function (item) {
            if( myUser.avatarURL != null && myUser.avatarURL.includes(item.toString())){
                // console.log("Detected blacklisted avatar: " + userid);
                ++blacklistedmatches;
                console.log(blacklistedmatches)
            }
          });


});
}


