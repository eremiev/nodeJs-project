const mongoose = require('mongoose');

const liveSchema = new mongoose.Schema({
  robot_id: { type: Number, unique: true },
  pending_action: String,
  pending_time: Date,
  has_order: Boolean,
  stop_loss: Number,
  symbol: String,
}, { timestamps: true, versionKey: false });


const Live = mongoose.model('live', liveSchema);

module.exports = Live;
