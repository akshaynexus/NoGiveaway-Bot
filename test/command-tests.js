const assert = require('assert');
const sinon = require('sinon');
const { describe, it, beforeEach, afterEach } = require('mocha');

// Import command classes
const HelpCommand = require('../commands/help');
const StatsCommand = require('../commands/stats');
const ClearListCommand = require('../commands/clearlist');
const GetBlacklistCountCommand = require('../commands/getblacklistcount');
const BuildBlacklistCommand = require('../commands/buildblacklist');
const BanBlacklistedCommand = require('../commands/banblacklisted');
const CleanupServersCommand = require('../commands/cleanupservers');
const UpdateCacheCommand = require('../commands/updatecache');
const CacheStatsCommand = require('../commands/cachestats');
const ServerStatsCommand = require('../commands/serverstats');
const ServerInfoCommand = require('../commands/serverinfo');
const UserInfoCommand = require('../commands/userinfo');
const TopServersCommand = require('../commands/topservers');
const RecentJoinsCommand = require('../commands/recentjoins');
const SpamStatsCommand = require('../commands/spamstats');
const ServerIssuesCommand = require('../commands/serverissues');
const LeaveInvalidCommand = require('../commands/leaveinvalid');

describe('Command Tests', function() {
  let mockMsg, mockClient, mockUtils, mockGuild, mockMember, mockUser;

  beforeEach(function() {
    // Mock Discord.js structures
    mockUser = {
      id: '123456789',
      username: 'testuser',
      bot: false,
      createdAt: new Date(),
      displayAvatarURL: sinon.stub().returns('https://example.com/avatar.png')
    };

    mockMember = {
      user: mockUser,
      id: '123456789',
      nickname: null,
      joinedAt: new Date(),
      permissions: {
        has: sinon.stub().returns(true)
      },
      roles: {
        cache: new Map()
      }
    };

    mockGuild = {
      id: '987654321',
      name: 'Test Guild',
      memberCount: 100,
      channels: { cache: new Map() },
      roles: { cache: new Map() },
      createdAt: new Date(),
      joinedAt: new Date(),
      fetchOwner: sinon.stub().resolves(mockMember),
      members: {
        fetch: sinon.stub().resolves(new Map([['123456789', mockMember]]))
      },
      iconURL: sinon.stub().returns('https://example.com/icon.png'),
      verificationLevel: 1
    };

    mockMsg = {
      author: mockUser,
      member: mockMember,
      guild: mockGuild,
      reply: sinon.stub().resolves(),
      channel: { id: '111111111' }
    };

    mockClient = {
      user: mockUser,
      guilds: {
        cache: new Map([['987654321', mockGuild]])
      },
      channels: {
        cache: new Map()
      },
      ws: { ping: 50 },
      users: {
        fetch: sinon.stub().resolves(mockUser)
      }
    };

    mockUtils = {
      BlacklistUtil: {
        CheckBLMatchMember: sinon.stub().returns(false)
      },
      DiscordUtil: {
        banBlacklisted: sinon.stub().resolves(),
        banUser: sinon.stub().resolves()
      },
      DatabaseUtil: {},
      memberCache: new Map(),
      cacheTimestamps: new Map(),
      getCachedMembers: sinon.stub().resolves(new Map()),
      isCacheValid: sinon.stub().returns(true),
      updateAllMemberCaches: sinon.stub().resolves(),
      isCacheUpdating: false,
      blacklistedIds: ['999999999'],
      banCount: 5,
      clearVars: sinon.stub(),
      commandManager: {
        getCommands: sinon.stub().returns(new Map())
      },
      PREFIX: '!',
      CACHE_DURATION: 1800000
    };

    // Console methods are already stubbed globally in setup.js
    // Reset call counts for each test
    global.consoleLogStub.resetHistory();
    global.consoleErrorStub.resetHistory();
  });

  afterEach(function() {
    // Don't restore global stubs here - they're managed in setup.js
  });

  describe('HelpCommand', function() {
    it('should create help command with correct properties', function() {
      const cmd = new HelpCommand();
      assert.strictEqual(cmd.name, 'help');
      assert.strictEqual(cmd.description, 'Show all available commands');
      assert.strictEqual(cmd.usage, '!help [command]');
    });

    it('should execute help command successfully', async function() {
      const cmd = new HelpCommand();
      await cmd.execute(mockMsg, [], mockClient, mockUtils);
      assert(mockMsg.reply.calledOnce);
    });

    it('should show specific command help when command name provided', async function() {
      const testCommand = { name: 'test', description: 'Test command', usage: '!test', permissions: [] };
      mockUtils.commandManager.getCommands.returns(new Map([['test', testCommand]]));
      
      const cmd = new HelpCommand();
      await cmd.execute(mockMsg, ['test'], mockClient, mockUtils);
      assert(mockMsg.reply.calledOnce);
    });
  });

  describe('StatsCommand', function() {
    it('should create stats command with correct properties', function() {
      const cmd = new StatsCommand();
      assert.strictEqual(cmd.name, 'stats');
      assert.strictEqual(cmd.description, 'Show bot statistics and performance metrics');
    });

    it('should execute stats command successfully', async function() {
      // Mock process properties
      sinon.stub(process, 'uptime').returns(3661); // 1 hour, 1 minute, 1 second
      sinon.stub(process, 'memoryUsage').returns({
        heapUsed: 50 * 1024 * 1024, // 50MB
        heapTotal: 100 * 1024 * 1024 // 100MB
      });

      const cmd = new StatsCommand();
      await cmd.execute(mockMsg, [], mockClient, mockUtils);
      assert(mockMsg.reply.calledOnce);
    });
  });

  describe('ClearListCommand', function() {
    it('should create clearlist command with correct properties', function() {
      const cmd = new ClearListCommand();
      assert.strictEqual(cmd.name, 'clearlist');
      assert.strictEqual(cmd.description, 'Clear the current blacklist');
      assert.deepStrictEqual(cmd.permissions, ['ADMIN']);
    });

    it('should execute clearlist command successfully', async function() {
      const cmd = new ClearListCommand();
      await cmd.execute(mockMsg, [], mockClient, mockUtils);
      assert(mockUtils.clearVars.calledOnce);
      assert(mockMsg.reply.calledOnce);
    });
  });

  describe('GetBlacklistCountCommand', function() {
    it('should create getblacklistcount command with correct properties', function() {
      const cmd = new GetBlacklistCountCommand();
      assert.strictEqual(cmd.name, 'getblacklistcount');
      assert.strictEqual(cmd.description, 'Show current blacklist count');
      assert.deepStrictEqual(cmd.permissions, ['ADMIN']);
    });

    it('should execute getblacklistcount command successfully', async function() {
      const cmd = new GetBlacklistCountCommand();
      await cmd.execute(mockMsg, [], mockClient, mockUtils);
      assert(mockMsg.reply.calledOnce);
      assert(mockMsg.reply.calledWith('📊 Current blacklist count: **1** users | Ban count: **5**'));
    });
  });

  describe('BuildBlacklistCommand', function() {
    it('should create buildblacklist command with correct properties', function() {
      const cmd = new BuildBlacklistCommand();
      assert.strictEqual(cmd.name, 'buildblacklist');
      assert.strictEqual(cmd.description, 'Build blacklist for the current server');
      assert.deepStrictEqual(cmd.permissions, ['ADMIN']);
    });

    it('should execute buildblacklist command successfully', async function() {
      const cmd = new BuildBlacklistCommand();
      await cmd.execute(mockMsg, [], mockClient, mockUtils);
      assert(mockMsg.reply.calledTwice); // Initial "Building..." + final result
    });

    it('should handle buildblacklist command without guild', async function() {
      mockMsg.guild = null;
      const cmd = new BuildBlacklistCommand();
      await cmd.execute(mockMsg, [], mockClient, mockUtils);
      assert(mockMsg.reply.calledWith('❌ This command can only be used in a server.'));
    });
  });

  describe('BanBlacklistedCommand', function() {
    it('should create banblacklisted command with correct properties', function() {
      const cmd = new BanBlacklistedCommand();
      assert.strictEqual(cmd.name, 'banblacklisted');
      assert.strictEqual(cmd.description, 'Ban all users in the current blacklist');
      assert.deepStrictEqual(cmd.permissions, ['ADMIN']);
    });

    it('should execute banblacklisted command with blacklisted users', async function() {
      const cmd = new BanBlacklistedCommand();
      await cmd.execute(mockMsg, [], mockClient, mockUtils);
      assert(mockUtils.DiscordUtil.banBlacklisted.calledOnce);
    });

    it('should handle banblacklisted command with empty blacklist', async function() {
      mockUtils.blacklistedIds = [];
      const cmd = new BanBlacklistedCommand();
      await cmd.execute(mockMsg, [], mockClient, mockUtils);
      assert(mockMsg.reply.calledWith('📋 No blacklisted users found. Use `!buildblacklist` first.'));
    });
  });

  describe('CleanupServersCommand', function() {
    it('should create cleanupservers command with correct properties', function() {
      const cmd = new CleanupServersCommand();
      assert.strictEqual(cmd.name, 'cleanupservers');
      assert.strictEqual(cmd.description, 'Lightning-fast cleanup of all servers using cached member data');
      assert.deepStrictEqual(cmd.permissions, ['ADMIN']);
    });

    it('should execute cleanupservers command successfully', async function() {
      // Mock Date.now for consistent timing
      const clock = sinon.useFakeTimers();
      
      const cmd = new CleanupServersCommand();
      await cmd.execute(mockMsg, [], mockClient, mockUtils);
      
      clock.restore();
      assert(mockMsg.reply.calledOnce);
    });
  });

  describe('UpdateCacheCommand', function() {
    it('should create updatecache command with correct properties', function() {
      const cmd = new UpdateCacheCommand();
      assert.strictEqual(cmd.name, 'updatecache');
      assert.strictEqual(cmd.description, 'Manually update the member cache for all servers');
      assert.deepStrictEqual(cmd.permissions, ['ADMIN']);
    });

    it('should execute updatecache command successfully', async function() {
      const cmd = new UpdateCacheCommand();
      await cmd.execute(mockMsg, [], mockClient, mockUtils);
      assert(mockUtils.updateAllMemberCaches.calledOnce);
      assert(mockMsg.reply.calledTwice); // "Starting..." + "Complete"
    });
  });

  describe('CacheStatsCommand', function() {
    it('should create cachestats command with correct properties', function() {
      const cmd = new CacheStatsCommand();
      assert.strictEqual(cmd.name, 'cachestats');
      assert.strictEqual(cmd.description, 'Show statistics about the member cache system');
      assert.deepStrictEqual(cmd.permissions, ['ADMIN']);
    });

    it('should execute cachestats command successfully', async function() {
      // Setup cache data
      mockUtils.memberCache.set('guild1', new Map([['user1', {}], ['user2', {}]]));
      mockUtils.cacheTimestamps.set('guild1', Date.now());
      
      const cmd = new CacheStatsCommand();
      await cmd.execute(mockMsg, [], mockClient, mockUtils);
      assert(mockMsg.reply.calledOnce);
    });
  });

  describe('ServerStatsCommand', function() {
    it('should create serverstats command with correct properties', function() {
      const cmd = new ServerStatsCommand();
      assert.strictEqual(cmd.name, 'serverstats');
      assert.strictEqual(cmd.description, 'Show detailed server statistics');
      assert.deepStrictEqual(cmd.permissions, ['ADMIN']);
    });

    it('should execute serverstats command successfully', async function() {
      const cmd = new ServerStatsCommand();
      await cmd.execute(mockMsg, [], mockClient, mockUtils);
      assert(mockMsg.reply.calledOnce);
    });
  });

  describe('ServerInfoCommand', function() {
    it('should create serverinfo command with correct properties', function() {
      const cmd = new ServerInfoCommand();
      assert.strictEqual(cmd.name, 'serverinfo');
      assert.strictEqual(cmd.description, 'Show detailed information about a specific server');
      assert.deepStrictEqual(cmd.permissions, ['ADMIN']);
    });

    it('should execute serverinfo command for current guild', async function() {
      const cmd = new ServerInfoCommand();
      await cmd.execute(mockMsg, [], mockClient, mockUtils);
      assert(mockMsg.reply.calledOnce);
    });

    it('should execute serverinfo command for specific guild by ID', async function() {
      const cmd = new ServerInfoCommand();
      await cmd.execute(mockMsg, ['987654321'], mockClient, mockUtils);
      assert(mockMsg.reply.calledOnce);
    });

    it('should handle serverinfo command for non-existent guild', async function() {
      const cmd = new ServerInfoCommand();
      await cmd.execute(mockMsg, ['invalid_id'], mockClient, mockUtils);
      assert(mockMsg.reply.calledWith('❌ Server with ID `invalid_id` not found.'));
    });
  });

  describe('UserInfoCommand', function() {
    it('should create userinfo command with correct properties', function() {
      const cmd = new UserInfoCommand();
      assert.strictEqual(cmd.name, 'userinfo');
      assert.strictEqual(cmd.description, 'Show detailed information about a user');
      assert.deepStrictEqual(cmd.permissions, ['ADMIN']);
    });

    it('should execute userinfo command for message author', async function() {
      const cmd = new UserInfoCommand();
      await cmd.execute(mockMsg, [], mockClient, mockUtils);
      assert(mockMsg.reply.calledOnce);
    });

    it('should execute userinfo command for specific user by ID', async function() {
      const cmd = new UserInfoCommand();
      await cmd.execute(mockMsg, ['123456789'], mockClient, mockUtils);
      assert(mockClient.users.fetch.calledWith('123456789'));
      assert(mockMsg.reply.calledOnce);
    });
  });

  describe('TopServersCommand', function() {
    it('should create topservers command with correct properties', function() {
      const cmd = new TopServersCommand();
      assert.strictEqual(cmd.name, 'topservers');
      assert.strictEqual(cmd.description, 'Show top servers by member count');
      assert.deepStrictEqual(cmd.permissions, ['ADMIN']);
    });

    it('should execute topservers command successfully', async function() {
      const cmd = new TopServersCommand();
      await cmd.execute(mockMsg, [], mockClient, mockUtils);
      assert(mockMsg.reply.calledOnce);
    });

    it('should execute topservers command with custom limit', async function() {
      const cmd = new TopServersCommand();
      await cmd.execute(mockMsg, ['5'], mockClient, mockUtils);
      assert(mockMsg.reply.calledOnce);
    });
  });

  describe('RecentJoinsCommand', function() {
    it('should create recentjoins command with correct properties', function() {
      const cmd = new RecentJoinsCommand();
      assert.strictEqual(cmd.name, 'recentjoins');
      assert.strictEqual(cmd.description, 'Show recent member joins across all servers');
      assert.deepStrictEqual(cmd.permissions, ['ADMIN']);
    });

    it('should execute recentjoins command successfully', async function() {
      // Mock recent member joins
      const recentMember = {
        ...mockMember,
        joinedTimestamp: Date.now() - 1000 * 60 * 30 // 30 minutes ago
      };
      mockGuild.members.fetch.resolves(new Map([['recent_user', recentMember]]));

      const cmd = new RecentJoinsCommand();
      await cmd.execute(mockMsg, [], mockClient, mockUtils);
      assert(mockMsg.reply.calledOnce);
    });
  });

  describe('SpamStatsCommand', function() {
    it('should create spamstats command with correct properties', function() {
      const cmd = new SpamStatsCommand();
      assert.strictEqual(cmd.name, 'spamstats');
      assert.strictEqual(cmd.description, 'Show spam detection statistics');
      assert.deepStrictEqual(cmd.permissions, ['ADMIN']);
    });

    it('should execute spamstats command successfully', async function() {
      const cmd = new SpamStatsCommand();
      await cmd.execute(mockMsg, [], mockClient, mockUtils);
      assert(mockMsg.reply.calledOnce);
    });
  });

  describe('ServerIssuesCommand', function() {
    it('should create serverissues command with correct properties', function() {
      const cmd = new ServerIssuesCommand();
      assert.strictEqual(cmd.name, 'serverissues');
      assert.strictEqual(cmd.description, 'Show detailed server permission issues');
      assert.deepStrictEqual(cmd.permissions, ['ADMIN']);
    });

    it('should execute serverissues command successfully', async function() {
      // Mock a guild with missing permissions
      const limitedGuild = {
        ...mockGuild,
        members: {
          cache: new Map([['bot_id', { permissions: { has: () => false } }]])
        }
      };
      mockClient.guilds.cache.set('limited_guild', limitedGuild);
      mockClient.user.id = 'bot_id';

      const cmd = new ServerIssuesCommand();
      await cmd.execute(mockMsg, [], mockClient, mockUtils);
      assert(mockMsg.reply.calledOnce);
    });
  });

  describe('LeaveInvalidCommand', function() {
    it('should create leaveinvalid command with correct properties', function() {
      const cmd = new LeaveInvalidCommand();
      assert.strictEqual(cmd.name, 'leaveinvalid');
      assert.strictEqual(cmd.description, 'Leave servers without required permissions');
      assert.deepStrictEqual(cmd.permissions, ['ADMIN']);
    });

    it('should execute leaveinvalid command successfully', async function() {
      const cmd = new LeaveInvalidCommand();
      await cmd.execute(mockMsg, [], mockClient, mockUtils);
      assert(mockMsg.reply.calledOnce);
    });
  });

  describe('Error Handling', function() {
    it('should handle command execution errors gracefully', async function() {
      const cmd = new StatsCommand();
      // Force an error by making reply throw
      mockMsg.reply.rejects(new Error('Test error'));
      
      try {
        await cmd.execute(mockMsg, [], mockClient, mockUtils);
      } catch (error) {
        // Commands may throw errors, this is expected in test
      }
      assert(global.consoleErrorStub.called);
    });
  });
});