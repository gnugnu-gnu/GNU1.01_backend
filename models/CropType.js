const mongoose = require('mongoose');

const cropTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  water_cycle: { type: Number, required: true },
  fertilizer_cycle: { type: Number, required: true },
  pesticide_cycle: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('CropType', cropTypeSchema);