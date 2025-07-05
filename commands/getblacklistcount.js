const BaseCommand = require('./BaseCommand');

class GetBlacklistCountCommand extends BaseCommand {
  constructor() {
    super(
      'getblacklistcount',
      'Show current blacklist count',
      '!getblacklistcount',
      ['ADMIN']
    );
  }

  async execute(msg, args, client, utils) {
    const { blacklistedIds, banCount } = utils;
    
    try {
      const count = blacklistedIds ? blacklistedIds.length : 0;
      await msg.reply(`📊 Current blacklist count: **${count}** users | Ban count: **${banCount}**`);
    } catch (error) {
      console.error('Error getting blacklist count:', error.message);
      await msg.reply('❌ Error occurred while getting blacklist count.');
    }
  }
}

module.exports = GetBlacklistCountCommand;