const BaseCommand = require('./BaseCommand');
const Discord = require('discord.js');

class HelpCommand extends BaseCommand {
  constructor() {
    super(
      'help',
      'Show all available commands',
      '!help [command]'
    );
  }

  async execute(msg, args, client, utils) {
    const { commandManager, PREFIX } = utils;
    
    try {
      const commands = commandManager.getCommands();
      
      if (args.length > 0) {
        // Show specific command help
        const commandName = args[0].toLowerCase();
        const command = commands.get(commandName);
        
        if (!command) {
          await msg.reply(`❓ Command \`${commandName}\` not found.`);
          return;
        }
        
        const embed = new Discord.EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(`📖 Help: ${command.name}`)
          .setDescription(command.description)
          .addFields(
            { name: '📝 Usage', value: `\`${command.usage}\``, inline: true },
            { name: '🔐 Permissions', value: command.permissions.length > 0 ? command.permissions.join(', ') : 'None', inline: true }
          )
          .setTimestamp();
        
        await msg.reply({ embeds: [embed] });
      } else {
        // Show all commands
        const adminCommands = [];
        const userCommands = [];
        
        commands.forEach(command => {
          const commandInfo = `\`${PREFIX}${command.name}\` - ${command.description}`;
          
          if (command.permissions.includes('ADMIN')) {
            adminCommands.push(commandInfo);
          } else {
            userCommands.push(commandInfo);
          }
        });
        
        const embed = new Discord.EmbedBuilder()
          .setColor(0x3498db)
          .setTitle('📖 NoGiveaway Bot Commands')
          .setDescription('Here are all available commands:')
          .setTimestamp();
        
        if (userCommands.length > 0) {
          embed.addFields({
            name: '👤 User Commands',
            value: userCommands.join('\n'),
            inline: false
          });
        }
        
        if (adminCommands.length > 0) {
          embed.addFields({
            name: '🔐 Admin Commands',
            value: adminCommands.join('\n'),
            inline: false
          });
        }
        
        embed.addFields({
          name: '💡 Tips',
          value: `• Use \`${PREFIX}help <command>\` for detailed help\n• Commands are case-insensitive\n• Admin commands require Administrator permission`,
          inline: false
        });
        
        await msg.reply({ embeds: [embed] });
      }
      
    } catch (error) {
      console.error('Error in help command:', error.message);
      await msg.reply('❌ Error occurred while showing help.');
    }
  }
}

module.exports = HelpCommand;