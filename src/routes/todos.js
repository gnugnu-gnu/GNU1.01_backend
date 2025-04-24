const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getNextDate, getStatus } = require('../utils/dateUtils');

router.get('/', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];
  console.log('Today:', today, 'Tomorrow:', tomorrow);

  db.all(`
    SELECT c.id AS crop_id, b.name AS bed_name, ct.name AS crop_name,
           c.planted_date, ct.water_cycle, ct.fertilizer_cycle, ct.pesticide_cycle
    FROM Crops c
    JOIN Beds b ON c.bed_id = b.id
    JOIN CropTypes ct ON c.crop_type_id = ct.id
  `, [], (err, crops) => { // params가 없으므로 빈 배열
    if (err) return res.status(500).json({ error: err.message });
    console.log('Crops:', crops);

    db.all(`
      SELECT crop_id, type, date
      FROM CropHistory
      WHERE type IN ('water', 'fertilizer', 'pesticide')
    `, [], (err, history) => { // params가 없으므로 빈 배열
      if (err) return res.status(500).json({ error: err.message });
      console.log('History in todos:', JSON.stringify(history, null, 2));

      const todos = { today: [], tomorrow: [] };
      crops.forEach(crop => {
        const waterHistory = history.filter(h => h.crop_id === crop.crop_id && h.type === 'water');
        const fertilizerHistory = history.filter(h => h.crop_id === crop.crop_id && h.type === 'fertilizer');
        const pesticideHistory = history.filter(h => h.crop_id === crop.crop_id && h.type === 'pesticide');

        const lastWater = waterHistory.length > 0
          ? waterHistory.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date
          : crop.planted_date;
        const lastFertilizer = fertilizerHistory.length > 0
          ? fertilizerHistory.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date
          : crop.planted_date;
        const lastPesticide = pesticideHistory.length > 0
          ? pesticideHistory.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date
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
          { type: 'water', next: nextWater },
          { type: 'fertilizer', next: nextFertilizer },
          { type: 'pesticide', next: nextPesticide }
        ];

        tasks.forEach(task => {
          const status = getStatus(task.next, today);
          console.log(`Task ${task.type} for ${crop.crop_id}: next=${task.next}, status=${status}`);
          if (task.next <= today) {
            todos.today.push({
              crop_id: crop.crop_id,
              bed_name: crop.bed_name,
              crop_name: crop.crop_name,
              type: task.type,
              status
            });
          } else if (task.next === tomorrow) {
            todos.tomorrow.push({
              crop_id: crop.crop_id,
              bed_name: crop.bed_name,
              crop_name: crop.crop_name,
              type: task.type,
              status
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
    });
  });
});

module.exports = router;