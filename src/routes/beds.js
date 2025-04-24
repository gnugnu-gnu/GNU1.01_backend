const express = require('express');
const router = express.Router();
const Bed = require('../../models/Bed'); // 경로 수정
const Crop = require('../../models/Crop'); // 경로 수정

// 간단한 메모리 캐시 객체
const cache = {
  beds: null,
  lastUpdated: 0,
  ttl: 60 * 1000 // 1분 TTL (밀리초)
};

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: '베드 이름이 필요합니다' });
    }
    const bed = new Bed({ name });
    const savedBed = await bed.save();
    res.status(201).json({ message: '베드 추가 완료', id: savedBed._id });
  } catch (err) {
    console.error('Error in POST /beds:', err.message);
    res.status(500).json({ error: err.message });
  }
});

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
        .filter(c => c.bed_id && c.bed_id.toString() === bed._id.toString())
        .map(c => ({
          id: c._id,
          name: c.crop_type_id ? c.crop_type_id.name : '알 수 없음',
          quantity: c.current_quantity
        }));
    });

    cache.beds = result;
    cache.lastUpdated = now;
    console.log('Updated cache:', result);
    res.json(result);
  } catch (err) {
    console.error('Error in /beds:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;