const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
  bed_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed', required: true },
  crop_type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CropType', required: true },
  current_quantity: { type: Number, required: true },
  initial_quantity: { type: Number, required: true },
  planted_date: { type: Date, required: true },
  cycles: {
    water: { type: Number, default: 0 },
    fertilizer: { type: Number, default: 0 },
    pesticide: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Crop', cropSchema);