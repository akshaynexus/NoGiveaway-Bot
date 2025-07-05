const assert = require('assert');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs');
const { describe, it, beforeEach, afterEach } = require('mocha');

// Import CommandManager and BaseCommand
const CommandManager = require('../commands/CommandManager');
const BaseCommand = require('../commands/BaseCommand');

describe('CommandManager Tests', function() {
  let commandManager;

  beforeEach(function() {
    // Console methods are already stubbed globally in setup.js
    // Reset call counts for each test
    global.consoleLogStub.resetHistory();
    global.consoleErrorStub.resetHistory();
  });

  afterEach(function() {
    // Don't restore global stubs here - they're managed in setup.js
  });

  describe('CommandManager Construction', function() {
    it('should create CommandManager instance', function() {
      commandManager = new CommandManager();
      assert(commandManager instanceof CommandManager);
      assert(commandManager.commands instanceof Map);
    });

    it('should load commands from commands directory', function() {
      commandManager = new CommandManager();
      assert(commandManager.commands.size > 0);
    });
  });

  describe('Command Loading', function() {
    beforeEach(function() {
      commandManager = new CommandManager();
    });

    it('should load all command files', function() {
      const commandsPath = path.join(__dirname, '../commands');
      const commandFiles = fs.readdirSync(commandsPath).filter(file => 
        file.endsWith('.js') && 
        file !== 'BaseCommand.js' && 
        file !== 'CommandManager.js'
      );

      // Should load at least as many commands as there are command files
      assert(commandManager.commands.size >= commandFiles.length);
    });

    it('should have specific commands loaded', function() {
      const expectedCommands = [
        'help', 'stats', 'clearlist', 'getblacklistcount',
        'buildblacklist', 'banblacklisted', 'cleanupservers',
        'updatecache', 'cachestats', 'serverstats',
        'serverinfo', 'userinfo', 'topservers',
        'recentjoins', 'spamstats', 'serverissues',
        'leaveinvalid'
      ];

      expectedCommands.forEach(cmdName => {
        assert(commandManager.commands.has(cmdName), `Should have ${cmdName} command`);
      });
    });

    it('should load commands as BaseCommand instances', function() {
      for (const [name, command] of commandManager.commands) {
        assert(command instanceof BaseCommand, `${name} should be instance of BaseCommand`);
      }
    });
  });

  describe('Command Execution', function() {
    let mockMsg, mockClient, mockUtils;

    beforeEach(function() {
      commandManager = new CommandManager();
      
      mockMsg = {
        author: { id: '123', username: 'testuser' },
        member: { permissions: { has: () => true } },
        guild: { id: '456', name: 'Test Guild' },
        reply: sinon.stub().resolves()
      };

      mockClient = {
        user: { id: 'bot123', username: 'TestBot' },
        guilds: { cache: new Map() },
        ws: { ping: 50 }
      };

      mockUtils = {
        BlacklistUtil: {},
        DiscordUtil: {},
        blacklistedIds: [],
        banCount: 0,
        clearVars: sinon.stub(),
        commandManager: commandManager,
        PREFIX: '!'
      };
    });

    it('should execute existing command', async function() {
      const result = await commandManager.executeCommand('help', mockMsg, [], mockClient, mockUtils);
      assert.strictEqual(result, true);
      assert(mockMsg.reply.calledOnce);
    });

    it('should return false for non-existent command', async function() {
      const result = await commandManager.executeCommand('nonexistent', mockMsg, [], mockClient, mockUtils);
      assert.strictEqual(result, false);
    });

    it('should check permissions before executing admin commands', async function() {
      // Mock user without admin permissions
      mockMsg.member.permissions.has = sinon.stub().returns(false);
      
      const result = await commandManager.executeCommand('clearlist', mockMsg, [], mockClient, mockUtils);
      assert.strictEqual(result, true); // Command was found and handled
      assert(mockMsg.reply.calledWith('❌ You do not have permission to use this command.'));
    });

    it('should execute command with admin permissions', async function() {
      // Mock user with admin permissions
      mockMsg.member.permissions.has = sinon.stub().returns(true);
      
      const result = await commandManager.executeCommand('clearlist', mockMsg, [], mockClient, mockUtils);
      assert.strictEqual(result, true);
      assert(mockUtils.clearVars.calledOnce);
    });

    it('should handle commands that don\'t require permissions', async function() {
      const result = await commandManager.executeCommand('help', mockMsg, [], mockClient, mockUtils);
      assert.strictEqual(result, true);
      assert(mockMsg.reply.calledOnce);
    });

    it('should handle command execution errors', async function() {
      // Mock command that throws error
      const errorCommand = {
        name: 'errortest',
        permissions: [],
        hasPermissions: () => true,
        execute: sinon.stub().rejects(new Error('Test error'))
      };
      commandManager.commands.set('errortest', errorCommand);

      const result = await commandManager.executeCommand('errortest', mockMsg, [], mockClient, mockUtils);
      assert.strictEqual(result, true); // Command was found and handled
      assert(global.consoleErrorStub.called);
      assert(mockMsg.reply.calledWith('❌ An error occurred while executing the command.'));
    });
  });

  describe('Permission Checking', function() {
    beforeEach(function() {
      commandManager = new CommandManager();
    });

    it('should check permissions via BaseCommand hasPermissions method', function() {
      const clearlistCommand = commandManager.getCommand('clearlist');
      assert(clearlistCommand);
      assert(typeof clearlistCommand.hasPermissions === 'function');
      
      // Test with admin permissions
      const adminMember = {
        permissions: { has: sinon.stub().returns(true) }
      };
      assert.strictEqual(clearlistCommand.hasPermissions({ member: adminMember }), true);
      
      // Test without admin permissions
      const normalMember = {
        permissions: { has: sinon.stub().returns(false) }
      };
      assert.strictEqual(clearlistCommand.hasPermissions({ member: normalMember }), false);
    });
  });

  describe('Command Retrieval', function() {
    beforeEach(function() {
      commandManager = new CommandManager();
    });

    it('should return commands map', function() {
      const commands = commandManager.getCommands();
      assert(commands instanceof Map);
      assert(commands.size > 0);
    });

    it('should return reference to commands map', function() {
      const commands = commandManager.getCommands();
      const originalSize = commands.size;
      
      // The current implementation returns the actual map, not a copy
      assert.strictEqual(commands, commandManager.commands);
      assert.strictEqual(commands.size, originalSize);
    });
  });

  describe('Edge Cases', function() {
    beforeEach(function() {
      commandManager = new CommandManager();
    });

    it('should handle case-sensitive command names', async function() {
      const mockMsg = {
        author: { id: '123' },
        member: { permissions: { has: () => true } },
        reply: sinon.stub().resolves()
      };

      // Commands are case-sensitive in current implementation
      const result1 = await commandManager.executeCommand('HELP', mockMsg, [], {}, {});
      const result2 = await commandManager.executeCommand('Help', mockMsg, [], {}, {});
      const result3 = await commandManager.executeCommand('help', mockMsg, [], {}, {});

      assert.strictEqual(result1, false); // Uppercase not found
      assert.strictEqual(result2, false); // Mixed case not found  
      assert.strictEqual(result3, true);  // Lowercase found
    });

    it('should handle empty command name', async function() {
      const result = await commandManager.executeCommand('', {}, [], {}, {});
      assert.strictEqual(result, false);
    });

    it('should handle null command name', async function() {
      const result = await commandManager.executeCommand(null, {}, [], {}, {});
      assert.strictEqual(result, false);
    });

    it('should handle undefined command name', async function() {
      const result = await commandManager.executeCommand(undefined, {}, [], {}, {});
      assert.strictEqual(result, false);
    });
  });
});