const mongoose = require('mongoose');

/**
 * Config
 *
 * Is the config data in a mongodb model
 */
const Block = mongoose.model('Config', new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  blacklistedavatars: [{ required: true, type: String}],
  blacklistedids: [{ required: true, type: String}],
  blacklistednames : [{ required: true, type: String}],
  whitelistedids: [{ required: true, type: String}],
  token: { required: true, type: String },
  blacklistednames: [{ required: true, type: String}],
}, { _id: false, versionKey: false }), 'config');

module.exports = Block;