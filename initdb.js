const mongoose = require('mongoose');
const configjson = require('./config.json')

// Models.
const Config = require('./models/config');
mongoose.connect('mongodb://' + config.db.user + ':' + config.db.pass + '@' +'localhost/nogiveaway',, function (err) {

    if (err) throw err;
    //Save config and blacklist stuff to db
    const configtosave = new Config({
        _id: new mongoose.Types.ObjectId(),
        blacklistedavatars : configjson.blacklistedavatars,
        blacklistedids: configjson.blacklistedids,
        token:configjson.token,
        blacklistednames : configjson.blacklistednames,
        whitelistedids : configjson.whitelistedids,
    })
    configtosave.save();    
}, {useNewUrlParser: true});
