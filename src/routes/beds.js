const express = require('express');
const router = express.Router();
const Bed = require('../models/Bed');
const Crop = require('../models/Crop');
const CropType = require('../models/CropType');

// 간단한 메모리 캐시 객체
const cache = {
  beds: null,
  lastUpdated: 0,
  ttl: 60 * 1000 // 1분 TTL (밀리초)
};

router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    if (cache.beds && (now - cache.lastUpdated) < cache.ttl) {
      console.log('Serving from cache');
      return res.json(cache.beds);
    }

    const beds = await Bed.find();
    const crops = await Crop.find().populate('crop_type_id', 'name');

    const result = {};
    beds.forEach(bed => {
      result[bed.name] = crops
        .filter(c => c.bed_id.toString() === bed._id.toString())
        .map(c => ({ id: c._id, name: c.crop_type_id.name, quantity: c.current_quantity }));
    });

    cache.beds = result;
    cache.lastUpdated = now;
    console.log('Updated cache');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;