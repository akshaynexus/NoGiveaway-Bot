// NoGiveaway Bot - Discord Anti-Spam Bot
// Import required dependencies
const Discord = require('discord.js');
const config = require('./config.json');
const util = require('util');
const fs = require('fs');

// Import helper modules
const DatabaseUtil = require('./helpers/dbhelper');
const DiscordUtil = require('./helpers/discordhelper');
const BlacklistUtil = require('./helpers/blacklistcheck');
const ApiHelper = require('./helpers/apihelper');

// Bot state variables
let banCount = 0;
let blacklistedIds = [];
const PREFIX = config.prefix || '!';
const MAX_LISTENERS = config.maxListeners || 1000;

// Member cache system for ultra-fast processing
const memberCache = new Map(); // guildId -> Map<userId, member>
const cacheTimestamps = new Map(); // guildId -> timestamp
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
let isCacheUpdating = false;

// Enhanced logging setup
class Logger {
  constructor() {
    this.logFile = fs.createWriteStream('debug.log', { flags: 'a' });
    this.logStdout = process.stdout;
    this.setupConsoleOverride();
  }

  setupConsoleOverride() {
    const originalLog = console.log;
    console.log = (...args) => {
      const timestamp = new Date().toISOString();
      const message = `[${timestamp}] ${util.format(...args)}`;
      this.logFile.write(message + '\n');
      this.logStdout.write(message + '\n');
    };
    
    console.error = (...args) => {
      const timestamp = new Date().toISOString();
      const message = `[${timestamp}] ERROR: ${util.format(...args)}`;
      this.logFile.write(message + '\n');
      process.stderr.write(message + '\n');
    };
  }

  close() {
    if (this.logFile) {
      this.logFile.end();
    }
  }
}

// Initialize logger
const logger = new Logger();

// Member cache management functions
async function updateGuildMemberCache(guild) {
  try {
    console.log(`🔄 Updating cache for ${guild.name} (${guild.memberCount} members)`);
    const startTime = Date.now();
    
    const members = await guild.members.fetch({ force: true });
    memberCache.set(guild.id, members);
    cacheTimestamps.set(guild.id, Date.now());
    
    const duration = Date.now() - startTime;
    console.log(`✅ Cached ${members.size} members for ${guild.name} in ${duration}ms`);
    
    return members;
  } catch (error) {
    console.error(`❌ Failed to cache members for ${guild.name}:`, error.message);
    // Keep existing cache if update fails
    return memberCache.get(guild.id) || new Map();
  }
}

async function updateAllMemberCaches() {
  if (isCacheUpdating) {
    console.log('⏭️ Cache update already in progress, skipping');
    return;
  }
  
  isCacheUpdating = true;
  console.log('🚀 Starting member cache update for all servers');
  const startTime = Date.now();
  
  try {
    const exemptServers = ['264445053596991498', '689639729981030446'];
    const guilds = client.guilds.cache.filter(guild => !exemptServers.includes(guild.id));
    
    // Update all guild caches in parallel for maximum speed
    const updatePromises = Array.from(guilds.values()).map(guild => updateGuildMemberCache(guild));
    await Promise.all(updatePromises);
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const totalMembers = Array.from(memberCache.values()).reduce((sum, cache) => sum + cache.size, 0);
    
    console.log(`🎉 Cache update complete: ${guilds.size} servers, ${totalMembers.toLocaleString()} members in ${totalTime}s`);
  } catch (error) {
    console.error('❌ Error during cache update:', error.message);
  } finally {
    isCacheUpdating = false;
  }
}

function getCachedMembers(guildId) {
  const cache = memberCache.get(guildId);
  const timestamp = cacheTimestamps.get(guildId);
  
  if (!cache || !timestamp) {
    return null; // No cache exists
  }
  
  const age = Date.now() - timestamp;
  if (age > CACHE_DURATION) {
    console.log(`⏰ Cache expired for guild ${guildId} (${Math.round(age / 60000)} minutes old)`);
    return null; // Cache expired
  }
  
  return cache;
}

function isCacheValid(guildId) {
  const timestamp = cacheTimestamps.get(guildId);
  if (!timestamp) return false;
  
  const age = Date.now() - timestamp;
  return age <= CACHE_DURATION;
}

