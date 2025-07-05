const fs = require('fs');
const path = require('path');

/**
 * Command Manager - Handles loading and executing commands
 */
class CommandManager {
  constructor() {
    this.commands = new Map();
    this.loadCommands();
  }

  /**
   * Load all commands from the commands directory
   */
  loadCommands() {
    console.log('📁 Loading commands...');
    const commandsPath = path.join(__dirname);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => 
      file.endsWith('.js') && 
      file !== 'BaseCommand.js' && 
      file !== 'CommandManager.js'
    );

    for (const file of commandFiles) {
      try {
        const CommandClass = require(path.join(commandsPath, file));
        const command = new CommandClass();
        
        this.commands.set(command.name, command);
        console.log(`  ✅ Loaded command: ${command.name}`);
      } catch (error) {
        console.error(`  ❌ Failed to load command ${file}:`, error.message);
      }
    }

    console.log(`📁 Loaded ${this.commands.size} commands`);
  }

  /**
   * Execute a command
   * @param {string} commandName - Name of the command
   * @param {Message} msg - Discord message object
   * @param {Array} args - Command arguments
   * @param {Client} client - Discord client
   * @param {Object} utils - Utility functions and helpers
   */
  async executeCommand(commandName, msg, args, client, utils) {
    const command = this.commands.get(commandName);
    
    if (!command) {
      return false; // Command not found
    }

    // Check permissions
    if (!command.hasPermissions(msg)) {
      await msg.reply('❌ You do not have permission to use this command.');
      return true; // Command found but no permission
    }

    try {
      await command.execute(msg, args, client, utils);
      return true;
    } catch (error) {
      console.error(`Error executing command ${commandName}:`, error.message);
      await msg.reply('❌ An error occurred while executing the command.');
      return true;
    }
  }

  /**
   * Get all available commands
   * @returns {Map} - All loaded commands
   */
  getCommands() {
    return this.commands;
  }

  /**
   * Get command by name
   * @param {string} name - Command name
   * @returns {BaseCommand|undefined} - Command object or undefined
   */
  getCommand(name) {
    return this.commands.get(name);
  }
}

module.exports = CommandManager;