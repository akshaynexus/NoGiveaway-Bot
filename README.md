## NoGiveaway-Bot by akshaynexus

## How to setup mongodb for bot
- Install mongodb from the ```installmongo.sh``` bash script with ```bash installmongo.sh```
- Execute ```mongo``` in the terminal to open and connect to local mongodb.
- Execute the following commands:
```
use botdatabase
db.createUser( { user: "botuser", pwd: "NoGiveawayBotPass", roles: [ "readWrite" ] } )
```
- The following steps above create a db named botdatabase and adds the botuser as authorized user to read and write to the db.

## How to add initial config data to the mongodb database
- Edit the config.json with appropriate mongodb auth details.
- run ``` node initdb.js```.
- Once done it should fill db and collections as needed.

## How to run the bot
- run ```npm install``` To install the dependencies in package.json
- Edit config.json with the proper discord bot token as given from discord.
- run the bot with ```node index.js```.

## Where is the debug log located?
The debug log is ocated in the smae directory as the index.js file which is in the root of the nogiveaway-bot directory.

## Recommended version of nodejs
The latest LTS versions are best to be used with the bot,albeith the latest v13.x versions also work fine currently.

## Is the bot scaleable?
This bot was initially writting to just ban off known avatar hashes,but is in process of adding db connections to allow the bot to autodetect new avatar hases of spam accs and perform a cleanupserver command.Right now it is not scalabel to more than 1 server per request,but this is to be changed once db integration is done and cluster system is setup.
