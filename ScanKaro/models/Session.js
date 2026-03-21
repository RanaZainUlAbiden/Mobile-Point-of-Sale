const mongoose = require('mongoose');

const sessionItemSchema = new mongoose.Schema({
  barcode: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  emoji: { type: String, default: '📦' },
  qty: { type: Number, default: 1, min: 1 }
});

const sessionSchema = new mongoose.Schema({
  items: [sessionItemSchema],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Session', sessionSchema);