const express = require('express');
const router = express.Router();
const CropType = require('../../models/CropType'); // 경로 수정

router.get('/', async (req, res) => {
  try {
    const cropTypes = await CropType.find();
    console.log('CropTypes fetched:', cropTypes);
    res.json(cropTypes);
  } catch (err) {
    console.error('Error in /crop-types:', err.message);
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
    console.error('Error in POST /crop-types:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const cropTypeId = req.params.id;
    const deletedCropType = await CropType.findByIdAndDelete(cropTypeId);
    if (!deletedCropType) return res.status(404).json({ error: '작물 종류를 찾을 수 없습니다' });
    res.json({ message: '작물 종류 삭제 완료' });
  } catch (err) {
    console.error('Error in DELETE /crop-types:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;