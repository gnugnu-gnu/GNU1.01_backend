const express = require('express');
const router = express.Router();
const CropType = require('../models/CropType');

router.get('/', async (req, res) => {
  try {
    const cropTypes = await CropType.find();
    res.json(cropTypes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, water_cycle, fertilizer_cycle, pesticide_cycle } = req.body;
    if (!name || !water_cycle || !fertilizer_cycle || !pesticide_cycle) {
      return res.status(400).json({ error: '모든 필드를 입력하세요' });
    }

    const cropType = new CropType({ name, water_cycle, fertilizer_cycle, pesticide_cycle });
    const savedCropType = await cropType.save();
    res.status(201).json({ message: '작물 종류 추가 완료', id: savedCropType._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const cropTypeId = req.params.id;
    await CropType.findByIdAndDelete(cropTypeId);
    res.json({ message: '작물 종류 삭제 완료' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;