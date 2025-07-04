//Import needed libraries and files
const Discord = require("discord.js");
const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMembers,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent,
    Discord.GatewayIntentBits.GuildPresences
  ]
});
const config = require("./config.json");
var util = require("util");
const fs = require("fs");
const DatabaseUtil = require("./helpers/dbhelper");
const DiscordUtil = require("./helpers/discordhelper");
const BlacklistUtil = require("./helpers/blacklistcheck");
const ApiHelper = require("./helpers/apihelper");
var bancount = 0;
var blacklistedids = [];
const prefix = "!";
//debug.log log code
var logFile = fs.createWriteStream("debug.log", { flags: "a" });

// Or 'w' to truncate the file every time the process starts.
var logStdout = process.stdout;

console.log = function () {
  logFile.write(util.format.apply(null, arguments) + "\n");
  logStdout.write(util.format.apply(null, arguments) + "\n");
};
//Database code

DatabaseUtil.mongoose.connect(
  "mongodb+srv://" +
    config.db.user +
    ":" +
    config.db.pass +
    "@" +
    config.db.host +
    // ":" +
    // config.db.port +
    "/" +
    config.db.name
).then(() => {
    client.login(config.token);
    client.setMaxListeners(1000);
}).catch((err) => {
    throw err;
});

//Executes when connected successfully after login with token
client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  console.log(`🏠 Bot is in ${client.guilds.cache.size} servers:`);
  client.guilds.cache.forEach(guild => {
    console.log(`  - ${guild.name} (${guild.id}) - ${guild.memberCount} members`);
  });
  console.log(`🔧 Intents configured:`, client.options.intents);
  console.log(`⚡ Waiting for messages...`);
  
  // Check permissions in all servers
  console.log(`🔍 Checking permissions across all servers:`);
  let serversWithIssues = [];
  
  client.guilds.cache.forEach(guild => {
    const botMember = guild.members.cache.get(client.user.id);
    if (botMember) {
      const hasViewChannel = botMember.permissions.has('ViewChannel');
      const hasReadHistory = botMember.permissions.has('ReadMessageHistory');
      const hasSendMessages = botMember.permissions.has('SendMessages');
      
      if (!hasViewChannel || !hasReadHistory || !hasSendMessages) {
        serversWithIssues.push({
          name: guild.name,
          id: guild.id,
          viewChannel: hasViewChannel,
          readHistory: hasReadHistory,
          sendMessages: hasSendMessages
        });
      }
    } else {
      serversWithIssues.push({
        name: guild.name,
        id: guild.id,
        issue: 'Bot member not found in cache'
      });
    }
  });
  
  if (serversWithIssues.length > 0) {
    console.log(`❌ Found ${serversWithIssues.length} servers with permission issues:`);
    serversWithIssues.forEach(server => {
      if (server.issue) {
        console.log(`  - ${server.name}: ${server.issue}`);
      } else {
        console.log(`  - ${server.name}: View(${server.viewChannel}) Read(${server.readHistory}) Send(${server.sendMessages})`);
      }
    });
  } else {
    console.log(`✅ All servers have proper permissions!`);
  }
  ApiHelper.startServer();
  client.user.setActivity(`Protecting servers from giveaway spam`);
});

// This event triggers when the bot joins a guild.
client.on("guildCreate", (guild) => {
  // This event triggers when the bot joins a guild.
  console.log(
    `New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`
  );
  client.user.setActivity(`Protecting servers from giveaway spam`);
});

// Create an event listener for new guild members
client.on("guildMemberAdd", (member) => {
  DatabaseUtil.AddJoinToCollection(member);
  console.log(
    `Welcome to the server Name: ${member.guild.name} Server ID: ${member.guild.id},UserID :${member} Username: ${member.user.username}#${member.user.discriminator} Join timestamp ${member.user.createdTimestamp}  `
  );
  if (BlacklistUtil.CheckBLMatchMember(member))
    DiscordUtil.banUser(null, member, false);
});

