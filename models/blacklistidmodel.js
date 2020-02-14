const mongoose = require('mongoose');

/**
 * ServerJoin
 *
 * Is the ServerJoin data in a mongodb model
 */
const BlacklistIDModel = mongoose.model('BlacklistIDModel', new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  userid: [{ required: true, type: Number}]
}, { _id: false, versionKey: false }), 'blacklistidmodel');

module.exports = BlacklistIDModel;