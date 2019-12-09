const Discord = require('discord.js');
const client = new Discord.Client();
var list;
var blacklistedmatches = 0;
var bancount = 0;
//Blacklisted avatars
var blacklistedavatars = [
"253c85fb6f0dd090a13283f0931cbc21.png?size=2048",
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
//whitelist the real giveaway bot and nogiveaway bot
var whitelistedids = [294882584201003009,653578214685409301];
const modlogChannelID = '495726949818433556';
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity(`Protecting ${client.guilds.size} servers from giveaway spam`);
    //TODO get guild from msg instead
    list = client.guilds.get("setidhere");
});
client.on("guildCreate", guild => {
    // This event triggers when the bot joins a guild.
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    client.user.setActivity(`Protecting ${client.guilds.size} servers from giveaway spam`);
});
var blacklistedids = [];
client.on('message', msg => {
    if (!msg.guild) return;

    if (msg.content === 'ping') {
        msg.reply('pong');
    }
    if(msg.content === 'buildblacklist'){
        getGiveawayUsers();
        msg.reply("Built Blacklist");
    }
    if(msg.content === 'getblacklistcount'){
        msg.reply( blacklistedmatches);
    }
    if(msg.content === 'banBlacklisted'){
        banBlacklisted(msg);
    }
});
client.login('yourtokenhere');
async function getGiveawayUsers() {
    if (list != undefined)
        list.members.forEach(member => {
            //Check if user has giveaway,ownerbit or magic in username and isnt in whitelist
            if (member.user.username.toLowerCase().includes("giveaway")  && member.user.id !=whitelistedids[0]  && member.user.id !=whitelistedids[1] || member.user.username.toLowerCase().includes("ownerbit") && (member.user.username != "NoGiveaway" || member.user.username != "GiveawayBot" || member.user.username == "MAGIC")){
                console.log(member.user.username);
                blacklistedmatches = blacklistedids.push(member.user.id);
            }
            else{
                //Some may use a different name,then fall back to profile picture checker
            checkForBlacklistAvatar(member.user.id)
            }
        });
}
function checkForBlacklistAvatar(userid) {
    client.fetchUser(userid).then(myUser => {
        blacklistedavatars.forEach(function (item) {
            if( myUser.avatarURL != null && myUser.avatarURL.includes(item.toString())){
                // console.log("Detected blacklisted avatar: " + userid);
                console.log("Adding blacklisted userid :" + userid);
                blacklistedmatches = blacklistedids.push(userid);
                console.log("Final count :" + blacklistedmatches)
            }
          });
});
}
async function banBlacklisted(msg){
    if(bancount == blacklistedmatches.length) {
        msg.reply('Banned ' + bancount + ' Spammers');
        const banConfirmationEmbedModlog = new Discord.RichEmbed()
        .setAuthor(`Banned Spammers by **${msg.author.username}#${msg.author.discriminator}**`, msg.author.displayAvatarURL)
        .setColor('RED')
        .setTimestamp()
        .setDescription(`**Action**: Ban
        **Bancount**: ${bancount}
        **Reason**: SpamBot`);
        client.channels.get(modlogChannelID).send({
        embed: banConfirmationEmbedModlog
        }); // Sends the RichEmbed in the modlogchannel
    }
    else{
        blacklistedids.forEach(function (item) {
            const member = msg.guild.member(item);
            if (member) {
                /**
                 * Ban the member
                 * Make sure you run this on a member, not a user!
                 * There are big differences between a user and a member
                 * Read more about what ban options there are over at
                 * https://discord.js.org/#/docs/main/master/class/GuildMember?scrollTo=ban
                 */
                member.ban({
                  reason: 'SpamBot',
                }).then(() => {
                  // We let the message author know we were able to ban the person
                  bancount++;
                  console.log("Banned sucessfully :" + bancount)
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
        });
    }
}



