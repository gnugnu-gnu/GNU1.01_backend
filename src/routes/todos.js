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

    const formattedCrops = crops.map(crop => ({
      crop_id: crop._id,
      bed_name: crop.bed_id.name,
      crop_name: crop.crop_type_id.name,
      planted_date: crop.planted_date.toISOString().split('T')[0],
      water_cycle: crop.crop_type_id.water_cycle,
      fertilizer_cycle: crop.crop_type_id.fertilizer_cycle,
      pesticide_cycle: crop.crop_type_id.pesticide_cycle
    }));

    console.log('Crops:', formattedCrops);
    console.log('History in todos:', JSON.stringify(history, null, 2));

    const todos = { today: [], tomorrow: [] };
    formattedCrops.forEach(crop => {
      const waterHistory = history.filter(h => h.crop_id.toString() === crop.crop_id.toString() && h.type === 'water');
      const fertilizerHistory = history.filter(h => h.crop_id.toString() === crop.crop_id.toString() && h.type === 'fertilizer');
      const pesticideHistory = history.filter(h => h.crop_id.toString() === crop.crop_id.toString() && h.type === 'pesticide');

      const lastWater = waterHistory.length > 0
        ? waterHistory.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date.toISOString().split('T')[0]
        : crop.planted_date;
      const lastFertilizer = fertilizerHistory.length > 0
        ? fertilizerHistory.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date.toISOString().split('T')[0]
        : crop.planted_date;
      const lastPesticide = pesticideHistory.length > 0
        ? pesticideHistory.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date.toISOString().split('T')[0]
        : crop.planted_date;

      const nextWater = getNextDate(lastWater, crop.water_cycle);
      const nextFertilizer = getNextDate(lastFertilizer, crop.fertilizer_cycle);
      const nextPesticide = getNextDate(lastPesticide, crop.pesticide_cycle);

      console.log(`Crop ${crop.crop_id} (${crop.crop_name}):`, {
        lastWater, nextWater, water_cycle: crop.water_cycle,
        lastFertilizer, nextFertilizer, fertilizer_cycle: crop.fertilizer_cycle,
        lastPesticide, nextPesticide, pesticide_cycle: crop.pesticide_cycle
      });

      const tasks = [
        { type: 'water', date: nextWater },
        { type: 'fertilizer', date: nextFertilizer },
        { type: 'pesticide', date: nextPesticide }
      ];

      tasks.forEach(task => {
        console.log(`Task ${task.type} for ${crop.crop_id}: date=${task.date}`);
        if (task.date <= today) {
          todos.today.push({
            crop_id: crop.crop_id,
            bed_name: crop.bed_name,
            crop_name: crop.crop_name,
            type: task.type,
            date: task.date
          });
        } else if (task.date === tomorrow) {
          todos.tomorrow.push({
            crop_id: crop.crop_id,
            bed_name: crop.bed_name,
            crop_name: crop.crop_name,
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

    console.log('Final Todos sent:', todos);
    res.json(todos);
  } catch (err) {
    console.error('Error in /todos:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;