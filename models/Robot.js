const mongoose = require('mongoose');

const robotSchema = new mongoose.Schema({
  robot_id: { type: String, unique: true },
  account_number: { type: String, unique: true },
  broker: String,
  profit: Number,
  mac: String,
  ip: String,
  symbol: String,
}, { versionKey: false });


const Robot = mongoose.model('robot', robotSchema);

module.exports = Robot;
