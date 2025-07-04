const express = require("express");
("use strict");

const fs = require("fs");
const port = 3000;
let rawdata = fs.readFileSync(__dirname + "/../outputx.json");
var BLIDs = JSON.parse(rawdata);
var app = express();

function startServer() {
  app.listen(port, () => {
    console.log("Server running on port " + port);
  });
}

app.get("/blacklistids", (req, res, next) => {
  res.header("Content-Type", "application/json");
  res.send(JSON.stringify(BLIDs, null, 4));
});
app.get("/lastjoins", (req, res, next) => {
  res.header("Content-Type", "application/json");
  res.send(JSON.stringify(BLIDs, null, 4));
});
module.exports = {
  startServer,
};
