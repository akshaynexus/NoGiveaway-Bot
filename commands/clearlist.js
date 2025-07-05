const BaseCommand = require('./BaseCommand');

class ClearListCommand extends BaseCommand {
  constructor() {
    super(
      'clearlist',
      'Clear the current blacklist',
      '!clearlist',
      ['ADMIN']
    );
  }

  async execute(msg, args, client, utils) {
    const { clearVars } = utils;
    
    try {
      clearVars();
      await msg.reply('✅ Blacklist cleared successfully.');
    } catch (error) {
      console.error('Error clearing blacklist:', error.message);
      await msg.reply('❌ Error occurred while clearing blacklist.');
    }
  }
}

module.exports = ClearListCommand;