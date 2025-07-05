const assert = require('assert');
const sinon = require('sinon');
const { describe, it, beforeEach, afterEach } = require('mocha');

// Mock Discord.js to avoid actual Discord connections
const mockDiscord = {
  Client: class MockClient {
    constructor() {
      this.user = { id: 'bot123', username: 'TestBot' };
      this.guilds = { cache: new Map() };
      this.channels = { cache: new Map() };
      this.ws = { ping: 50 };
      this.users = { fetch: sinon.stub().resolves({ id: '123', username: 'testuser' }) };
    }
    login() { return Promise.resolve(); }
    on() {}
  },
  GatewayIntentBits: {
    Guilds: 1,
    GuildMembers: 2,
    GuildMessages: 4,
    MessageContent: 8,
    GuildMessageReactions: 16
  },
  EmbedBuilder: class MockEmbedBuilder {
    constructor() {
      this.data = {};
    }
    setColor() { return this; }
    setTitle() { return this; }
    setDescription() { return this; }
    addFields() { return this; }
    setTimestamp() { return this; }
    setThumbnail() { return this; }
    setFooter() { return this; }
  }
};

// Mock the require for discord.js
require.cache[require.resolve('discord.js')] = {
  exports: mockDiscord
};

describe('Integration Tests', function() {
  let mockConfig, mockProcess;

  beforeEach(function() {
    // Mock config
    mockConfig = {
      token: 'fake_token',
      prefix: '!',
      maxListeners: 1000,
      mongoConnectionString: 'mongodb://localhost:27017/test'
    };

    // Mock process properties
    mockProcess = {
      uptime: sinon.stub().returns(3661),
      memoryUsage: sinon.stub().returns({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024
      }),
      versions: { bun: '1.0.0' },
      platform: 'linux',
      version: 'v18.0.0'
    };

    // Console methods are already stubbed globally in setup.js
    // Reset call counts for each test
    global.consoleLogStub.resetHistory();
    global.consoleErrorStub.resetHistory();

    // Replace config require
    require.cache[require.resolve('../config.json')] = {
      exports: mockConfig
    };
  });

  afterEach(function() {
    // Don't restore global stubs here - they're managed in setup.js
    // Clean up require cache
    delete require.cache[require.resolve('../config.json')];
  });

  describe('Bot Initialization', function() {
    it('should initialize command manager on startup', function() {
      const CommandManager = require('../commands/CommandManager');
      const manager = new CommandManager();
      
      assert(manager instanceof CommandManager);
      assert(manager.commands.size > 0);
    });

    it('should load all helper modules', function() {
      const BlacklistUtil = require('../helpers/blacklistcheck');
      const DiscordUtil = require('../helpers/discordhelper');
      const DatabaseUtil = require('../helpers/dbhelper');
      const ApiHelper = require('../helpers/apihelper');

      assert(typeof BlacklistUtil === 'object');
      assert(typeof DiscordUtil === 'object');
      assert(typeof DatabaseUtil === 'object');
      assert(typeof ApiHelper === 'object');
    });
  });

  describe('Full Command Flow', function() {
    let commandManager, mockMsg, mockClient, mockUtils;

    beforeEach(function() {
      const CommandManager = require('../commands/CommandManager');
      commandManager = new CommandManager();

      mockMsg = {
        author: { id: '123456789', username: 'testuser' },
        member: { 
          permissions: { has: sinon.stub().returns(true) },
          user: { id: '123456789', username: 'testuser' }
        },
        guild: { 
          id: '987654321', 
          name: 'Test Guild',
          memberCount: 100,
          channels: { cache: new Map() },
          roles: { cache: new Map() },
          members: { fetch: sinon.stub().resolves(new Map()) },
          fetchOwner: sinon.stub().resolves({ user: { username: 'owner', id: '999' } })
        },
        reply: sinon.stub().resolves(),
        content: '!help'
      };

      mockClient = {
        user: { id: 'bot123', username: 'TestBot' },
        guilds: { cache: new Map([['987654321', mockMsg.guild]]) },
        channels: { cache: new Map() },
        ws: { ping: 50 },
        users: { fetch: sinon.stub().resolves(mockMsg.author) }
      };

      mockUtils = {
        BlacklistUtil: require('../helpers/blacklistcheck'),
        DiscordUtil: require('../helpers/discordhelper'),
        DatabaseUtil: require('../helpers/dbhelper'),
        memberCache: new Map(),
        cacheTimestamps: new Map(),
        getCachedMembers: sinon.stub().resolves(new Map()),
        isCacheValid: sinon.stub().returns(true),
        updateAllMemberCaches: sinon.stub().resolves(),
        isCacheUpdating: false,
        blacklistedIds: ['999999999'],
        banCount: 5,
        clearVars: sinon.stub(),
        commandManager: commandManager,
        PREFIX: '!',
        CACHE_DURATION: 1800000
      };
    });

    it('should execute help command end-to-end', async function() {
      const result = await commandManager.executeCommand('help', mockMsg, [], mockClient, mockUtils);
      assert.strictEqual(result, true);
      assert(mockMsg.reply.calledOnce);
    });

    it('should execute stats command with real process data', async function() {
      // Use real process methods for this test
      // Console methods are already stubbed globally, no need to restore/restub

      const result = await commandManager.executeCommand('stats', mockMsg, [], mockClient, mockUtils);
      assert.strictEqual(result, true);
      assert(mockMsg.reply.calledOnce);
    });

    it('should handle command with arguments', async function() {
      const result = await commandManager.executeCommand('topservers', mockMsg, ['5'], mockClient, mockUtils);
      assert.strictEqual(result, true);
      assert(mockMsg.reply.calledOnce);
    });

    it('should handle permission checking flow', async function() {
      // Test with admin permissions
      mockMsg.member.permissions.has.returns(true);
      let result = await commandManager.executeCommand('clearlist', mockMsg, [], mockClient, mockUtils);
      assert.strictEqual(result, true);
      assert(mockUtils.clearVars.calledOnce);

      // Reset and test without admin permissions
      mockUtils.clearVars.reset();
      mockMsg.reply.reset();
      mockMsg.member.permissions.has.returns(false);
      
      result = await commandManager.executeCommand('clearlist', mockMsg, [], mockClient, mockUtils);
      assert.strictEqual(result, true);
      assert(mockMsg.reply.calledWith('❌ You do not have permission to use this command.'));
      assert(mockUtils.clearVars.notCalled);
    });
  });

  describe('Error Handling Integration', function() {
    let commandManager;

    beforeEach(function() {
      // Reset console stub history for this test suite
      global.consoleLogStub.resetHistory();
      global.consoleErrorStub.resetHistory();
      
      const CommandManager = require('../commands/CommandManager');
      commandManager = new CommandManager();
    });

    it('should handle command execution errors gracefully', async function() {
      // Create a mock command that will definitely throw an error
      const errorCommand = {
        name: 'errortest',
        description: 'Test command that throws',
        hasPermissions: () => true,
        execute: sinon.stub().rejects(new Error('Test error'))
      };
      commandManager.commands.set('errortest', errorCommand);

      const mockMsg = {
        author: { id: '123' },
        member: { permissions: { has: () => true } },
        reply: sinon.stub().resolves()
      };

      // Ensure console.error is pointing to our stub before the test
      console.error = global.consoleErrorStub;
      
      const result = await commandManager.executeCommand('errortest', mockMsg, [], {}, {});
      assert.strictEqual(result, true); // Command was found and handled
      
      assert(global.consoleErrorStub.called);
      assert(mockMsg.reply.calledWith('❌ An error occurred while executing the command.'));
    });

    it('should handle missing guild context', async function() {
      const mockMsg = {
        author: { id: '123' },
        member: { permissions: { has: () => true } },
        guild: null,
        reply: sinon.stub().resolves()
      };

      const result = await commandManager.executeCommand('buildblacklist', mockMsg, [], {}, {});
      assert.strictEqual(result, true);
      assert(mockMsg.reply.calledWith('❌ This command can only be used in a server.'));
    });
  });

  describe('Cache System Integration', function() {
    it('should integrate cache operations with commands', async function() {
      const CommandManager = require('../commands/CommandManager');
      const commandManager = new CommandManager();

      const mockCache = new Map();
      const mockTimestamps = new Map();
      
      const mockUtils = {
        memberCache: mockCache,
        cacheTimestamps: mockTimestamps,
        updateAllMemberCaches: sinon.stub().resolves(),
        isCacheUpdating: false,
        CACHE_DURATION: 1800000
      };

      const mockMsg = {
        author: { id: '123' },
        member: { permissions: { has: () => true } },
        reply: sinon.stub().resolves()
      };

      // Test cache stats command
      const result = await commandManager.executeCommand('cachestats', mockMsg, [], {}, mockUtils);
      assert.strictEqual(result, true);
      assert(mockMsg.reply.calledOnce);

      // Test update cache command  
      mockMsg.reply.reset();
      const updateResult = await commandManager.executeCommand('updatecache', mockMsg, [], {}, mockUtils);
      assert.strictEqual(updateResult, true);
      assert(mockUtils.updateAllMemberCaches.calledOnce);
    });
  });

  describe('Blacklist System Integration', function() {
    it('should integrate blacklist operations with commands', async function() {
      const CommandManager = require('../commands/CommandManager');
      const BlacklistUtil = require('../helpers/blacklistcheck');
      const commandManager = new CommandManager();

      const mockUtils = {
        BlacklistUtil: BlacklistUtil,
        blacklistedIds: ['999999999'],
        banCount: 5,
        clearVars: sinon.stub()
      };

      const mockMsg = {
        author: { id: '123' },
        member: { permissions: { has: () => true } },
        reply: sinon.stub().resolves()
      };

      // Test blacklist count command
      const result = await commandManager.executeCommand('getblacklistcount', mockMsg, [], {}, mockUtils);
      assert.strictEqual(result, true);
      assert(mockMsg.reply.calledWith('📊 Current blacklist count: **1** users | Ban count: **5**'));

      // Test clear list command
      mockMsg.reply.reset();
      const clearResult = await commandManager.executeCommand('clearlist', mockMsg, [], {}, mockUtils);
      assert.strictEqual(clearResult, true);
      assert(mockUtils.clearVars.calledOnce);
    });
  });

  describe('Performance Integration', function() {
    it('should handle multiple concurrent command executions', async function() {
      const CommandManager = require('../commands/CommandManager');
      const commandManager = new CommandManager();

      const createMockMsg = (id) => ({
        author: { id: id.toString() },
        member: { permissions: { has: () => true } },
        reply: sinon.stub().resolves()
      });

      const mockUtils = {
        commandManager: commandManager,
        PREFIX: '!'
      };

      // Execute multiple commands concurrently
      const promises = [];
      for (let i = 0; i < 10; i++) {
        const mockMsg = createMockMsg(i);
        promises.push(commandManager.executeCommand('help', mockMsg, [], {}, mockUtils));
      }

      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(result => {
        assert.strictEqual(result, true);
      });
    });

    it('should handle command execution within time limits', async function() {
      const CommandManager = require('../commands/CommandManager');
      const commandManager = new CommandManager();

      const mockMsg = {
        author: { id: '123' },
        member: { permissions: { has: () => true } },
        reply: sinon.stub().resolves()
      };

      const startTime = Date.now();
      await commandManager.executeCommand('help', mockMsg, [], {}, {});
      const endTime = Date.now();

      // Command should execute quickly (under 1 second)
      assert(endTime - startTime < 1000);
    });
  });
});