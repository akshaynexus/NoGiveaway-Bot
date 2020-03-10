function getMember(client,serverid,userid){
    var listx = client.guilds.get(serverid);
    if (listx != undefined){
        return client.fetchUser(userid);
    }
    return null;
}

 function banBlacklisted(msg,memberx,bancount,blacklistedids) {
     var i = 0;
    if(msg != null){
    while(!(bancount == blacklistedids.length) && blacklistedids.length != 0){
        if(banUser(msg,msg.guild.member(blacklistedids[i]),false,bancount))
            i++;
        else
            return false;
    }
    sendBanReport(msg)
    }
    else{
        banUser(msg,memberx,false,bancount);
    }
}

function sendBanReport(client,msg){
    if(msg != null){
        const banConfirmationEmbedModlog = new Discord.MessageEmbed()
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

function banUser(msg,member,fLibraSpam = false,bancount){
    if (member) {
        member.ban({
            reason: fLibraSpam ? 'LibraSpam':'SpamBot',days:7
        }).then(() => {
            // We let the message author know we were able to ban the person
            ++bancount;
            console.log("Banned sucessfully : " + bancount + " Username " + member.user.username)
            return true;
        }).catch(err => {
            // An error happened
            // This is generally due to the bot not being able to ban the member,
            // either due to missing permissions or role hierarchy
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
        return false;

    }
}

module.exports = {
    getMember,
    sendBanReport,
    banUser,
    banBlacklisted
}
