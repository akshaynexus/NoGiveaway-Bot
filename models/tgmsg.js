const mongoose = require("mongoose");

/**
 * TgMsg
 *
 * Is the TgMsg data in a mongodb model
 */
const TgMsg = mongoose.model(
  "TgMsg",
  new mongoose.Schema(
    {
      _id: mongoose.Schema.Types.ObjectId,
      message: { required: true, type: String },
    },
    { _id: false, versionKey: false }
  ),
  "tgmsg"
);

module.exports = TgMsg;
