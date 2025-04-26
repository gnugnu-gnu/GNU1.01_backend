const express = require('express');
const router = express.Router();
const Crop = require('../../models/Crop');
const CropType = require('../../models/CropType');
const CropHistory = require('../../models/CropHistory');
const Bed = require('../../models/Bed');
const { getNextDate, getStatus } = require('../utils/dateUtils');
const XLSX = require('xlsx');

router.get('/', async (req, res) => {
  try {
    const crops = await Crop.find().populate('crop_type_id', 'name');
    const result = crops.map(crop => ({
      id: crop._id,
      crop_name: crop.crop_type_id.name,
      current_quantity: crop.current_quantity
    }));
    res.json(result);
  } catch (err) {
    console.error('Error in GET /crops:', err.message);
    res.status(500).json({ error: '작물 목록 조회 실패' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const cropId = req.params.id;
    const today = new Date().toISOString().split('T')[0];
    const crop = await Crop.findById(cropId).populate('crop_type_id', 'name water_cycle fertilizer_cycle pesticide_cycle');
    if (!crop) return res.status(404).json({ error: '작물을 찾을 수 없습니다' });

    const history = await CropHistory.find({ crop_id: cropId }).sort({ date: -1 });

    const lastWater = history.find(h => h.type === 'water')?.date || crop.planted_date;
    const lastFertilizer = history.find(h => h.type === 'fertilizer')?.date || crop.planted_date;
    const lastPesticide = history.find(h => h.type === 'pesticide')?.date || crop.planted_date;

    const nextWater = getNextDate(lastWater.toISOString().split('T')[0], crop.cycles.water || crop.crop_type_id.water_cycle);
    const nextFertilizer = getNextDate(lastFertilizer.toISOString().split('T')[0], crop.cycles.fertilizer || crop.crop_type_id.fertilizer_cycle);
    const nextPesticide = getNextDate(lastPesticide.toISOString().split('T')[0], crop.cycles.pesticide || crop.crop_type_id.pesticide_cycle);

    const result = {
      name: crop.crop_type_id.name,
      current_quantity: crop.current_quantity,
      initial_quantity: crop.initial_quantity,
      planted_date: crop.planted_date.toISOString().split('T')[0],
      cycles: {
        water: crop.cycles.water || crop.crop_type_id.water_cycle,
        fertilizer: crop.cycles.fertilizer || crop.crop_type_id.fertilizer_cycle,
        pesticide: crop.cycles.pesticide || crop.crop_type_id.pesticide_cycle
      },
      next: {
        water: nextWater,
        fertilizer: nextFertilizer,
        pesticide: nextPesticide
      },
      nextStatus: {
        water: getStatus(nextWater, today),
        fertilizer: getStatus(nextFertilizer, today),
        pesticide: getStatus(nextPesticide, today)
      },
      history: history.map(h => ({
        id: h._id,
        type: h.type,
        date: h.date.toISOString().split('T')[0],
        details: h.details,
        quantity_change: h.quantity_change
      }))
    };
    res.json(result);
  } catch (err) {
    console.error('Error in GET /crops/:id:', err.message);
    res.status(500).json({ error: '작물 조회 실패' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { bed_id, crop_type_id, current_quantity, initial_quantity, planted_date } = req.body;

    if (!bed_id || !crop_type_id || !current_quantity || !initial_quantity || !planted_date) {
      return res.status(400).json({ error: '모든 필드를 입력하세요: bed_id, crop_type_id, current_quantity, initial_quantity, planted_date' });
    }

    let bed;
    if (typeof bed_id === 'number' || !isNaN(parseInt(bed_id))) {
      const bedNumber = parseInt(bed_id);
      bed = await Bed.findOne({ $or: [{ name: `단베드 ${bedNumber}` }, { name: `장베드 ${bedNumber}` }] });
      if (!bed) {
        return res.status(400).json({ error: `베드를 찾을 수 없습니다: 단베드 ${bedNumber} 또는 장베드 ${bedNumber}` });
      }
    } else {
      bed = await Bed.findById(bed_id);
      if (!bed) {
        return res.status(400).json({ error: '유효하지 않은 bed_id' });
      }
    }

    const cropType = await CropType.findById(crop_type_id);
    if (!cropType) {
      return res.status(400).json({ error: '유효하지 않은 crop_type_id' });
    }

    const crop = new Crop({
      bed_id: bed._id,
      crop_type_id,
      current_quantity,
      initial_quantity,
      planted_date: new Date(planted_date),
      cycles: {
        water: cropType.water_cycle,
        fertilizer: cropType.fertilizer_cycle,
        pesticide: cropType.pesticide_cycle
      }
    });

    const savedCrop = await crop.save();
    res.status(201).json({ message: '작물 추가 완료', id: savedCrop._id });
  } catch (err) {
    console.error('Error in POST /crops:', err.message);
    res.status(500).json({ error: `작물 추가 실패: ${err.message}` });
  }
});

router.post('/:id/history', async (req, res) => {
  try {
    const cropId = req.params.id;
    const { type, date, details, quantity_change } = req.body;
    if (!type || !date) {
      return res.status(400).json({ error: 'type과 date는 필수입니다' });
    }

    const history = new CropHistory({
      crop_id: cropId,
      type,
      date: new Date(date),
      details: details || {},
      quantity_change: quantity_change || 0
    });
    const savedHistory = await history.save();

    if (quantity_change) {
      await Crop.findByIdAndUpdate(cropId, {
        $inc: { current_quantity: quantity_change }
      });
    }

    res.status(201).json({ message: '관리 기록 추가 완료', id: savedHistory._id });
  } catch (err) {
    console.error('Error in POST /crops/:id/history:', err.message);
    res.status(500).json({ error: '관리 기록 추가 실패' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const cropId = req.params.id;
    await CropHistory.deleteMany({ crop_id: cropId });
    await Crop.findByIdAndDelete(cropId);
    res.json({ message: '작물 삭제 완료' });
  } catch (err) {
    console.error('Error in DELETE /crops/:id:', err.message);
    res.status(500).json({ error: '작물 삭제 실패' });
  }
});

router.delete('/:id/history/:historyId', async (req, res) => {
  try {
    const cropId = req.params.id;
    const historyId = req.params.historyId;

    const history = await CropHistory.findOne({ _id: historyId, crop_id: cropId });
    if (!history) return res.status(404).json({ error: '기록을 찾을 수 없습니다' });

    const quantityChange = history.quantity_change;
    await CropHistory.findByIdAndDelete(historyId);

    if (quantityChange) {
      await Crop.findByIdAndUpdate(cropId, {
        $inc: { current_quantity: -quantityChange }
      });
      res.json({ message: '관리 기록 삭제 완료, 수량 복구됨' });
    } else {
      res.json({ message: '관리 기록 삭제 완료' });
    }
  } catch (err) {
    console.error('Error in DELETE /crops/:id/history/:historyId:', err.message);
    res.status(500).json({ error: '관리 기록 삭제 실패' });
  }
});

router.get('/:id/export', async (req, res) => {
  try {
    const cropId = req.params.id;

    const crop = await Crop.findById(cropId)
      .populate('crop_type_id', 'name')
      .populate('bed_id', 'name');
    if (!crop) return res.status(404).json({ error: '작물을 찾을 수 없습니다' });

    const history = await CropHistory.find({ crop_id: cropId }).sort({ date: 1 });

    const data = history.map(row => ({
      날짜: row.date.toISOString().split('T')[0],
      관리_종류: row.type,
      세부사항: row.details,
      수량_변화: row.quantity_change || 0
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'History');

    const plantedDate = crop.planted_date.toISOString().split('T')[0].replace(/-/g, '');
    const fileName = `${crop.bed_id.name}-${crop.crop_type_id.name}-${crop.initial_quantity}-${plantedDate}.xlsx`;
    const encodedFileName = encodeURIComponent(fileName);

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Error in GET /crops/:id/export:', err.message);
    res.status(500).json({ error: '엑셀 내보내기 실패' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const cropId = req.params.id;
    const { water_cycle, fertilizer_cycle, pesticide_cycle } = req.body;

    const crop = await Crop.findById(cropId);
    if (!crop) return res.status(404).json({ error: '작물을 찾을 수 없습니다' });

    const updates = {};
    if (water_cycle !== undefined) updates['cycles.water'] = water_cycle;
    if (fertilizer_cycle !== undefined) updates['cycles.fertilizer'] = fertilizer_cycle;
    if (pesticide_cycle !== undefined) updates['cycles.pesticide'] = pesticide_cycle;

    await Crop.findByIdAndUpdate(cropId, { $set: updates });
    res.json({ message: '주기 수정 완료' });
  } catch (err) {
    console.error('Error in PATCH /crops/:id:', err.message);
    res.status(500).json({ error: '주기 수정 실패' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const cropId = req.params.id;
    const { water_cycle, fertilizer_cycle, pesticide_cycle } = req.body;

    const crop = await Crop.findById(cropId);
    if (!crop) return res.status(404).json({ error: '작물을 찾을 수 없습니다' });

    const updates = {};
    if (water_cycle !== undefined) updates['cycles.water'] = water_cycle;
    if (fertilizer_cycle !== undefined) updates['cycles.fertilizer'] = fertilizer_cycle;
    if (pesticide_cycle !== undefined) updates['cycles.pesticide'] = pesticide_cycle;

    await Crop.findByIdAndUpdate(cropId, { $set: updates });
    res.json({ message: '주기 수정 완료' });
  } catch (err) {
    console.error('Error in PUT /crops/:id:', err.message);
    res.status(500).json({ error: '주기 수정 실패' });
  }
});

module.exports = router;