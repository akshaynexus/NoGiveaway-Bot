const mongoose = require("mongoose");

/**
 * ServerJoin
 *
 * Is the ServerJoin data in a mongodb model
 */
const ServerJoin = mongoose.model(
  "ServerJoin",
  new mongoose.Schema(
    {
      _id: mongoose.Schema.Types.ObjectId,
      username: { required: true, type: String },
      userid: { required: true, type: Number },
      usertimestamp: { required: true, type: Date },
      jointimestamp: { type: Date, default: Date.now },
      avatar: { required: true, type: String },
      avatarurl: { required: true, type: String },
      servername: { required: true, type: String },
      serverid: { required: true, type: Number },
    },
    { _id: false, versionKey: false }
  ),
  "serverjoin"
);

module.exports = ServerJoin;
