const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  robot_id: String,
  order_ticket: Number,
  profit: Number,
  open_date: Date,
  close_date: Date,
}, { timestamps: true, versionKey: false });


const Transaction = mongoose.model('transaction', transactionSchema);

module.exports = Transaction;
