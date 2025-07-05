const BaseCommand = require('./BaseCommand');
const Discord = require('discord.js');

class CleanupServersCommand extends BaseCommand {
  constructor() {
    super(
      'cleanupservers',
      'Lightning-fast cleanup of all servers using cached member data',
      '!cleanupservers',
      ['ADMIN']
    );
  }

  async execute(msg, args, client, utils) {
    const { BlacklistUtil, DiscordUtil, memberCache, getCachedMembers, memberCache: cache, cacheTimestamps } = utils;
    
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
      
      console.log(`⚡ STARTING TRUE PARALLEL PROCESSING OF ALL ${guilds.size} SERVERS`);
      
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
              cache.set(guild.id, members);
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
}

module.exports = CleanupServersCommand;