client.on("messageCreate", (msg) => {
  //Check if there is a guild in message,dont go further if its a dm.
  if (!msg.guild) return;
  
  // Skip bot messages
  if (msg.author.bot) return;
  
  // Nice console log for message flow
  console.log(`📨 [${msg.guild.name}] ${msg.author.username}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
  if (msg.content.toLocaleLowerCase().includes("t.me")) {
    DatabaseUtil.saveTgMsg(msg.content);
  }
  if (msg.content === prefix + "buildblacklist") {
    buildBlacklist(msg);
  } else if (msg.content === prefix + "getblacklistcount") {
    msg.reply(blacklistedids.length);
  } else if (msg.content === prefix + "banBlacklisted") {
    if (blacklistedids.length > 0)
      DiscordUtil.banBlacklisted(msg, null, bancount, blacklistedids);
  } else if (msg.content === prefix + "clearList") {
    clearVars();
    msg.reply(blacklistedids.length);
  } else if (BlacklistUtil.isLibraSpam(msg.content)) {
    DiscordUtil.banUser(null, msg.guild.members.cache.get(msg.author.id), true);
  } else if (BlacklistUtil.isNewCoinspam(msg.content)) {
    DiscordUtil.banUser(null, msg.guild.members.cache.get(msg.author.id), false);
  } else if (msg.content === prefix + "cleanupServers") {
    cleanupServers();
  }
});
client.on("userUpdate", (oldUser, newUser) => {
  //Check if there is a guild in message,dont go further if its a dm
  if (oldUser.username != newUser.username)
    console.log(
      "User ID: " +
        newUser.id +
        " changed username from " +
        oldUser.username +
        " to " +
        newUser.username
    );
  if (BlacklistUtil.CheckBLBotImper(newUser.username, newUser.bot)) {
    const servid = DatabaseUtil.findGuild(newUser.id);
    const memtoban = DiscordUtil.getMember(client, servid, newUser.id);
    if (memtoban != null) {
      DiscordUtil.banUser(null, memtoban, false);
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
  var list = msg.guild;
  if (list != undefined) {
    //Fetch members,using fetchmemebers are users are normally greater than 250 on crypto servers
    list.members.fetch().then((code) => {
      for (var j = 0; j < code.size; j++) {
        //Check if member matched blacklist
        if (BlacklistUtil.CheckBLMatchMember(Array.from(code.values())[j])) {
          console.log(
            "Found blacklisted user " + Array.from(code.values())[j].user.username
          );
          //push id to blacklistedids for data retrival
          blacklistedids.push(Array.from(code.values())[j].user.id);
        }
      }
    });
    msg.reply("Built Blacklist");
  }
}

function cleanupServers() {
  for (var i = 0; i < Array.from(client.guilds.cache.keys()).length; i++) {
    //Get guild from msg invoking this command
    var list = client.guilds.cache.get(
      Array.from(client.guilds.cache.keys())[i].toString()
    );
    if (
      list != undefined &&
      Array.from(client.guilds.cache.keys())[i].toString() != "264445053596991498" &&
      Array.from(client.guilds.cache.keys())[i].toString() != "689639729981030446"
    ) {
      console.log("cleaning up Server : " + list.name + " Index number : " + i);
      list.members.fetch().then((code) => {
        for (var j = 0; j < code.size; j++) {
          //Check if member matched blacklist
          // if(Array.from(code.values())[j].user.id == 683803084157222920){
          //     console.log(Array.from(code.values())[j].user.avatar)
          //     return true;
          //
          if (BlacklistUtil.CheckBLMatchMember(Array.from(code.values())[j])) {
            console.log(
              "Found blacklisted user " + Array.from(code.values())[j].user.username
            );
            //push id to blacklistedids for data retrival
            blacklistedids.push(Array.from(code.values())[j].user.id);
            //TODO find why this gives a cleanupservers failed even though it bans the detected user sucessfully
            if (DiscordUtil.banUser(null, Array.from(code.values())[j], false)) {
              //Increment bancount and log ban data
              ++bancount;
              console.log(
                "Total Ban count " +
                  bancount +
                  "\n" +
                  "Remaining : " +
                  blacklistedids.length -
                  bancount +
                  "\n"
              );
              if (
                BlacklistUtil.isBanQueueFinished(
                  bancount,
                  blacklistedids.length
                )
              ) {
                clearVars();
                return true;
              } else {
                continue;
              }
            } else {
              // console.log("Cleanupservers failed\n")
              // return false;
            }
          }
        }
      });
    }
  }
}
//Reset global vars
function clearVars() {
  DatabaseUtil.saveBlacklistedIDS(blacklistedids);
  blacklistedids = [];
  bancount = 0;
}
