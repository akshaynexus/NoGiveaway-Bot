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
const CommandManager = require('./commands/CommandManager');

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

// Initialize command manager
const commandManager = new CommandManager();

// Clear state variables function
function clearVars() {
  banCount = 0;
  blacklistedIds = [];
  console.log('🗑️ State variables cleared: banCount and blacklistedIds reset');
}

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

// Modern command handler using the new command system
async function handleCommand(msg) {
  const args = msg.content.slice(PREFIX.length).trim().split(' ');
  const command = args.shift().toLowerCase();
  
  console.log(`📨 [${msg.guild?.name || 'DM'}] ${msg.author.username}: ${msg.content}`);
  
  // Rate limiting
  if (!checkRateLimit(msg.author.id)) {
    await msg.reply('⏱️ You are being rate limited. Please wait before using commands again.');
    return;
  }
  
  try {
    // Create utils object with all the utilities commands might need
    const utils = {
      BlacklistUtil,
      DiscordUtil,
      DatabaseUtil,
      memberCache,
      cacheTimestamps,
      getCachedMembers,
      isCacheValid,
      updateAllMemberCaches,
      isCacheUpdating,
      blacklistedIds,
      banCount,
      clearVars,
      commandManager,
      PREFIX,
      CACHE_DURATION
    };
    
    // Try to execute command using the command manager
    const commandExecuted = await commandManager.executeCommand(command, msg, args, client, utils);
    
    if (!commandExecuted) {
      await msg.reply(`❓ Unknown command: ${command}. Use \`${PREFIX}help\` for available commands.`);
    }
    
  } catch (error) {
    console.error(`Error in command handler:`, error.message);
    await msg.reply('❌ An error occurred while processing the command.');
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
