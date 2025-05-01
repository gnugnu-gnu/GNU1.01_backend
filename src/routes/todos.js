const express = require('express');
const router = express.Router();
const Crop = require('../../models/Crop');
const Bed = require('../../models/Bed');
const CropType = require('../../models/CropType');
const CropHistory = require('../../models/CropHistory');
const { getNextDate } = require('../utils/dateUtils');

router.get('/', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];
    console.log('Today:', today, 'Tomorrow:', tomorrow);

    const crops = await Crop.find()
      .populate('bed_id', 'name')
      .populate('crop_type_id', 'name water_cycle fertilizer_cycle pesticide_cycle');
    const history = await CropHistory.find({ type: { $in: ['water', 'fertilizer', 'pesticide'] } });

    const todos = { today: [], tomorrow: [] };
    crops.forEach(crop => {
      const cropData = {
        crop_id: crop._id,
        bed_name: crop.bed_id.name,
        crop_name: crop.crop_type_id.name,
        planted_date: crop.planted_date.toISOString().split('T')[0],
        water_cycle: crop.crop_type_id.water_cycle,
        fertilizer_cycle: crop.crop_type_id.fertilizer_cycle,
        pesticide_cycle: crop.crop_type_id.pesticide_cycle
      };

      const historyForCrop = history.filter(h => h.crop_id.toString() === cropData.crop_id.toString());
      const lastWater = historyForCrop.filter(h => h.type === 'water').sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date.toISOString().split('T')[0] || cropData.planted_date;
      const lastFertilizer = historyForCrop.filter(h => h.type === 'fertilizer').sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date.toISOString().split('T')[0] || cropData.planted_date;
      const lastPesticide = historyForCrop.filter(h => h.type === 'pesticide').sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date.toISOString().split('T')[0] || cropData.planted_date;

      const nextWater = getNextDate(lastWater, cropData.water_cycle);
      const nextFertilizer = getNextDate(lastFertilizer, cropData.fertilizer_cycle);
      const nextPesticide = getNextDate(lastPesticide, cropData.pesticide_cycle);

      console.log(`Crop ${cropData.crop_name}: Next Water=${nextWater}, Next Fertilizer=${nextFertilizer}, Next Pesticide=${nextPesticide}`);

      const tasks = [
        { type: 'water', date: nextWater },
        { type: 'fertilizer', date: nextFertilizer },
        { type: 'pesticide', date: nextPesticide }
      ];

      tasks.forEach(task => {
        console.log(`Task ${task.type} for ${cropData.crop_name}: Date=${task.date}`);
        if (task.date === today) {
          todos.today.push({
            crop_id: cropData.crop_id,
            bed_name: cropData.bed_name,
            crop_name: cropData.crop_name,
            type: task.type,
            date: task.date
          });
        } else if (task.date === tomorrow) {
          todos.tomorrow.push({
            crop_id: cropData.crop_id,
            bed_name: cropData.bed_name,
            crop_name: cropData.crop_name,
            type: task.type,
            date: task.date
          });
        }
      });
    });

    const sortByBedNumber = (a, b) => {
      const [typeA, numA] = a.bed_name.split(' ');
      const [typeB, numB] = b.bed_name.split(' ');
      const numAInt = parseInt(numA);
      const numBInt = parseInt(numB);
      if (typeA === '단베드' && typeB === '장베드') return -1;
      if (typeA === '장베드' && typeB === '단베드') return 1;
      return numAInt - numBInt;
    };

    todos.today.sort(sortByBedNumber);
    todos.tomorrow.sort(sortByBedNumber);

    console.log('Todos:', JSON.stringify(todos, null, 2));
    res.json(todos);
  } catch (err) {
    console.error('Error in /todos:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 주기 수정 API
router.put('/crop-type/:id', async (req, res) => {
  const { water_cycle, fertilizer_cycle, pesticide_cycle } = req.body;
  try {
    const cropType = await CropType.findByIdAndUpdate(
      req.params.id,
      { water_cycle, fertilizer_cycle, pesticide_cycle },
      { new: true }
    );
    console.log('Cycle updated:', cropType);
    res.json(cropType);
  } catch (err) {
    console.error('Error updating cycle:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 관리 작업 추가 API
router.post('/history', async (req, res) => {
  const { crop_id, type, date } = req.body;
  try {
    const newHistory = new CropHistory({ crop_id, type, date });
    await newHistory.save();
    console.log('History added:', newHistory);
    res.json(newHistory);
  } catch (err) {
    console.error('Error adding history:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;