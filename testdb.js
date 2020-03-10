const BlacklistIDModel = require('./models/blacklistidmodel');
const config = require('./config.json')
const mongoose = require('mongoose');
const fs = require('fs');
var configids = config.blacklistedids; 
var blacklistedids = []
mongoose.connect('mongodb://' + config.db.user + ':' + config.db.pass + '@' +'localhost/nogiveaway', function (err) {

    if (err) throw err;
    // //Save config and blacklist stuff to db
    // const configtosave = new Config({
    //     _id: new mongoose.Types.ObjectId(),
    //     blacklistedavatars : configjson.blacklistedavatars,
    //     blacklistedids: configjson.blacklistedids,
    //     token:configjson.token,
    //     blacklistednames : configjson.blacklistednames,
    //     whitelistedids : configjson.whitelistedids,
    // })
    // configtosave.save();
    //Login to discord with token
    BlacklistIDModel.find({}, function(err, data){
        if(err){
          console.log(err);
        };
        if(data.length == 0) {
            console.log("nothing gotten")
        }
        // console.log(data.length)
        for(var i=0;i<data.length;i++){
            // console.log(data[i].userid.length)
            if(data[i].userid.length == 1){
                blacklistedids.push(parseFloat(data[i].userid.toString()));
            }
            else{
                blacklistedids = blacklistedids.concat(data[i].userid);
            }
        }
        saveblacklist()

      });
}, {useNewUrlParser: true});

// console.log(ServerJoin.find({"userid": 685920414580736049}))
function saveblacklist(){
    // console.log(blacklistedids)
    blacklistedids.concat(configids)
    blacklistedids = [...new Set(blacklistedids)];
    fs.writeFile("outputx.json", JSON.stringify({blacklistedids:blacklistedids},null, 4), 'utf8', function (err) {
        if (err) {
            console.log("An error occured while writing JSON Object to File.");
            return console.log(err);
        }
        console.log("JSON file has been saved.");
    });
}