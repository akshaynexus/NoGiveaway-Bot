const BaseCommand = require('./BaseCommand');

class BanBlacklistedCommand extends BaseCommand {
  constructor() {
    super(
      'banblacklisted',
      'Ban all users in the current blacklist',
      '!banblacklisted',
      ['ADMIN']
    );
  }

  async execute(msg, args, client, utils) {
    const { DiscordUtil, blacklistedIds, banCount } = utils;
    
    try {
      if (blacklistedIds.length > 0) {
        await DiscordUtil.banBlacklisted(msg, null, banCount, blacklistedIds);
      } else {
        await msg.reply('📋 No blacklisted users found. Use `!buildblacklist` first.');
      }
    } catch (error) {
      console.error('Error in ban blacklisted command:', error.message);
      await msg.reply('❌ Error occurred while banning blacklisted users.');
    }
  }
}

module.exports = BanBlacklistedCommand;