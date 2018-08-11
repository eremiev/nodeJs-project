const mongoose = require('mongoose');

const robotSchema = new mongoose.Schema({
  robot_id: { type: Number, unique: true },
  account_number: { type: Number, unique: true },
  broker: String,
  profit: Number,
  mac: String,
  ip: String,
  symbol: String,
  last_active: Date
}, { versionKey: false });


const Robot = mongoose.model('robot', robotSchema);

module.exports = Robot;
