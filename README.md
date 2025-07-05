# NoGiveaway-Bot

[![Actions Status](https://github.com/akshaynexus/NoGiveaway-Bot/workflows/Node.js%20CI/badge.svg)](https://github.com/akshaynexus/NoGiveaway-Bot/actions)
[![Lines of Code](https://tokei.rs/b1/github/akshaynexus/NoGiveaway-Bot)]()
[![GitHub contributors](https://img.shields.io/github/contributors/akshaynexus/NoGiveaway-Bot.svg)](https://GitHub.com/akshaynexus/NoGiveaway-Bot/graphs/contributors/)
[![GitHub issues](https://img.shields.io/github/issues/akshaynexus/NoGiveaway-Bot.svg)](https://GitHub.com/akshaynexus/NoGiveaway-Bot/issues/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

> **Advanced Discord bot for detecting and removing cryptocurrency scam bots and giveaway spammers**

NoGiveaway-Bot is a sophisticated Discord moderation bot designed to protect your server from cryptocurrency scam bots, fake giveaway accounts, and malicious users. It uses multiple detection methods including avatar hash matching, username pattern recognition, and behavioral analysis to identify and ban fraudulent accounts automatically.

## ✨ Features

### 🛡️ Automated Protection
- **Avatar Hash Detection**: Identifies scam bots using known malicious avatar hashes
- **Username Pattern Matching**: Detects fake accounts with suspicious naming patterns
- **Bot Impersonation Detection**: Identifies accounts impersonating legitimate cryptocurrency bots
- **Libra Spam Protection**: Blocks Facebook Libra cryptocurrency spam messages
- **New Account Detection**: Flags suspiciously new accounts for review

### 🔧 Advanced Management
- **Blacklist Building**: Automatically scan and build blacklists from server members
- **Bulk Banning**: Efficiently ban multiple detected accounts at once
- **Server Cleanup**: Remove the bot from invalid or suspicious servers
- **Cache Management**: Optimize performance with intelligent caching systems
- **Comprehensive Logging**: Detailed logging for all moderation actions

### 📊 Analytics & Monitoring
- **Server Statistics**: View detailed analytics about your server
- **Spam Statistics**: Track blocked spam attempts and trends
- **User Information**: Get detailed information about specific users
- **Top Servers**: See which servers are most protected
- **Recent Activity**: Monitor recent joins and suspicious activity

## 🚀 Quick Start

### Prerequisites

- **Node.js**: v16+ (LTS recommended)
- **MongoDB**: v4.4+ (Local or cloud instance)
- **Discord Bot Token**: From [Discord Developer Portal](https://discord.com/developers/applications)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/akshaynexus/NoGiveaway-Bot.git
   cd NoGiveaway-Bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the bot**
   ```bash
   cp config.json.example config.json
   # Edit config.json with your settings (see Configuration section)
   ```

4. **Set up MongoDB** (see [Database Setup](#database-setup) section)

5. **Start the bot**
   ```bash
   npm start
   ```

## ⚙️ Configuration

### Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application and bot
3. Copy the bot token to your `config.json`
4. Invite the bot to your server with Administrator permissions

### Configuration File

Edit `config.json` with your specific settings:

```json
{
  "token": "YOUR_DISCORD_BOT_TOKEN",
  "modchanelid": "YOUR_MODERATION_CHANNEL_ID",
  "db": {
    "host": "your-mongodb-host",
    "port": "27017",
    "name": "nogiveaway",
    "user": "your-db-user",
    "pass": "your-db-password"
  },
  "blacklistedavatars": [
    "avatar-hash-1",
    "avatar-hash-2"
  ],
  "whitelistedids": [
    "trusted-user-id-1",
    "trusted-user-id-2"
  ],
  "blacklistedids": [
    "banned-user-id-1",
    "banned-user-id-2"
  ],
  "blacklistednames": [
    "suspicious-username-pattern-1",
    "suspicious-username-pattern-2"
  ]
}
```

## 🗄️ Database Setup

### Option 1: Local MongoDB Installation

1. **Install MongoDB**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install mongodb

   # macOS (using Homebrew)
   brew install mongodb/brew/mongodb-community

   # Or use the provided script
   bash installmongo.sh
   ```

2. **Configure MongoDB**
   ```bash
   # Start MongoDB service
   sudo systemctl start mongodb

   # Connect to MongoDB shell
   mongo
   ```

3. **Create database and user**
   ```javascript
   use botdatabase
   db.createUser({
     user: "botuser",
     pwd: "NoGiveawayBotPass",
     roles: ["readWrite"]
   })
   ```

### Option 2: MongoDB Atlas (Cloud)

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Get your connection string
3. Update the `db` section in `config.json` with your Atlas credentials

### Initialize Database

```bash
node initdb.js
```

This command will create the necessary collections and populate initial data.

## 🎮 Commands

### Core Moderation Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `!buildblacklist` | Scan server members and build blacklist | `!buildblacklist` |
| `!getblacklistcount` | Get current blacklisted user count | `!getblacklistcount` |
| `!banblacklisted` | Ban all detected blacklisted users | `!banblacklisted` |
| `!cleanupservers` | Remove bot from invalid servers | `!cleanupservers` |
| `!clearlist` | Clear the current blacklist | `!clearlist` |

### Information Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `!help` | Show available commands | `!help [command]` |
| `!stats` | Show bot and server statistics | `!stats` |
| `!serverstats` | Show detailed server statistics | `!serverstats` |
| `!serverinfo` | Get information about a server | `!serverinfo [server_id]` |
| `!userinfo` | Get information about a user | `!userinfo [user_id]` |
| `!topservers` | Show top protected servers | `!topservers [limit]` |
| `!recentjoins` | Show recently joined users | `!recentjoins` |

### Analytics Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `!spamstats` | Show spam detection statistics | `!spamstats` |
| `!serverissues` | Identify potential server issues | `!serverissues` |
| `!cachestats` | Show cache performance statistics | `!cachestats` |
| `!updatecache` | Refresh bot cache | `!updatecache` |

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:commands      # Test command functionality
npm run test:helpers       # Test helper functions
npm run test:blacklist     # Test blacklist detection
npm run test:integration   # Test full integration
npm run test:manager       # Test command manager
```

### Test Coverage

The bot includes comprehensive test coverage for:
- ✅ Command execution and validation
- ✅ Blacklist detection algorithms
- ✅ Database operations
- ✅ Discord API interactions
- ✅ Error handling and edge cases
- ✅ Integration testing

### Development Testing

```bash
# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm run test test/command-tests.js
```

## 📁 Project Structure

```
NoGiveaway-Bot/
├── commands/              # Bot commands
│   ├── BaseCommand.js     # Base command class
│   ├── CommandManager.js  # Command management
│   ├── help.js           # Help command
│   ├── stats.js          # Statistics command
│   └── ...               # Other commands
├── helpers/              # Utility functions
│   ├── blacklistcheck.js # Blacklist detection
│   ├── discordhelper.js  # Discord utilities
│   ├── dbhelper.js       # Database operations
│   └── apihelper.js      # API helpers
├── test/                 # Test files
│   ├── command-tests.js  # Command tests
│   ├── helper-tests.js   # Helper tests
│   └── ...              # Other test files
├── config.json          # Configuration file
├── index.js             # Main bot file
├── initdb.js            # Database initialization
└── package.json         # Dependencies
```

## 🔍 Detection Methods

### Avatar Hash Detection
The bot maintains a database of known malicious avatar hashes used by scam bots. When a user joins, their avatar hash is checked against this database.

### Username Pattern Matching
Common patterns used by cryptocurrency scam bots are detected, including:
- Fake bot names (e.g., "GiveawayBot", "UpdateBot")
- Cryptocurrency-related spam names
- Suspicious character combinations and Unicode abuse

### Behavioral Analysis
- New account detection (accounts created recently)
- Rapid server joining patterns
- Suspicious message content analysis

### Bot Impersonation Detection
Detects accounts attempting to impersonate legitimate cryptocurrency bots and services.

## 🛠️ Development

### Setting Up Development Environment

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/yourusername/NoGiveaway-Bot.git
   cd NoGiveaway-Bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up development config**
   ```bash
   cp config.json.example config.dev.json
   # Configure for development
   ```

4. **Run in development mode**
   ```bash
   npm run dev
   ```

### Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Make your changes
3. Add tests for new functionality
4. Ensure all tests pass (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- Use ESLint for code linting
- Follow existing code conventions
- Add JSDoc comments for new functions
- Ensure test coverage for new features

## 📊 Performance

### Optimization Features
- **Intelligent Caching**: Reduces database queries and API calls
- **Batch Operations**: Efficiently handles multiple operations
- **Rate Limiting**: Respects Discord API rate limits
- **Memory Management**: Optimized memory usage for large servers

### Scalability
- Supports servers with 100,000+ members
- Handles multiple servers simultaneously
- Database indexing for fast queries
- Configurable performance settings

## 🔒 Security

### Data Protection
- Secure database connections
- Token encryption
- No sensitive data in logs
- GDPR-compliant data handling

### Permission Management
- Minimal required permissions
- Role-based command access
- Server-specific configurations
- Audit logging for all actions

## 📋 Logs and Debugging

### Log Files
- **debug.log**: General application logs
- **error.log**: Error messages and stack traces
- **mod.log**: Moderation actions and bans

### Log Levels
- `INFO`: General information
- `WARN`: Warning messages
- `ERROR`: Error conditions
- `DEBUG`: Detailed debugging information

### Monitoring
```bash
# View real-time logs
tail -f debug.log

# Check error logs
grep "ERROR" debug.log

# Monitor moderation actions
tail -f mod.log
```

## ❓ Troubleshooting

### Common Issues

**Bot not responding to commands**
- Check bot permissions in server
- Verify bot token is correct
- Ensure bot is online and connected

**Database connection errors**
- Verify MongoDB is running
- Check database credentials
- Confirm network connectivity

**High memory usage**
- Restart the bot periodically
- Check for memory leaks in logs
- Optimize cache settings

**False positive detections**
- Review blacklist patterns
- Add users to whitelist
- Adjust detection sensitivity

### Getting Help

- 📖 Check the [Wiki](https://github.com/akshaynexus/NoGiveaway-Bot/wiki)
- 🐛 Report bugs via [Issues](https://github.com/akshaynexus/NoGiveaway-Bot/issues)
- 💬 Join our [Discord Server](https://discord.gg/your-server)
- 📧 Contact: [your-email@example.com](mailto:your-email@example.com)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Discord.js community for the excellent library
- MongoDB team for robust database solutions
- Contributors who help improve the bot
- Server administrators who trust us with their communities

## 📈 Roadmap

### Upcoming Features
- [ ] Machine learning-based detection
- [ ] Web dashboard for management
- [ ] Multi-language support
- [ ] Advanced analytics and reporting
- [ ] Plugin system for custom detections
- [ ] Integration with other moderation bots

### Version History
- **v1.0.0**: Initial release with core functionality
- **v1.1.0**: Added comprehensive testing suite
- **v1.2.0**: Performance optimizations and caching
- **v1.3.0**: Enhanced detection algorithms

---

<div align="center">
  <b>Protecting Discord communities from cryptocurrency scams and spam</b><br>
  Made with ❤️ by <a href="https://github.com/akshaynexus">akshaynexus</a>
</div>