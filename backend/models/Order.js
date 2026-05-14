const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  rawText: { type: String, required: true },
  parsedItems: [{
    name: String,
    quantity: Number,
    notes: String
  }],
  destination: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Preparing', 'Delivered'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);