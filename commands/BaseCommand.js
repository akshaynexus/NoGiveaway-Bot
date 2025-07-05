/**
 * Base class for all bot commands
 */
class BaseCommand {
  constructor(name, description, usage = null, permissions = []) {
    this.name = name;
    this.description = description;
    this.usage = usage || `!${name}`;
    this.permissions = permissions;
  }

  /**
   * Execute the command
   * @param {Message} msg - Discord message object
   * @param {Array} args - Command arguments
   * @param {Client} client - Discord client
   * @param {Object} utils - Utility functions and helpers
   */
  async execute(msg, args, client, utils) {
    throw new Error(`Command ${this.name} must implement execute method`);
  }

  /**
   * Check if user has required permissions
   * @param {Message} msg - Discord message object
   * @returns {boolean} - Whether user has permissions
   */
  hasPermissions(msg) {
    if (this.permissions.length === 0) return true;
    
    return this.permissions.some(permission => {
      switch (permission) {
        case 'ADMIN':
          return msg.member?.permissions.has('Administrator');
        case 'MOD':
          return msg.member?.permissions.has(['ModerateMembers', 'KickMembers', 'BanMembers']);
        case 'MANAGE_GUILD':
          return msg.member?.permissions.has('ManageGuild');
        default:
          return msg.member?.permissions.has(permission);
      }
    });
  }
}

module.exports = BaseCommand;