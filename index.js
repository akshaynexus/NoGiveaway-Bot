const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json')

var list;
var blacklistedmatches = 0;
var bancount = 0;
//Blacklisted avatars
const blacklistedavatars = config.blacklistedavatars;
//whitelist the real giveaway bot and nogiveaway bot
const whitelistedids = config.whitelistedids;
var extrablacklist = config.blacklistedidsextra;
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity(`Protecting ${client.guilds.size} servers from giveaway spam`);
});
client.on("guildCreate", guild => {
    // This event triggers when the bot joins a guild.
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    client.user.setActivity(`Protecting ${client.guilds.size} servers from giveaway spam`);
});
var blacklistedids = [];
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
        banBlacklisted(msg);
    } else if (msg.content === 'banextra') {
        banBlacklisted(msg, true);
    }
});
client.login(config.token);
async function buildBlacklist(msg) {
    if (blacklistedids.length > 0 || bancount > 0) {
        //reset fields,just incase as we only support one server for now per instance
        blacklistedids = [];
        bancount = 0
    }
    list = msg.guild;
    if (list != undefined)
    //Fetch members,using fetchmemebers are users are normally greater than 250 on crypto servers
    list.fetchMembers().then(code => {
         code.members.forEach(member=>{
            //Check if user has giveaway,ownerbit or magic in username and isnt in whitelist
            if (member.user.username.toLowerCase().includes("giveaway") &&
                member.user.id != whitelistedids[0] &&
                member.user.id != whitelistedids[1] ||
                member.user.username.toLowerCase().includes("ownerbit") &&
                (member.user.username != "NoGiveaway" || member.user.username != "GiveawayBot" || member.user.username == "MAGIC")) {
                console.log("Adding blacklisted userid :" + member.user.id);
                blacklistedmatches = blacklistedids.push(member.user.id);
            } else {
                //Some may use a different name,then fall back to profile picture checker
                checkForBlacklistedAvatar(member.user)
            }
        });
    });
}

function checkForBlacklistedAvatar(user) {
    blacklistedavatars.forEach(function(item) {
        if (user.avatar != null && user.avatar.includes(item.toString())) {
            console.log("Adding blacklisted userid :" + userid);
            blacklistedmatches = blacklistedids.push(userid);
        }
    });
}
async function banBlacklisted(msg, fBanExtra) {
    if (bancount == blacklistedmatches) {
        const banConfirmationEmbedModlog = new Discord.RichEmbed()
            .setAuthor(`Banned Spammers by **${msg.author.username}#${msg.author.discriminator}**`, msg.author.displayAvatarURL)
            .setColor('RED')
            .setTimestamp()
            .setDescription(`**Action**: Ban
        **Bancount**: ${bancount}
        **Reason**: SpamBot`);
        client.channels.get(msg.channel.id).send({
            embed: banConfirmationEmbedModlog
        }); // Sends the RichEmbed in the modlogchannel
    } else if (fBanExtra) {
        const member = msg.guild.member(extrablacklist);
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
                ++bancount;
                console.log("Banned sucessfully :" + bancount)
                if (bancount == blacklistedmatches) {
                    const banConfirmationEmbedModlog = new Discord.RichEmbed()
                        .setAuthor(`Banned Spammers by **${msg.author.username}#${msg.author.discriminator}**`, msg.author.displayAvatarURL)
                        .setColor('RED')
                        .setTimestamp()
                        .setDescription(`**Action**: Ban
                    **Bancount**: ${bancount}
                    **Reason**: SpamBot`);
                    client.channels.get(msg.channel.id).send({
                        embed: banConfirmationEmbedModlog
                    }); // Sends the RichEmbed in the modlogchannel
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
    } else {
        blacklistedids.forEach(function(item) {
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
                    ++bancount;
                    console.log("Banned sucessfully :" + bancount)
                    if (bancount == blacklistedmatches) {
                        const banConfirmationEmbedModlog = new Discord.RichEmbed()
                            .setAuthor(`Banned Spammers by **${msg.author.username}#${msg.author.discriminator}**`, msg.author.displayAvatarURL)
                            .setColor('RED')
                            .setTimestamp()
                            .setDescription(`**Action**: Ban
                        **Bancount**: ${bancount}
                        **Reason**: SpamBot`);
                        client.channels.get(msg.channel.id).send({
                            embed: banConfirmationEmbedModlog
                        }); // Sends the RichEmbed in the modlogchannel
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
        });
    }
}