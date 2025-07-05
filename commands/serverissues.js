const BaseCommand = require('./BaseCommand');
const Discord = require('discord.js');

class ServerIssuesCommand extends BaseCommand {
  constructor() {
    super(
      'serverissues',
      'Show detailed server permission issues',
      '!serverissues',
      ['ADMIN']
    );
  }

  async execute(msg, args, client, utils) {
    try {
      const issues = [];
      const guilds = client.guilds.cache;
      
      for (const guild of guilds.values()) {
        try {
          const botMember = guild.members.cache.get(client.user.id);
          
          if (!botMember) {
            issues.push({
              guild,
              issue: 'Bot not found in server',
              severity: 'HIGH',
              description: 'Bot member not found in guild cache'
            });
            continue;
          }
          
          const permissions = botMember.permissions;
          const hasAdmin = permissions.has('Administrator');
          const hasBan = permissions.has('BanMembers');
          const hasManageGuild = permissions.has('ManageGuild');
          const hasViewAuditLog = permissions.has('ViewAuditLog');
          const hasManageMessages = permissions.has('ManageMessages');
          
          // Check for critical permission issues
          if (!hasAdmin && !hasBan) {
            issues.push({
              guild,
              issue: 'No ban permissions',
              severity: 'HIGH',
              description: 'Cannot ban members - core functionality disabled'
            });
          }
          
          if (!hasManageGuild) {
            issues.push({
              guild,
              issue: 'No manage guild permission',
              severity: 'MEDIUM',
              description: 'Cannot access full server management features'
            });
          }
          
          if (!hasViewAuditLog) {
            issues.push({
              guild,
              issue: 'No audit log access',
              severity: 'MEDIUM',
              description: 'Cannot view audit logs for monitoring'
            });
          }
          
          if (!hasManageMessages) {
            issues.push({
              guild,
              issue: 'No message management',
              severity: 'LOW',
              description: 'Cannot manage messages for cleanup'
            });
          }
          
          // Check for server-specific issues
          if (guild.memberCount > 10000 && !hasAdmin) {
            issues.push({
              guild,
              issue: 'Large server without admin',
              severity: 'HIGH',
              description: 'Large server requires administrator permissions for optimal performance'
            });
          }
          
          if (guild.verificationLevel < 2) {
            issues.push({
              guild,
              issue: 'Low verification level',
              severity: 'MEDIUM',
              description: 'Server verification level may allow spam accounts'
            });
          }
          
        } catch (error) {
          issues.push({
            guild,
            issue: 'Error checking permissions',
            severity: 'HIGH',
            description: `Failed to check permissions: ${error.message}`
          });
        }
      }
      
      if (issues.length === 0) {
        await msg.reply('✅ No server issues detected! All servers are properly configured.');
        return;
      }
      
      // Sort by severity
      const severityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      issues.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);
      
      const highIssues = issues.filter(i => i.severity === 'HIGH');
      const mediumIssues = issues.filter(i => i.severity === 'MEDIUM');
      const lowIssues = issues.filter(i => i.severity === 'LOW');
      
      const embed = new Discord.EmbedBuilder()
        .setColor(highIssues.length > 0 ? 0xe74c3c : (mediumIssues.length > 0 ? 0xf39c12 : 0x95a5a6))
        .setTitle('⚠️ Server Permission Issues')
        .setDescription(`Found ${issues.length} issues across ${guilds.size} servers`)
        .addFields(
          { name: '📊 Issue Summary', value: `**🔴 High Priority:** ${highIssues.length}\n**🟡 Medium Priority:** ${mediumIssues.length}\n**🔵 Low Priority:** ${lowIssues.length}`, inline: true }
        )
        .setTimestamp();
      
      // Add high priority issues
      if (highIssues.length > 0) {
        const highIssuesList = highIssues.slice(0, 10).map(issue => 
          `**${issue.guild.name}**\n└ 🔴 ${issue.issue}\n└ 👥 ${issue.guild.memberCount.toLocaleString()} members`
        ).join('\n\n');
        
        embed.addFields({
          name: '🚨 High Priority Issues',
          value: highIssuesList,
          inline: false
        });
      }
      
      // Add medium priority issues (limited)
      if (mediumIssues.length > 0) {
        const mediumIssuesList = mediumIssues.slice(0, 5).map(issue => 
          `**${issue.guild.name}** - ${issue.issue}`
        ).join('\n');
        
        embed.addFields({
          name: '⚠️ Medium Priority Issues',
          value: mediumIssuesList,
          inline: false
        });
      }
      
      if (issues.length > 15) {
        embed.setFooter({ text: `Showing first 15 of ${issues.length} issues` });
      }
      
      await msg.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error showing server issues:', error.message);
      await msg.reply('❌ Error occurred while checking server issues.');
    }
  }
}

module.exports = ServerIssuesCommand;