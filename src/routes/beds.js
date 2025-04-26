const express = require('express');
const router = express.Router();
const Bed = require('../../models/Bed');
const Crop = require('../../models/Crop');

const cache = {
  beds: null,
  lastUpdated: 0,
  ttl: 60 * 1000
};

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: '베드 이름이 필요합니다' });
    }
    const bed = new Bed({ name });
    const savedBed = await bed.save();
    cache.beds = null; // 캐시 초기화
    res.status(201).json({ message: '베드 추가 완료', id: savedBed._id });
  } catch (err) {
    console.error('Error in POST /beds:', err.message);
    res.status(500).json({ error: '베드 추가 실패' });
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
    console.error('Error in GET /beds:', err.message);
    res.status(500).json({ error: '베드 목록 조회 실패' });
  }
});

router.delete('/name/:name', async (req, res) => {
  try {
    const bedName = decodeURIComponent(req.params.name);
    const bed = await Bed.findOne({ name: bedName });
    if (!bed) {
      return res.status(404).json({ error: `베드를 찾을 수 없습니다: ${bedName}` });
    }

    await Crop.deleteMany({ bed_id: bed._id });
    await Bed.deleteOne({ _id: bed._id });
    cache.beds = null;
    cache.lastUpdated = 0;

    res.json({ message: '베드 삭제 완료' });
  } catch (err) {
    console.error('Error in DELETE /beds/name:', err.message);
    res.status(500).json({ error: '베드 삭제 실패' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const bedId = req.params.id;
    const bed = await Bed.findById(bedId);
    if (!bed) {
      return res.status(404).json({ error: '베드를 찾을 수 없습니다' });
    }

    await Crop.deleteMany({ bed_id: bedId });
    await Bed.deleteOne({ _id: bedId });
    cache.beds = null;
    cache.lastUpdated = 0;

    res.json({ message: '베드 삭제 완료' });
  } catch (err) {
    console.error('Error in DELETE /beds/:id:', err.message);
    res.status(500).json({ error: '베드 삭제 실패' });
  }
});

module.exports = router;