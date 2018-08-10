const mongoose = require('mongoose');

const robotActionSchema = new mongoose.Schema({
  symbol: String,
  action: String,
  robot_id: Number,
  order: Number,
}, { timestamps: true, versionKey: false });

const RobotAction = mongoose.model('robot_actions', robotActionSchema);

module.exports = RobotAction;