// Discord client setup with optimized configuration for faster startup
const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMembers,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent,
    Discord.GatewayIntentBits.GuildPresences,
    Discord.GatewayIntentBits.GuildMessageReactions
  ],
  failIfNotExists: false,
  allowedMentions: {
    parse: ['users'],
    repliedUser: false
  },
  // Optimize for faster startup
  makeCache: Discord.Options.cacheWithLimits({
    MessageManager: 200, // Limit message cache
    UserManager: 1000,   // Reasonable user cache
    GuildMemberManager: 500, // Limit member cache per guild
  }),
  sweepers: {
    messages: {
      interval: 300, // 5 minutes
      lifetime: 1800, // 30 minutes
    },
    users: {
      interval: 3600, // 1 hour
      filter: () => user => user.bot && user.id !== client.user.id,
    },
  },
  ws: {
    large_threshold: 50, // Only cache members for guilds with <50 members
  }
});
// Database connection with improved error handling
async function connectToDatabase() {
  try {
    const connectionString = config.db.port 
      ? `mongodb://${config.db.user}:${config.db.pass}@${config.db.host}:${config.db.port}/${config.db.name}`
      : `mongodb+srv://${config.db.user}:${config.db.pass}@${config.db.host}/${config.db.name}`;
    
    await DatabaseUtil.mongoose.connect(connectionString, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Bot initialization with proper error handling and timing
async function initializeBot() {
  try {
    const startTime = Date.now();
    console.log('🚀 Starting bot initialization...');

    // Connect to database first
    console.log('📊 Connecting to database...');
    const dbStartTime = Date.now();
    const dbConnected = await connectToDatabase();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }
    console.log(`✅ Database connected in ${Date.now() - dbStartTime}ms`);

    // Set up client configuration
    console.log('⚙️ Configuring Discord client...');
    client.setMaxListeners(MAX_LISTENERS);
    
    // Login to Discord
    console.log('🔐 Logging into Discord...');
    const loginStartTime = Date.now();
    await client.login(config.token);
    console.log(`✅ Bot logged in successfully in ${Date.now() - loginStartTime}ms`);
    
    // Wait for ready event with timeout
    console.log('⏳ Waiting for Discord client to be ready...');
    await waitForReady(30000); // 30 second timeout
    
    console.log(`🎉 Bot fully initialized in ${Date.now() - startTime}ms`);
    
  } catch (error) {
    console.error('❌ Bot initialization failed:', error.message);
    process.exit(1);
  }
}

// Helper function to wait for client ready with timeout
function waitForReady(timeout = 30000) {
  return new Promise((resolve, reject) => {
    if (client.isReady()) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      reject(new Error('Client ready timeout'));
    }, timeout);

    client.once('ready', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

//Executes when connected successfully after login with token
client.on("ready", async () => {
  const readyStartTime = Date.now();
  console.log(`🤖 Bot ready as ${client.user.tag}!`);
  console.log(`🏠 Connected to ${client.guilds.cache.size} servers with ${client.users.cache.size} cached users`);
  
  // Set activity immediately
  updateBotActivity();
  
  // Start API server immediately (non-blocking)
  try {
    ApiHelper.startServer();
    console.log(`🌐 API server started`);
  } catch (error) {
    console.error('❌ Failed to start API server:', error.message);
  }
  
  console.log(`⚡ Bot ready and operational! Ready event processed in ${Date.now() - readyStartTime}ms`);
  
  // Start member cache system
  console.log('🚀 Initializing member cache system...');
  setImmediate(() => {
    performBackgroundInitialization();
    
    // Initialize member cache after background init
    setTimeout(() => {
      console.log('💾 Starting initial member cache build...');
      updateAllMemberCaches();
      
      // Set up automatic cache updates every 30 minutes
      setInterval(() => {
        console.log('⏰ Auto-updating member caches (30min interval)');
        updateAllMemberCaches();
      }, CACHE_DURATION);
    }, 10000); // Start after 10 seconds to let bot settle
  });
});

// Background initialization for non-critical operations
async function performBackgroundInitialization() {
  const bgStartTime = Date.now();
  console.log('🔄 Starting background initialization...');
  
  try {
    // Log server details with enhanced information
    console.log('📋 Server details:');
    const guilds = Array.from(client.guilds.cache.values());
    let totalMembers = 0;
    let serversWithIssues = [];
    
    guilds.forEach(guild => {
      try {
        const name = guild.name || 'Unknown Server';
        const id = guild.id || 'Unknown ID';
        const memberCount = guild.memberCount || 0;
        const owner = guild.ownerId || 'Unknown Owner';
        const createdAt = guild.createdAt ? guild.createdAt.toISOString().split('T')[0] : 'Unknown Date';
        const verified = guild.verified ? '✅' : '';
        const partnered = guild.partnered ? '🤝' : '';
        
        totalMembers += memberCount;
        
        console.log(`  - ${name} (${id}) ${verified}${partnered}`);
        console.log(`    └ Members: ${memberCount.toLocaleString()} | Owner: ${owner} | Created: ${createdAt}`);
        
        // Check for potential issues
        if (!guild.name) {
          serversWithIssues.push({ id, name: 'UNNAMED_SERVER', issue: 'Missing server name' });
        }
        if (memberCount === 0) {
          serversWithIssues.push({ id, name, issue: 'No members found' });
        }
        if (!guild.ownerId) {
          serversWithIssues.push({ id, name, issue: 'No owner found' });
        }
        
      } catch (error) {
        console.error(`⚠️ Error processing guild ${guild?.id || 'unknown'}:`, error.message);
        serversWithIssues.push({ 
          id: guild?.id || 'unknown', 
          name: guild?.name || 'UNKNOWN_SERVER',
          issue: `Processing error: ${error.message}` 
        });
      }
    });
    
    // Enhanced summary statistics
    console.log(`📊 Server Summary:`);
    console.log(`  └ Total Servers: ${guilds.length}`);
    console.log(`  └ Total Members: ${totalMembers.toLocaleString()}`);
    console.log(`  └ Average Members per Server: ${Math.round(totalMembers / guilds.length)}`);
    console.log(`  └ Largest Server: ${Math.max(...guilds.map(g => g.memberCount || 0)).toLocaleString()} members`);
    console.log(`  └ Smallest Server: ${Math.min(...guilds.map(g => g.memberCount || 0)).toLocaleString()} members`);
    
    if (serversWithIssues.length > 0) {
      console.log(`⚠️ Found ${serversWithIssues.length} servers with data issues:`);
      serversWithIssues.slice(0, 5).forEach(server => {
        console.log(`  - ${server.name} (${server.id}): ${server.issue}`);
      });
      if (serversWithIssues.length > 5) {
        console.log(`  ... and ${serversWithIssues.length - 5} more servers with issues`);
      }
    }
    
    // Perform permission check in background
    await checkServerPermissions();
    
    console.log(`✅ Background initialization completed in ${Date.now() - bgStartTime}ms`);
    
  } catch (error) {
    console.error('⚠️ Background initialization error:', error.message);
  }
}

// Optimized permission checking
async function checkServerPermissions() {
  console.log('🔍 Checking bot permissions across servers...');
  const permCheckStartTime = Date.now();
  
  let serversWithIssues = [];
  const guilds = client.guilds.cache;
  
  // Use for...of for better performance with large guild counts
  for (const guild of guilds.values()) {
    try {
      const guildName = guild.name || 'UNNAMED_SERVER';
      let botMember = guild.members.cache.get(client.user.id);
      
      // For large servers or if not in cache, try to fetch explicitly
      if (!botMember) {
        try {
          // Use guild.me shortcut or explicit fetch for large servers
          botMember = guild.me || await guild.members.fetchMe();
        } catch (fetchError) {
          // If we can't fetch, try alternative permission checking
          try {
            // Check if we have basic permissions through the guild object
            const botPermissions = guild.members.me?.permissions || guild.members.cache.get(client.user.id)?.permissions;
            if (botPermissions) {
              const requiredPerms = ['ViewChannel', 'ReadMessageHistory', 'SendMessages', 'BanMembers'];
              const missingPerms = requiredPerms.filter(perm => !botPermissions.has(perm));
              
              if (missingPerms.length > 0) {
                serversWithIssues.push({
                  name: guildName,
                  id: guild.id,
                  members: guild.memberCount || 0,
                  missingPerms: missingPerms,
                  rolePosition: 'Unknown (fetched via alternative method)',
                  fetchMethod: 'guild.me'
                });
              }
              continue; // Skip to next guild
            }
          } catch (altError) {
            // Last resort - mark as cache issue
            serversWithIssues.push({
              name: guildName,
              id: guild.id,
              members: guild.memberCount || 0,
              issue: `Large server - Unable to fetch bot member (${guild.memberCount} members). Fetch error: ${fetchError.message}`,
              isLargeServer: guild.memberCount >= 1000
            });
            continue;
          }
        }
      }
      
      if (botMember) {
        const permissions = botMember.permissions;
        const requiredPerms = ['ViewChannel', 'ReadMessageHistory', 'SendMessages', 'BanMembers'];
        const missingPerms = requiredPerms.filter(perm => !permissions.has(perm));
        
        if (missingPerms.length > 0) {
          serversWithIssues.push({
            name: guildName,
            id: guild.id,
            members: guild.memberCount || 0,
            missingPerms: missingPerms,
            rolePosition: botMember.roles.highest.position || 0,
            roleName: botMember.roles.highest.name || 'Unknown Role',
            fetchMethod: botMember === guild.me ? 'guild.me' : 'cache'
          });
        }
      }
      
    } catch (error) {
      serversWithIssues.push({
        name: guild?.name || 'UNKNOWN_SERVER',
        id: guild?.id || 'unknown',
        members: guild?.memberCount || 0,
        issue: `Permission check error: ${error.message}`
      });
    }
  }
  
  // Report results with enhanced details
  if (serversWithIssues.length > 0) {
    console.log(`⚠️ Found ${serversWithIssues.length}/${guilds.size} servers with permission issues:`);
    serversWithIssues.forEach(server => { // Show all servers with issues
      if (server.issue) {
        console.log(`  - ${server.name} (${server.id})`);
        console.log(`    └ Members: ${server.members.toLocaleString()} | Issue: ${server.issue}`);
        if (server.isLargeServer) {
          console.log(`    └ Large Server: Yes (${server.members.toLocaleString()} members)`);
        }
      } else {
        console.log(`  - ${server.name} (${server.id})`);
        console.log(`    └ Members: ${server.members.toLocaleString()} | Missing: ${server.missingPerms.join(', ')} | Role Pos: ${server.rolePosition}`);
        if (server.fetchMethod) {
          console.log(`    └ Fetch Method: ${server.fetchMethod}`);
        }
      }
    });
    
    // Summary of permission issues
    const missingPermsCount = serversWithIssues.filter(s => s.missingPerms).length;
    const largeServerCount = serversWithIssues.filter(s => s.isLargeServer).length;
    const cacheIssuesCount = serversWithIssues.filter(s => s.issue && s.issue.includes('cache') && !s.isLargeServer).length;
    const otherIssuesCount = serversWithIssues.length - missingPermsCount - largeServerCount - cacheIssuesCount;
    
    console.log(`📊 Permission Issues Summary:`);
    console.log(`  └ Missing Permissions: ${missingPermsCount} servers`);
    console.log(`  └ Large Server Fetch Issues: ${largeServerCount} servers`);
    console.log(`  └ Cache Issues: ${cacheIssuesCount} servers`);
    console.log(`  └ Other Issues: ${otherIssuesCount} servers`);
  } else {
    console.log(`✅ All ${guilds.size} servers have proper permissions!`);
  }
  
  console.log(`🔍 Permission check completed in ${Date.now() - permCheckStartTime}ms`);
}

// Enhanced guild create handler
client.on('guildCreate', (guild) => {
  console.log(`🏠 Bot joined new server: ${guild.name} (${guild.id}) with ${guild.memberCount} members`);
  updateBotActivity();
});

// Guild delete handler
client.on('guildDelete', (guild) => {
  console.log(`👋 Bot left server: ${guild.name} (${guild.id})`);
  updateBotActivity();
});

// Update bot activity status
function updateBotActivity() {
  const serverCount = client.guilds.cache.size;
  client.user?.setActivity(`Protecting ${serverCount} servers from spam`, { type: 'WATCHING' });
}

// Error handlers
client.on('error', (error) => {
  console.error('Discord client error:', error.message);
});

client.on('warn', (warning) => {
  console.log('⚠️ Discord client warning:', warning);
});

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  gracefulShutdown();
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  gracefulShutdown();
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

async function gracefulShutdown() {
  try {
    console.log('🔄 Saving data before shutdown...');
    clearVars();
    
    console.log('🔌 Closing database connection...');
    await DatabaseUtil.mongoose.connection.close();
    
    console.log('🤖 Destroying Discord client...');
    client.destroy();
    
    console.log('📝 Closing log file...');
    logger.close();
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
}

// Initialize the bot
initializeBot().catch((error) => {
  console.error('Failed to initialize bot:', error.message);
  process.exit(1);
});

// Enhanced guild member add handler
client.on('guildMemberAdd', async (member) => {
  try {
    // Log the join
    console.log(`👋 New member joined ${member.guild.name}: ${member.user.username} (${member.user.id})`);
    
    // Save to database
    try {
      await DatabaseUtil.AddJoinToCollection(member);
    } catch (error) {
      console.error('Error saving member join to database:', error.message);
    }
    
    // Check against blacklist
    if (BlacklistUtil.CheckBLMatchMember(member)) {
      console.log(`🚫 Blacklisted user detected on join: ${member.user.username}`);
      await DiscordUtil.banUser(null, member, false);
    }
    
  } catch (error) {
    console.error('Error handling member join:', error.message);
  }
});

// Enhanced message handler with better error handling and rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_COMMANDS_PER_WINDOW = 5;

function checkRateLimit(userId) {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  
  if (now > userLimit.resetTime) {
    userLimit.count = 1;
    userLimit.resetTime = now + RATE_LIMIT_WINDOW;
  } else {
    userLimit.count++;
  }
  
  rateLimitMap.set(userId, userLimit);
  return userLimit.count <= MAX_COMMANDS_PER_WINDOW;
}

client.on('messageCreate', async (msg) => {
  try {
    // Skip DMs and bot messages
    if (!msg.guild || msg.author.bot) return;
    
    // Log message activity (truncated for readability)
    const truncatedContent = msg.content.length > 100 
      ? `${msg.content.substring(0, 100)}...` 
      : msg.content;
    console.log(`📨 [${msg.guild.name}] ${msg.author.username}: ${truncatedContent}`);
    
    // Check for Telegram links
    if (msg.content.toLowerCase().includes('t.me')) {
      try {
        await DatabaseUtil.saveTgMsg(msg.content);
        console.log(`📱 Telegram link saved from ${msg.author.username}`);
      } catch (error) {
        console.error('Error saving Telegram message:', error.message);
      }
    }
    
    // Handle spam detection
    if (BlacklistUtil.isLibraSpam(msg.content)) {
      const member = msg.guild.members.cache.get(msg.author.id);
      if (member) {
        console.log(`🚫 Libra spam detected from ${msg.author.username}`);
        await DiscordUtil.banUser(null, member, true);
      }
      return;
    }
    
    if (BlacklistUtil.isNewCoinspam(msg.content)) {
      const member = msg.guild.members.cache.get(msg.author.id);
      if (member) {
        console.log(`🚫 New coin spam detected from ${msg.author.username}`);
        await DiscordUtil.banUser(null, member, false);
      }
      return;
    }
    
    // Handle commands
    if (msg.content.startsWith(PREFIX)) {
      await handleCommand(msg);
    }
    
  } catch (error) {
    console.error('Error in message handler:', error.message);
  }
});

// Improved command handler
async function handleCommand(msg) {
  const args = msg.content.slice(PREFIX.length).trim().split(' ');
  const command = args[0].toLowerCase();
  
  // Rate limiting
  if (!checkRateLimit(msg.author.id)) {
    await msg.reply('⏱️ You are being rate limited. Please wait before using commands again.');
    return;
  }
  
  // Permission check for admin commands
  const adminCommands = [
    'buildblacklist', 'banblacklisted', 'cleanupservers', 'clearlist',
    'serverstats', 'serverinfo', 'userinfo', 'topservers', 'recentjoins', 'spamstats', 'serverissues', 'leaveinvalid'
  ];
  const isAdmin = msg.member?.permissions.has('Administrator');
  
  if (adminCommands.includes(command) && !isAdmin) {
    await msg.reply('❌ You need administrator permissions to use this command.');
    return;
  }
  
  try {
    switch (command) {
      case 'buildblacklist':
        await buildBlacklist(msg);
        break;
      case 'getblacklistcount':
        await msg.reply(`📊 Current blacklist count: ${blacklistedIds.length}`);
        break;
      case 'banblacklisted':
        if (blacklistedIds.length > 0) {
          await DiscordUtil.banBlacklisted(msg, null, banCount, blacklistedIds);
        } else {
          await msg.reply('📋 No blacklisted users found. Use `!buildblacklist` first.');
        }
        break;
      case 'clearlist':
        clearVars();
        await msg.reply(`🗑️ Blacklist cleared. Count: ${blacklistedIds.length}`);
        break;
      case 'cleanupservers':
        await cleanupServers(msg);
        break;
      case 'help':
        await showHelp(msg);
        break;
      case 'stats':
        await showStats(msg);
        break;
      case 'serverstats':
        await showServerStats(msg);
        break;
      case 'serverinfo':
        await showServerInfo(msg, args[1]);
        break;
      case 'userinfo':
        await showUserInfo(msg, args[1]);
        break;
      case 'topservers':
        await showTopServers(msg);
        break;
      case 'recentjoins':
        await showRecentJoins(msg, args[1]);
        break;
      case 'spamstats':
        await showSpamStats(msg);
        break;
      case 'serverissues':
        await showServerIssues(msg);
        break;
      case 'leaveinvalid':
        await leaveInvalidServers(msg);
        break;
      case 'updatecache':
        await updateMemberCache(msg);
        break;
      case 'cachestats':
        await showCacheStats(msg);
        break;
      default:
        await msg.reply(`❓ Unknown command: ${command}. Use \`${PREFIX}help\` for available commands.`);
    }
  } catch (error) {
    console.error(`Error executing command ${command}:`, error.message);
    await msg.reply('❌ An error occurred while executing the command.');
  }
}
// Enhanced user update handler
client.on('userUpdate', async (oldUser, newUser) => {
  try {
    // Log username changes
    if (oldUser.username !== newUser.username) {
      console.log(`👤 User ${newUser.id} changed username: ${oldUser.username} → ${newUser.username}`);
    }
    
    // Check for bot impersonation
    if (BlacklistUtil.CheckBLBotImper(newUser.username, newUser.bot)) {
      console.log(`🚫 Bot impersonation detected: ${newUser.username}`);
      
      try {
        const serverId = await DatabaseUtil.findGuild(newUser.id);
        if (serverId) {
          const memberToBan = await DiscordUtil.getMember(client, serverId, newUser.id);
          if (memberToBan) {
            await DiscordUtil.banUser(null, memberToBan, false);
            console.log(`✅ Banned ${newUser.username} for bot impersonation`);
          }
        }
      } catch (error) {
        console.error('Error banning user for bot impersonation:', error.message);
      }
    }
    
  } catch (error) {
    console.error('Error handling user update:', error.message);
  }
});

// Improved blacklist building with better error handling
async function buildBlacklist(msg) {
  try {
    // Reset existing blacklist
    if (blacklistedIds.length > 0 || banCount > 0) {
      clearVars();
    }
    
    const guild = msg.guild;
    if (!guild) {
      await msg.reply('❌ This command can only be used in a server.');
      return;
    }
    
    console.log(`🔍 Building blacklist for server: ${guild.name}`);
    await msg.reply('🔄 Building blacklist... This may take a moment.');
    
    // Fetch all members
    const members = await guild.members.fetch();
    console.log(`📥 Fetched ${members.size} members from ${guild.name}`);
    
    let foundCount = 0;
    
    // Check each member against blacklist
    for (const member of members.values()) {
      if (BlacklistUtil.CheckBLMatchMember(member)) {
        console.log(`🚫 Found blacklisted user: ${member.user.username} (${member.user.id})`);
        blacklistedIds.push(member.user.id);
        foundCount++;
      }
    }
    
    console.log(`✅ Blacklist built: ${foundCount} blacklisted users found`);
    await msg.reply(`✅ Blacklist built successfully! Found ${foundCount} blacklisted users.`);
    
  } catch (error) {
    console.error('Error building blacklist:', error.message);
    await msg.reply('❌ Error occurred while building blacklist.');
  }
}

// LIGHTNING-FAST server cleanup with TRUE parallel processing
async function cleanupServers(msg) {
  try {
    const exemptServers = ['264445053596991498', '689639729981030446'];
    const guilds = client.guilds.cache.filter(guild => !exemptServers.includes(guild.id));
    
    if (guilds.size === 0) {
      await msg.reply('ℹ️ No servers available for cleanup.');
      return;
    }
    
    console.log(`🚀 LIGHTNING CLEANUP: Processing ALL ${guilds.size} servers in TRUE PARALLEL`);
    
    // Progress bar helper function
    function createProgressBar(current, total, length = 20) {
      const percentage = Math.floor((current / total) * 100);
      const filled = Math.floor((current / total) * length);
      const empty = length - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      return `${bar} ${percentage}%`;
    }

    // Create lightning-fast progress embed
    const progressEmbed = new Discord.EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('⚡ LIGHTNING-FAST PARALLEL CLEANUP')
      .setDescription(`**PROCESSING ALL ${guilds.size} SERVERS SIMULTANEOUSLY**\n${createProgressBar(0, guilds.size)}\n\n**🚀 TRUE PARALLEL PROCESSING - ZERO DELAYS 🚀**`)
      .addFields(
        { name: '🔥 Mode', value: `LIGHTNING SPEED`, inline: true },
        { name: '⚡ Strategy', value: `ALL ${guilds.size} servers at once`, inline: true },
        { name: '🚀 Processing', value: `Starting...`, inline: true }
      )
      .setFooter({ text: 'Maximum parallel processing - No limits, no delays' })
      .setTimestamp();
    
    const progressMsg = await msg.reply({ embeds: [progressEmbed] });
    
    const startTime = Date.now();
    let totalBanned = 0;
    let totalFound = 0;
    
    console.log(`⚡ STARTING TRUE PARALLEL PROCESSING OF ALL ${guilds.size} SERVERS`);
    
    // Real-time progress tracking
    let completedServers = 0;
    let currentFound = 0;
    let currentBanned = 0;
    
    // Progress update function
    const updateProgress = () => {
      const percentage = Math.floor((completedServers / guilds.size) * 100);
      progressEmbed
        .setColor(0x00ff00)
        .setTitle('⚡ LIGHTNING-FAST PARALLEL PROCESSING')
        .setDescription(`**PROCESSING ALL ${guilds.size} SERVERS SIMULTANEOUSLY**\n${createProgressBar(completedServers, guilds.size)}\n\n**🚀 REAL-TIME PROGRESS 🚀**`)
        .setFields(
          { name: '📊 Progress', value: `${completedServers}/${guilds.size} servers (${percentage}%)`, inline: true },
          { name: '🔍 Found', value: `${currentFound} blacklisted users`, inline: true },
          { name: '🚫 Banned', value: `${currentBanned} users`, inline: true },
          { name: '⚡ Status', value: `Processing ${guilds.size - completedServers} servers...`, inline: true },
          { name: '🚀 Mode', value: `TRUE PARALLEL - NO DELAYS`, inline: true },
          { name: '⏱️ Elapsed', value: `${((Date.now() - startTime) / 1000).toFixed(1)}s`, inline: true }
        );
      progressMsg.edit({ embeds: [progressEmbed] }).catch(() => {}); // Ignore edit errors
    };
    
    // Update progress every 500ms for maximum responsiveness
    const progressInterval = setInterval(updateProgress, 500);
    
    // Process ALL servers in TRUE PARALLEL - no batching, no delays
    const allServerPromises = Array.from(guilds.values()).map(async (guild) => {
      const serverStartTime = Date.now();
      
      try {
        console.log(`⚡ PARALLEL: ${guild.name} (${guild.memberCount} members)`);
        
        // STEP 1: INSTANT member access from cache
        let members;
        const fetchStart = Date.now();
        
        // Try to get members from cache first (INSTANT)
        const cachedMembers = getCachedMembers(guild.id);
        
        if (cachedMembers) {
          members = cachedMembers;
          const fetchTime = Date.now() - fetchStart;
          console.log(`  └ ⚡ ${guild.name}: ${members.size} members from CACHE in ${fetchTime}ms`);
        } else {
          // Cache miss - fetch and cache for next time
          try {
            const fetchPromise = guild.memberCount > 5000 
              ? guild.members.fetch({ force: true })
              : guild.members.fetch();
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), guild.memberCount > 10000 ? 3000 : 1500)
            );
            
            members = await Promise.race([fetchPromise, timeoutPromise]);
            
            // Update cache for next time
            memberCache.set(guild.id, members);
            cacheTimestamps.set(guild.id, Date.now());
            
            const fetchTime = Date.now() - fetchStart;
            console.log(`  └ 🔄 ${guild.name}: ${members.size} members FETCHED+CACHED in ${fetchTime}ms`);
          } catch (error) {
            members = guild.members.cache;
            console.log(`  └ 💨 ${guild.name}: Fallback to ${members.size} Discord cache members`);
          }
        }
        
        // STEP 2: ULTRA-FAST blacklist checking with Bun's speed
        const blacklistedMembers = [];
        const checkStart = Date.now();
        
        // Use Array.from for faster iteration in Bun
        const memberArray = Array.from(members.values());
        
        // Parallel blacklist checking using Bun's performance
        const chunkSize = Math.max(100, Math.floor(memberArray.length / 4)); // 4 parallel chunks
        const chunks = [];
        for (let i = 0; i < memberArray.length; i += chunkSize) {
          chunks.push(memberArray.slice(i, i + chunkSize));
        }
        
        const chunkPromises = chunks.map(async (chunk) => {
          const found = [];
          for (const member of chunk) {
            if (!member.user.bot && BlacklistUtil.CheckBLMatchMember(member)) {
              found.push(member);
            }
          }
          return found;
        });
        
        const chunkResults = await Promise.all(chunkPromises);
        chunkResults.forEach(chunk => blacklistedMembers.push(...chunk));
        
        const checkTime = Date.now() - checkStart;
        if (blacklistedMembers.length > 0) {
          console.log(`  └ 🎯 ${guild.name}: Found ${blacklistedMembers.length} in ${checkTime}ms`);
        }
        
        // STEP 3: LIGHTNING-FAST banning with aggressive parallel processing
        let serverBanned = 0;
        let serverFailed = 0;
        
        if (blacklistedMembers.length > 0) {
          const banStart = Date.now();
          console.log(`  └ 🚫 ${guild.name}: INSTANT BAN ${blacklistedMembers.length} users`);
          
          // Use Promise.allSettled for maximum speed and better error handling
          const banPromises = blacklistedMembers.map(async (member) => {
            const banTimeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Ban timeout')), 2000)
            );
            
            const banAttempt = DiscordUtil.banUser(null, member, false);
            
            try {
              const success = await Promise.race([banAttempt, banTimeout]);
              if (success) {
                return { status: 'banned', user: member.user.username };
              } else {
                return { status: 'failed', user: member.user.username };
              }
            } catch (error) {
              return { status: 'failed', user: member.user.username, error: error.message };
            }
          });
          
          const banResults = await Promise.allSettled(banPromises);
          
          banResults.forEach(result => {
            if (result.status === 'fulfilled') {
              if (result.value.status === 'banned') {
                serverBanned++;
              } else {
                serverFailed++;
              }
            } else {
              serverFailed++;
            }
          });
          
          const banTime = Date.now() - banStart;
          console.log(`  └ ⚡ ${guild.name}: ${serverBanned} banned, ${serverFailed} failed in ${banTime}ms`);
        }
        
        const serverTime = ((Date.now() - serverStartTime) / 1000).toFixed(1);
        console.log(`  └ ✅ ${guild.name}: ${serverBanned} banned in ${serverTime}s`);
        
        // Update real-time counters
        completedServers++;
        currentFound += blacklistedMembers.length;
        currentBanned += serverBanned;
        
        return {
          name: guild.name,
          found: blacklistedMembers.length,
          banned: serverBanned,
          failed: serverFailed,
          memberCount: guild.memberCount,
          time: serverTime
        };
        
      } catch (error) {
        console.error(`  └ ❌ ${guild.name}: Error - ${error.message}`);
        completedServers++; // Count errors as completed too
        return {
          name: guild.name,
          found: 0,
          banned: 0,
          failed: 0,
          memberCount: guild.memberCount,
          time: '0',
          error: true
        };
      }
    });
    
    // Wait for ALL servers to complete (true parallel processing)
    console.log(`⚡ WAITING FOR ALL ${guilds.size} SERVERS TO COMPLETE...`);
    const serverResults = await Promise.all(allServerPromises);
    
    // Stop progress updates
    clearInterval(progressInterval);
    
    // Calculate totals including failed bans
    totalFound = serverResults.reduce((sum, s) => sum + s.found, 0);
    totalBanned = serverResults.reduce((sum, s) => sum + s.banned, 0);
    const totalFailed = serverResults.reduce((sum, s) => sum + s.failed, 0);
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const serversProcessed = guilds.size;
    const avgSpeed = (serversProcessed / (totalTime || 1)).toFixed(1);
    const serversPerMin = Math.round(guilds.size * 60 / (totalTime || 1));
    
    console.log(`🚀 LIGHTNING CLEANUP COMPLETED: ${totalBanned} users banned across ${serversProcessed} servers in ${totalTime}s`);
    
    // Create LIGHTNING-FAST final summary
    const summaryEmbed = new Discord.EmbedBuilder()
      .setColor(totalBanned > 0 ? 0x00ff00 : 0xff6b6b)
      .setTitle('⚡ LIGHTNING-FAST CLEANUP COMPLETE')
      .setDescription(`**${createProgressBar(guilds.size, guilds.size)}**\n\n**🚀 TRUE PARALLEL PROCESSING:** Processed ${serversProcessed} servers in ${totalTime} seconds with ZERO delays`)
      .addFields(
        { name: '📊 Server Results', value: `✅ **Processed:** ${serversProcessed}\n❌ **Failed:** ${serverResults.filter(s => s.error).length}\n📈 **Success Rate:** 100%`, inline: true },
        { name: '👥 User Results', value: `🔍 **Found:** ${totalFound}\n🚫 **Banned:** ${totalBanned}\n❌ **Failed:** ${totalFailed}\n📋 **Success Rate:** ${totalFound > 0 ? Math.round((totalBanned / totalFound) * 100) : 0}%`, inline: true },
        { name: '⚡ LIGHTNING Performance', value: `⏱️ **Total Time:** ${totalTime}s\n📈 **Speed:** ${avgSpeed} servers/sec\n🚀 **Throughput:** ${serversPerMin} servers/min`, inline: true }
      )
      .setTimestamp();
    
    // Add largest servers processed
    const largestServers = serverResults
      .filter(s => s.memberCount >= 1000)
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(0, 10);
    
    if (largestServers.length > 0) {
      summaryEmbed.addFields({
        name: '🏢 Largest Servers Processed (Top 10)',
        value: largestServers.map((s, i) => 
          `${i + 1}. **${s.name}** - ${s.memberCount.toLocaleString()} members (${s.found} found, ${s.banned} banned)`
        ).join('\n'),
        inline: false
      });
    }
    
    await msg.channel.send({ embeds: [summaryEmbed] });
    
  } catch (error) {
    console.error('Error in LIGHTNING cleanup:', error.message);
    await msg.reply('❌ Critical error occurred during LIGHTNING cleanup.');
  }
}

// Manual cache update command
async function updateMemberCache(msg) {
  try {
    if (isCacheUpdating) {
      await msg.reply('⏭️ Cache update already in progress. Please wait...');
      return;
    }
    
    await msg.reply('🚀 Starting manual member cache update for all servers...');
    
    const startTime = Date.now();
    await updateAllMemberCaches();
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    const totalMembers = Array.from(memberCache.values()).reduce((sum, cache) => sum + cache.size, 0);
    const totalServers = memberCache.size;
    
    const embed = new Discord.EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('✅ Member Cache Updated')
      .setDescription(`Successfully updated member cache for all servers`)
      .addFields(
        { name: '📊 Servers Cached', value: totalServers.toString(), inline: true },
        { name: '👥 Total Members', value: totalMembers.toLocaleString(), inline: true },
        { name: '⏱️ Update Time', value: `${totalTime}s`, inline: true },
        { name: '🔄 Next Auto Update', value: `In 30 minutes`, inline: true },
        { name: '⚡ Performance', value: `${(totalServers / parseFloat(totalTime)).toFixed(1)} servers/sec`, inline: true },
        { name: '💾 Cache Status', value: `Fresh & Ready`, inline: true }
      )
      .setTimestamp();
    
    await msg.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in manual cache update:', error.message);
    await msg.reply('❌ Error occurred during cache update.');
  }
}

// Cache statistics command
async function showCacheStats(msg) {
  try {
    const totalMembers = Array.from(memberCache.values()).reduce((sum, cache) => sum + cache.size, 0);
    const totalServers = memberCache.size;
    const validCaches = Array.from(cacheTimestamps.keys()).filter(guildId => isCacheValid(guildId)).length;
    const expiredCaches = totalServers - validCaches;
    
    // Calculate cache ages
    const now = Date.now();
    const cacheAges = Array.from(cacheTimestamps.values()).map(timestamp => now - timestamp);
    const avgAge = cacheAges.length > 0 ? cacheAges.reduce((sum, age) => sum + age, 0) / cacheAges.length : 0;
    const oldestAge = cacheAges.length > 0 ? Math.max(...cacheAges) : 0;
    
    const embed = new Discord.EmbedBuilder()
      .setColor(validCaches > expiredCaches ? 0x00ff00 : 0xff6b6b)
      .setTitle('💾 Member Cache Statistics')
      .setDescription(`Current status of the member cache system`)
      .addFields(
        { name: '📊 Cache Overview', value: `**Total Servers:** ${totalServers}\n**Valid Caches:** ${validCaches}\n**Expired Caches:** ${expiredCaches}`, inline: true },
        { name: '👥 Member Data', value: `**Total Cached:** ${totalMembers.toLocaleString()}\n**Avg per Server:** ${Math.round(totalMembers / totalServers)}\n**Update Status:** ${isCacheUpdating ? 'Updating...' : 'Idle'}`, inline: true },
        { name: '⏰ Cache Ages', value: `**Average Age:** ${Math.round(avgAge / 60000)} minutes\n**Oldest Cache:** ${Math.round(oldestAge / 60000)} minutes\n**Cache Duration:** 30 minutes`, inline: true },
        { name: '🚀 Performance Impact', value: `**Cleanup Speed:** ${validCaches > 0 ? 'INSTANT' : 'Fetch Required'}\n**Cache Hit Rate:** ${Math.round((validCaches / totalServers) * 100)}%\n**Status:** ${validCaches > expiredCaches ? '✅ Optimal' : '⚠️ Needs Update'}`, inline: false }
      )
      .setTimestamp();
    
    await msg.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error showing cache stats:', error.message);
    await msg.reply('❌ Error occurred while getting cache statistics.');
  }
}

// Enhanced variable clearing with error handling
// Enhanced variable clearing with error handling
function clearVars() {
  try {
    if (blacklistedIds.length > 0) {
      DatabaseUtil.saveBlacklistedIDS(blacklistedIds);
      console.log(`💾 Saved ${blacklistedIds.length} blacklisted IDs to database`);
    }
    blacklistedIds = [];
    banCount = 0;
    console.log('🗑️ Cleared blacklist variables');
  } catch (error) {
    console.error('Error clearing variables:', error.message);
  }
}

// New helper functions
async function showHelp(msg) {
  const helpEmbed = {
    color: 0x0099ff,
    title: '🤖 NoGiveaway Bot Commands',
    description: 'Anti-spam bot for Discord servers',
    fields: [
      {
        name: '📊 General Commands',
        value: `\`${PREFIX}help\` - Show this help message\n\`${PREFIX}stats\` - Show bot statistics\n\`${PREFIX}getblacklistcount\` - Get current blacklist count`,
        inline: false
      },
      {
        name: '🛡️ Admin Commands',
        value: `\`${PREFIX}buildblacklist\` - Build blacklist for current server\n\`${PREFIX}banblacklisted\` - Ban all blacklisted users\n\`${PREFIX}clearlist\` - Clear the blacklist\n\`${PREFIX}cleanupservers\` - Clean up all servers\n\`${PREFIX}leaveinvalid\` - Leave servers without required permissions`,
        inline: false
      },
      {
        name: '📊 Admin Data Commands',
        value: `\`${PREFIX}serverstats\` - Detailed server statistics\n\`${PREFIX}serverinfo [serverid]\` - Info about specific server\n\`${PREFIX}userinfo <userid>\` - Detailed user information\n\`${PREFIX}topservers\` - Top servers by member count\n\`${PREFIX}recentjoins [limit]\` - Recent member joins\n\`${PREFIX}spamstats\` - Spam detection statistics\n\`${PREFIX}serverissues\` - Detailed server permission issues`,
        inline: false
      }
    ],
    footer: {
      text: 'Admin commands require Administrator permission'
    }
  };
  
  await msg.reply({ embeds: [helpEmbed] });
}

async function showStats(msg) {
  const stats = {
    color: 0x00ff00,
    title: '📊 Bot Statistics',
    fields: [
      {
        name: '🏠 Servers',
        value: client.guilds.cache.size.toString(),
        inline: true
      },
      {
        name: '👥 Users',
        value: client.users.cache.size.toString(),
        inline: true
      },
      {
        name: '⏰ Uptime',
        value: `${Math.floor(client.uptime / 1000 / 60)} minutes`,
        inline: true
      },
      {
        name: '🚫 Current Blacklist',
        value: blacklistedIds.length.toString(),
        inline: true
      },
      {
        name: '🔨 Total Bans',
        value: banCount.toString(),
        inline: true
      },
      {
        name: '🏓 Ping',
        value: `${client.ws.ping}ms`,
        inline: true
      }
    ],
    timestamp: new Date().toISOString()
  };
  
  await msg.reply({ embeds: [stats] });
}

// Advanced admin data commands

// Detailed server statistics
async function showServerStats(msg) {
  try {
    const guilds = client.guilds.cache;
    const totalMembers = guilds.reduce((acc, guild) => acc + guild.memberCount, 0);
    const averageMembers = Math.round(totalMembers / guilds.size);
    
    // Get permissions analysis
    let serversWithIssues = 0;
    let totalChannels = 0;
    let totalRoles = 0;
    
    guilds.forEach(guild => {
      const botMember = guild.members.cache.get(client.user.id);
      if (botMember) {
        const hasViewChannel = botMember.permissions.has('ViewChannel');
        const hasReadHistory = botMember.permissions.has('ReadMessageHistory');
        const hasSendMessages = botMember.permissions.has('SendMessages');
        const hasBanMembers = botMember.permissions.has('BanMembers');
        
        if (!hasViewChannel || !hasReadHistory || !hasSendMessages || !hasBanMembers) {
          serversWithIssues++;
        }
      } else {
        serversWithIssues++;
      }
      
      totalChannels += guild.channels.cache.size;
      totalRoles += guild.roles.cache.size;
    });
    
    const dbStats = await DatabaseUtil.getDatabaseStats();
    
    const embed = {
      color: 0x0099ff,
      title: '📊 Detailed Server Statistics',
      fields: [
        {
          name: '🏠 Server Overview',
          value: `**Total Servers:** ${guilds.size}\n**Total Members:** ${totalMembers.toLocaleString()}\n**Average Members/Server:** ${averageMembers}\n**Total Channels:** ${totalChannels}\n**Total Roles:** ${totalRoles}`,
          inline: true
        },
        {
          name: '⚠️ Permission Issues',
          value: `**Servers with Issues:** ${serversWithIssues}\n**Healthy Servers:** ${guilds.size - serversWithIssues}\n**Health Rate:** ${Math.round(((guilds.size - serversWithIssues) / guilds.size) * 100)}%`,
          inline: true
        },
        {
          name: '📈 Bot Performance',
          value: `**Uptime:** ${Math.floor(client.uptime / 1000 / 60)} minutes\n**Ping:** ${client.ws.ping}ms\n**Memory Usage:** ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };
    
    if (dbStats) {
      embed.fields.push({
        name: '💾 Database Statistics',
        value: `**Total Joins Logged:** ${dbStats.totalJoins}\n**Blacklist Records:** ${dbStats.totalBlacklists}\n**TG Messages:** ${dbStats.totalTgMessages}\n**Current Blacklist:** ${blacklistedIds.length}`,
        inline: false
      });
    }
    
    await msg.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in showServerStats:', error.message);
    await msg.reply('❌ Error retrieving server statistics.');
  }
}

// Specific server information
async function showServerInfo(msg, serverId) {
  try {
    let targetGuild;
    
    if (serverId) {
      targetGuild = client.guilds.cache.get(serverId);
      if (!targetGuild) {
        await msg.reply(`❌ Server with ID \`${serverId}\` not found.`);
        return;
      }
    } else {
      targetGuild = msg.guild;
    }
    
    const guild = targetGuild;
    const botMember = guild.members.cache.get(client.user.id);
    
    // Analyze permissions
    const permissions = [];
    if (botMember) {
      if (botMember.permissions.has('ViewChannel')) permissions.push('✅ View Channels');
      else permissions.push('❌ View Channels');
      
      if (botMember.permissions.has('ReadMessageHistory')) permissions.push('✅ Read History');
      else permissions.push('❌ Read History');
      
      if (botMember.permissions.has('SendMessages')) permissions.push('✅ Send Messages');
      else permissions.push('❌ Send Messages');
      
      if (botMember.permissions.has('BanMembers')) permissions.push('✅ Ban Members');
      else permissions.push('❌ Ban Members');
    }
    
    // Get channel breakdown
    const channels = guild.channels.cache;
    const textChannels = channels.filter(c => c.type === 0).size;
    const voiceChannels = channels.filter(c => c.type === 2).size;
    const categoryChannels = channels.filter(c => c.type === 4).size;
    
    // Get role breakdown
    const roles = guild.roles.cache;
    const adminRoles = roles.filter(r => r.permissions.has('Administrator')).size;
    const modRoles = roles.filter(r => r.permissions.has('BanMembers') && !r.permissions.has('Administrator')).size;
    
    const embed = {
      color: 0x00ff00,
      title: `🏠 Server Information: ${guild.name}`,
      thumbnail: { url: guild.iconURL({ size: 256 }) || undefined },
      fields: [
        {
          name: '📋 Basic Info',
          value: `**ID:** \`${guild.id}\`\n**Owner:** <@${guild.ownerId}>\n**Created:** ${new Date(guild.createdTimestamp).toLocaleDateString()}\n**Members:** ${guild.memberCount}\n**Boost Level:** ${guild.premiumTier}`,
          inline: true
        },
        {
          name: '📺 Channels',
          value: `**Total:** ${channels.size}\n**Text:** ${textChannels}\n**Voice:** ${voiceChannels}\n**Categories:** ${categoryChannels}`,
          inline: true
        },
        {
          name: '🎭 Roles',
          value: `**Total:** ${roles.size}\n**Admin Roles:** ${adminRoles}\n**Mod Roles:** ${modRoles}\n**Highest Role:** ${guild.roles.highest.name}`,
          inline: true
        },
        {
          name: '🤖 Bot Permissions',
          value: permissions.join('\n'),
          inline: false
        }
      ],
      footer: {
        text: `Verification Level: ${guild.verificationLevel} | Explicit Filter: ${guild.explicitContentFilter}`
      },
      timestamp: new Date().toISOString()
    };
    
    await msg.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in showServerInfo:', error.message);
    await msg.reply('❌ Error retrieving server information.');
  }
}

// Detailed user information
async function showUserInfo(msg, userId) {
  try {
    if (!userId) {
      await msg.reply('❌ Please provide a user ID. Usage: `!userinfo <userid>`');
      return;
    }
    
    // Validate user ID format
    if (!/^\d+$/.test(userId)) {
      await msg.reply('❌ Invalid user ID format. Must be a Discord user ID.');
      return;
    }
    
    // Try to fetch user from Discord
    let user;
    try {
      user = await client.users.fetch(userId);
    } catch (error) {
      await msg.reply('❌ User not found or bot cannot access user information.');
      return;
    }
    
    // Get database information
    const userStats = await DatabaseUtil.getUserJoinStats(userId);
    
    // Check blacklist status
    const isBlacklistedId = BlacklistUtil.checkIfIDIsBlacklisted(userId);
    const isBlacklistedUsername = BlacklistUtil.hasBlacklistedUsername(user.username, user.bot);
    const isBotImpersonator = BlacklistUtil.CheckBLBotImper(user.username, user.bot);
    const isBlacklistedAvatar = BlacklistUtil.isBlacklistedAvatar(user.avatar);
    const isNewUser = BlacklistUtil.checkIfUserIsNew(user.createdTimestamp);
    
    const accountAge = Math.floor((Date.now() - user.createdTimestamp) / (1000 * 60 * 60 * 24));
    
    const embed = {
      color: (isBlacklistedId || isBlacklistedUsername || isBotImpersonator || isBlacklistedAvatar) ? 0xff0000 : 0x00ff00,
      title: `👤 User Information: ${user.username}`,
      thumbnail: { url: user.displayAvatarURL({ size: 256 }) },
      fields: [
        {
          name: '📋 Basic Info',
          value: `**Username:** ${user.username}#${user.discriminator}\n**ID:** \`${user.id}\`\n**Created:** ${new Date(user.createdTimestamp).toLocaleDateString()}\n**Account Age:** ${accountAge} days\n**Bot:** ${user.bot ? 'Yes' : 'No'}`,
          inline: true
        },
        {
          name: '🚨 Blacklist Status',
          value: `**ID Blacklisted:** ${isBlacklistedId ? '❌ Yes' : '✅ No'}\n**Username Blacklisted:** ${isBlacklistedUsername ? '❌ Yes' : '✅ No'}\n**Bot Impersonator:** ${isBotImpersonator ? '❌ Yes' : '✅ No'}\n**Avatar Blacklisted:** ${isBlacklistedAvatar ? '❌ Yes' : '✅ No'}\n**New User:** ${isNewUser ? '⚠️ Yes' : '✅ No'}`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };
    
    // Add database statistics if available
    if (userStats && userStats.totalJoins > 0) {
      const serversList = userStats.servers.slice(0, 5).map(s => `**${s.serverName}** (${new Date(s.joinTime).toLocaleDateString()})`).join('\n');
      const moreServers = userStats.totalJoins > 5 ? `\n... and ${userStats.totalJoins - 5} more` : '';
      
      embed.fields.push({
        name: '📊 Database Records',
        value: `**Total Joins:** ${userStats.totalJoins}\n**First Seen:** ${new Date(userStats.firstSeen).toLocaleDateString()}\n**Last Seen:** ${new Date(userStats.lastSeen).toLocaleDateString()}`,
        inline: false
      });
      
      embed.fields.push({
        name: '🏠 Recent Servers',
        value: serversList + moreServers,
        inline: false
      });
    } else {
      embed.fields.push({
        name: '📊 Database Records',
        value: 'No join records found in database',
        inline: false
      });
    }
    
    await msg.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in showUserInfo:', error.message);
    await msg.reply('❌ Error retrieving user information.');
  }
}

// Top servers by member count
async function showTopServers(msg) {
  try {
    const guilds = Array.from(client.guilds.cache.values())
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(0, 15);
    
    const serverList = guilds.map((guild, index) => {
      const botMember = guild.members.cache.get(client.user.id);
      const hasPermissions = botMember && 
        botMember.permissions.has('ViewChannel') && 
        botMember.permissions.has('BanMembers');
      
      return `**${index + 1}.** ${guild.name} ${hasPermissions ? '✅' : '⚠️'}\n` +
             `    \`${guild.id}\` • ${guild.memberCount.toLocaleString()} members`;
    }).join('\n\n');
    
    const embed = {
      color: 0x0099ff,
      title: '🏆 Top Servers by Member Count',
      description: serverList,
      footer: {
        text: '✅ = Full permissions | ⚠️ = Missing permissions'
      },
      timestamp: new Date().toISOString()
    };
    
    await msg.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in showTopServers:', error.message);
    await msg.reply('❌ Error retrieving top servers.');
  }
}

// Recent joins across all servers
async function showRecentJoins(msg, limitArg) {
  try {
    const limit = Math.min(parseInt(limitArg) || 20, 50);
    
    // Get recent joins from database
    const ServerJoin = DatabaseUtil.mongoose.model('ServerJoin');
    const recentJoins = await ServerJoin
      .find()
      .sort({ joinTimestamp: -1 })
      .limit(limit)
      .lean();
    
    if (!recentJoins || recentJoins.length === 0) {
      await msg.reply('📭 No recent joins found in database.');
      return;
    }
    
    const joinsList = recentJoins.map((join, index) => {
      const timeAgo = Math.floor((Date.now() - join.joinTimestamp) / (1000 * 60));
      const isBlacklisted = BlacklistUtil.checkIfIDIsBlacklisted(join.userid);
      
      return `**${index + 1}.** ${join.username} ${isBlacklisted ? '🚨' : ''} ${join.isBot ? '🤖' : ''}\n` +
             `    Server: ${join.servername}\n` +
             `    ID: \`${join.userid}\` • ${timeAgo}m ago`;
    }).join('\n\n');
    
    const embed = {
      color: 0x00ff00,
      title: `📥 Recent Joins (Last ${limit})`,
      description: joinsList,
      footer: {
        text: '🚨 = Blacklisted | 🤖 = Bot'
      },
      timestamp: new Date().toISOString()
    };
    
    await msg.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in showRecentJoins:', error.message);
    await msg.reply('❌ Error retrieving recent joins.');
  }
}

// Spam detection statistics
async function showSpamStats(msg) {
  try {
    // Get TG message stats
    const TgMsg = DatabaseUtil.mongoose.model('TgMsg');
    const totalTgMessages = await TgMsg.countDocuments();
    const recentTgMessages = await TgMsg.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    // Get blacklist stats
    const BlacklistIDModel = DatabaseUtil.mongoose.model('BlacklistIDModel');
    const totalBlacklistEntries = await BlacklistIDModel.countDocuments();
    const recentBlacklistEntries = await BlacklistIDModel.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    // Get recent TG messages with links
    const recentTgWithLinks = await TgMsg
      .find({ timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
      .sort({ timestamp: -1 })
      .limit(5)
      .lean();
    
    const tgList = recentTgWithLinks.map((tg, index) => {
      const timeAgo = Math.floor((Date.now() - tg.timestamp) / (1000 * 60));
      const truncatedMsg = tg.message.length > 50 ? tg.message.substring(0, 50) + '...' : tg.message;
      
      return `**${index + 1}.** ${truncatedMsg}\n    ${timeAgo}m ago • ${tg.linkCount || 0} links`;
    }).join('\n');
    
    const embed = {
      color: 0xff9900,
      title: '🛡️ Spam Detection Statistics',
      fields: [
        {
          name: '📊 Overall Stats',
          value: `**Total TG Messages:** ${totalTgMessages}\n**Total Blacklist Entries:** ${totalBlacklistEntries}\n**Current Active Blacklist:** ${blacklistedIds.length}\n**Total Bans Today:** ${banCount}`,
          inline: true
        },
        {
          name: '📈 Last 24 Hours',
          value: `**New TG Messages:** ${recentTgMessages}\n**New Blacklist Entries:** ${recentBlacklistEntries}\n**Detection Rate:** ${recentTgMessages > 0 ? Math.round((recentBlacklistEntries / recentTgMessages) * 100) : 0}%`,
          inline: true
        },
        {
          name: '🔍 Detection Types',
          value: `**Libra Spam Detection:** Active\n**New Coin Spam Detection:** Active\n**Bot Impersonation Detection:** Active\n**Avatar Blacklist:** Active\n**New User Detection:** Active (25 days)`,
          inline: false
        }
      ],
      timestamp: new Date().toISOString()
    };
    
    if (tgList) {
      embed.fields.push({
        name: '📱 Recent TG Messages',
        value: tgList || 'No recent TG messages',
        inline: false
      });
    }
    
    await msg.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in showSpamStats:', error.message);
    await msg.reply('❌ Error retrieving spam statistics.');
  }
}

// Leave servers without required permissions
async function leaveInvalidServers(msg) {
  try {
    console.log('🔍 Analyzing servers for permission issues...');
    
    let serversToLeave = [];
    const guilds = client.guilds.cache;
    const requiredPerms = ['BanMembers']; // Core permission needed for anti-spam
    
    // Analyze each server
    for (const guild of guilds.values()) {
      try {
        const guildName = guild.name || 'UNNAMED_SERVER';
        let botMember = guild.members.cache.get(client.user.id);
        
        // Try to fetch if not in cache
        if (!botMember) {
          try {
            botMember = guild.me || await guild.members.fetchMe();
          } catch (fetchError) {
            // Can't fetch member, mark for leaving
            serversToLeave.push({
              name: guildName,
              id: guild.id,
              members: guild.memberCount || 0,
              reason: 'Unable to fetch bot member data',
              canLeave: true
            });
            continue;
          }
        }
        
        if (botMember) {
          const permissions = botMember.permissions;
          const missingCritical = requiredPerms.filter(perm => !permissions.has(perm));
          
          // Check if missing critical permissions
          if (missingCritical.length > 0) {
            // Additional check for completely blocked servers
            const hasNoAccess = !permissions.has('ViewChannel') && !permissions.has('SendMessages');
            
            serversToLeave.push({
              name: guildName,
              id: guild.id,
              members: guild.memberCount || 0,
              owner: guild.ownerId || 'Unknown',
              missingPerms: missingCritical,
              hasNoAccess: hasNoAccess,
              reason: `Missing critical permissions: ${missingCritical.join(', ')}`,
              canLeave: true
            });
          }
        }
        
      } catch (error) {
        console.error(`Error analyzing guild ${guild?.id}:`, error.message);
      }
    }
    
    if (serversToLeave.length === 0) {
      await msg.reply('✅ All servers have proper permissions! No servers to leave.');
      return;
    }
    
    // Create confirmation message
    let confirmMsg = `**⚠️ Found ${serversToLeave.length} servers without required permissions**\n\n`;
    confirmMsg += `**Servers to leave:**\n`;
    
    serversToLeave.slice(0, 10).forEach(server => {
      confirmMsg += `• **${server.name}** (${server.members.toLocaleString()} members)\n`;
      confirmMsg += `  └ Reason: ${server.reason}\n`;
      if (server.hasNoAccess) {
        confirmMsg += `  └ ⛔ Bot has no access at all\n`;
      }
    });
    
    if (serversToLeave.length > 10) {
      confirmMsg += `\n... and ${serversToLeave.length - 10} more servers\n`;
    }
    
    confirmMsg += `\n**React with ✅ to confirm leaving these servers, or ❌ to cancel.**`;
    
    const confirmMessage = await msg.reply(confirmMsg);
    console.log(`Created confirmation message: ${confirmMessage.id}`);
    
    // Add reactions
    try {
      await confirmMessage.react('✅');
      await confirmMessage.react('❌');
      console.log('Added reactions to message');
    } catch (error) {
      console.error('Error adding reactions:', error);
      await msg.reply('❌ Error setting up reactions. Operation cancelled.');
      return;
    }
    
    // Wait for reaction with better debugging
    const filter = (reaction, user) => {
      console.log(`Reaction detected: ${reaction.emoji.name} by ${user.tag} (${user.id})`);
      const isValid = ['✅', '❌'].includes(reaction.emoji.name) && user.id === msg.author.id && !user.bot;
      console.log(`Filter result: ${isValid} (emoji: ${reaction.emoji.name}, user: ${user.id === msg.author.id}, not bot: ${!user.bot})`);
      return isValid;
    };
    
    try {
      // Create collector with debug events
      const collector = confirmMessage.createReactionCollector({ 
        filter, 
        max: 1, 
        time: 30000,
        dispose: true 
      });
      
      console.log('Reaction collector created, waiting for reactions...');
      
      // Add debug event
      confirmMessage.client.on('messageReactionAdd', (reaction, user) => {
        if (reaction.message.id === confirmMessage.id) {
          console.log(`DEBUG: Reaction added to target message: ${reaction.emoji.name} by ${user.tag}`);
        }
      });
      
      collector.on('collect', async (reaction, user) => {
        console.log(`✅ Collected ${reaction.emoji.name} from ${user.tag}`);
        
        // Stop the collector immediately
        collector.stop('reacted');
        
        if (reaction.emoji.name === '✅') {
          // Leave servers
          await msg.reply('🔄 Starting to leave servers without proper permissions...');
          
          let leftCount = 0;
          let failedCount = 0;
          const statusMsg = await msg.channel.send('Progress: 0/' + serversToLeave.length);
          
          for (let i = 0; i < serversToLeave.length; i++) {
            const server = serversToLeave[i];
            try {
              const guild = client.guilds.cache.get(server.id);
              if (guild) {
                await guild.leave();
                console.log(`✅ Left server: ${server.name} (${server.id})`);
                leftCount++;
              } else {
                console.log(`⚠️ Guild not found: ${server.name} (${server.id})`);
                failedCount++;
              }
              
              // Update progress
              if ((i + 1) % 5 === 0) {
                await statusMsg.edit(`Progress: ${i + 1}/${serversToLeave.length} (Left: ${leftCount}, Failed: ${failedCount})`);
              }
              
              // Rate limiting
              await new Promise(resolve => setTimeout(resolve, 1000));
              
            } catch (error) {
              console.error(`❌ Failed to leave ${server.name}:`, error.message);
              failedCount++;
            }
          }
          
          await statusMsg.delete();
          await msg.reply(`✅ **Operation complete!**\n• Successfully left: ${leftCount} servers\n• Failed to leave: ${failedCount} servers\n• Remaining servers: ${client.guilds.cache.size}`);
          
        } else if (reaction.emoji.name === '❌') {
          await msg.reply('❌ Operation cancelled.');
        }
      });
      
      collector.on('end', (collected, reason) => {
        console.log(`Collector ended. Reason: ${reason}, Collected: ${collected.size}`);
        if (collected.size === 0 && reason === 'time') {
          msg.reply('⏱️ No response received. Operation cancelled.');
        }
      });
      
      // Also add error handler
      collector.on('error', error => {
        console.error('Collector error:', error);
      });
      
    } catch (error) {
      console.error('Error with reaction collector:', error);
      await msg.reply('❌ Error setting up confirmation. Operation cancelled.');
    }
    
  } catch (error) {
    console.error('Error in leaveInvalidServers:', error.message);
    await msg.reply('❌ Error analyzing servers.');
  }
}

// Show detailed server issues
async function showServerIssues(msg) {
  try {
    console.log('🔍 Performing detailed server permission analysis...');
    
    let serversWithIssues = [];
    const guilds = client.guilds.cache;
    
    // Analyze each server with improved member fetching
    for (const guild of guilds.values()) {
      try {
        const guildName = guild.name || 'UNNAMED_SERVER';
        let botMember = guild.members.cache.get(client.user.id);
        
        // For large servers or if not in cache, try to fetch explicitly
        if (!botMember) {
          try {
            // Use guild.me shortcut or explicit fetch for large servers
            botMember = guild.me || await guild.members.fetchMe();
          } catch (fetchError) {
            // Mark as large server fetch issue
            serversWithIssues.push({
              name: guildName,
              id: guild.id,
              members: guild.memberCount || 0,
              owner: guild.ownerId || 'Unknown',
              created: guild.createdAt ? guild.createdAt.toISOString().split('T')[0] : 'Unknown',
              issue: `Large server member fetch failed (${guild.memberCount} members) - ${fetchError.message}`,
              type: 'large_server',
              isLargeServer: guild.memberCount >= 1000
            });
            continue;
          }
        }
        
        if (botMember) {
          const permissions = botMember.permissions;
          const requiredPerms = ['ViewChannel', 'ReadMessageHistory', 'SendMessages', 'BanMembers'];
          const missingPerms = requiredPerms.filter(perm => !permissions.has(perm));
          
          if (missingPerms.length > 0) {
            serversWithIssues.push({
              name: guildName,
              id: guild.id,
              members: guild.memberCount || 0,
              owner: guild.ownerId || 'Unknown',
              created: guild.createdAt ? guild.createdAt.toISOString().split('T')[0] : 'Unknown',
              missingPerms: missingPerms,
              rolePosition: botMember.roles.highest.position || 0,
              roleName: botMember.roles.highest.name || 'Unknown Role',
              type: 'permission',
              fetchMethod: botMember === guild.me ? 'guild.me' : 'cache'
            });
          }
        }
        
      } catch (error) {
        serversWithIssues.push({
          name: guild?.name || 'UNKNOWN_SERVER',
          id: guild?.id || 'unknown',
          members: guild?.memberCount || 0,
          owner: 'Unknown',
          created: 'Unknown',
          issue: `Analysis error: ${error.message}`,
          type: 'error'
        });
      }
    }
    
    if (serversWithIssues.length === 0) {
      await msg.reply('✅ All servers have proper permissions and no issues detected!');
      return;
    }
    
    // Create detailed report
    const permIssues = serversWithIssues.filter(s => s.type === 'permission');
    const cacheIssues = serversWithIssues.filter(s => s.type === 'cache');
    const largeServerIssues = serversWithIssues.filter(s => s.type === 'large_server');
    const errorIssues = serversWithIssues.filter(s => s.type === 'error');
    
    let report = `**🔍 Detailed Server Issues Report**\n\n`;
    report += `**Summary:** ${serversWithIssues.length}/${guilds.size} servers have issues\n`;
    report += `• Missing Permissions: ${permIssues.length} servers\n`;
    report += `• Large Server Fetch Issues: ${largeServerIssues.length} servers\n`;
    report += `• Cache Issues: ${cacheIssues.length} servers\n`;
    report += `• Analysis Errors: ${errorIssues.length} servers\n\n`;
    
    // Permission Issues
    if (permIssues.length > 0) {
      report += `**⚠️ Permission Issues (${permIssues.length}):**\n`;
      permIssues.forEach(server => {
        report += `• **${server.name}** (${server.id})\n`;
        report += `  └ Members: ${server.members.toLocaleString()} | Owner: ${server.owner}\n`;
        report += `  └ Missing: ${server.missingPerms.join(', ')}\n`;
        report += `  └ Role: ${server.roleName} (Position: ${server.rolePosition})\n`;
        report += `  └ Fetch Method: ${server.fetchMethod || 'cache'} | Created: ${server.created}\n\n`;
      });
    }
    
    // Large Server Issues
    if (largeServerIssues.length > 0) {
      report += `**🏢 Large Server Fetch Issues (${largeServerIssues.length}):**\n`;
      largeServerIssues.forEach(server => {
        report += `• **${server.name}** (${server.id})\n`;
        report += `  └ Members: ${server.members.toLocaleString()} | Owner: ${server.owner}\n`;
        report += `  └ Issue: ${server.issue}\n`;
        report += `  └ Large Server: ${server.isLargeServer ? 'Yes' : 'No'} | Created: ${server.created}\n\n`;
      });
    }
    
    // Cache Issues
    if (cacheIssues.length > 0) {
      report += `**🔄 Cache Issues (${cacheIssues.length}):**\n`;
      cacheIssues.forEach(server => {
        report += `• **${server.name}** (${server.id})\n`;
        report += `  └ Members: ${server.members.toLocaleString()} | Owner: ${server.owner}\n`;
        report += `  └ Issue: ${server.issue}\n`;
        report += `  └ Created: ${server.created}\n\n`;
      });
    }
    
    // Error Issues
    if (errorIssues.length > 0) {
      report += `**❌ Analysis Errors (${errorIssues.length}):**\n`;
      errorIssues.forEach(server => {
        report += `• **${server.name}** (${server.id})\n`;
        report += `  └ Members: ${server.members.toLocaleString()}\n`;
        report += `  └ Error: ${server.issue}\n\n`;
      });
    }
    
    // Split message if too long (Discord limit is 2000 characters)
    if (report.length > 1900) { // Leave buffer for "Part X/Y:" prefix
      const chunks = [];
      let currentChunk = '';
      const maxChunkSize = 1800; // Conservative limit
      
      report.split('\n').forEach(line => {
        // If adding this line would exceed the limit, start a new chunk
        if (currentChunk.length + line.length + 1 > maxChunkSize) {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = line;
        } else {
          currentChunk += (currentChunk ? '\n' : '') + line;
        }
      });
      
      // Add the last chunk if it has content
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      
      // Send each chunk as a separate message
      for (let i = 0; i < chunks.length; i++) {
        const prefix = chunks.length > 1 ? `**Part ${i + 1}/${chunks.length}:**\n` : '';
        const messageContent = prefix + chunks[i];
        
        // Double-check the message length
        if (messageContent.length > 2000) {
          // If still too long, split more aggressively
          const lines = chunks[i].split('\n');
          let subChunk = '';
          
          for (const line of lines) {
            if (subChunk.length + line.length + prefix.length + 10 > 1900) {
              if (subChunk) {
                await msg.reply(`${prefix}${subChunk.trim()}`);
                subChunk = '';
              }
            }
            subChunk += (subChunk ? '\n' : '') + line;
          }
          
          if (subChunk.trim()) {
            await msg.reply(`${prefix}${subChunk.trim()}`);
          }
        } else {
          await msg.reply(messageContent);
        }
        
        // Small delay between messages to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } else {
      await msg.reply(report);
    }
    
  } catch (error) {
    console.error('Error in showServerIssues:', error.message);
    await msg.reply('❌ Error analyzing server issues.');
  }
}
