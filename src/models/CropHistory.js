const mongoose = require('mongoose');

const cropHistorySchema = new mongoose.Schema({
  crop_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Crop', required: true },
  type: { type: String, required: true },
  date: { type: Date, required: true },
  details: { type: Object, default: {} },
  quantity_change: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('CropHistory', cropHistorySchema);