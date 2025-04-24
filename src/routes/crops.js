const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getNextDate, getStatus } = require('../utils/dateUtils');
const XLSX = require('xlsx');

// 작물 목록 반환
router.get('/', (req, res) => {
  db.all(`
    SELECT c.id, c.current_quantity, ct.name AS crop_name
    FROM Crops c
    JOIN CropTypes ct ON c.crop_type_id = ct.id
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/:id', (req, res) => {
  const cropId = req.params.id;
  const today = new Date().toISOString().split('T')[0];
  db.get(`
    SELECT c.*, ct.name, ct.water_cycle, ct.fertilizer_cycle, ct.pesticide_cycle
    FROM Crops c
    JOIN CropTypes ct ON c.crop_type_id = ct.id
    WHERE c.id = ?
  `, [cropId], (err, crop) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!crop) return res.status(404).json({ error: '작물을 찾을 수 없습니다' });
    db.all(`
      SELECT id, type, date, details, quantity_change
      FROM CropHistory
      WHERE crop_id = ?
      ORDER BY date DESC
    `, [cropId], (err, history) => {
      if (err) return res.status(500).json({ error: err.message });
      const lastWater = history.find(h => h.type === 'water')?.date || crop.planted_date;
      const lastFertilizer = history.find(h => h.type === 'fertilizer')?.date || crop.planted_date;
      const lastPesticide = history.find(h => h.type === 'pesticide')?.date || crop.planted_date;
      const nextWater = getNextDate(lastWater, crop.water_cycle);
      const nextFertilizer = getNextDate(lastFertilizer, crop.fertilizer_cycle);
      const nextPesticide = getNextDate(lastPesticide, crop.pesticide_cycle);
      const result = {
        name: crop.name,
        current_quantity: crop.current_quantity,
        initial_quantity: crop.initial_quantity,
        planted_date: crop.planted_date,
        cycles: {
          water: crop.water_cycle,
          fertilizer: crop.fertilizer_cycle,
          pesticide: crop.pesticide_cycle
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
        history
      };
      res.json(result);
    });
  });
});

router.post('/', (req, res) => {
  const { bed_id, crop_type_id, current_quantity, initial_quantity, planted_date } = req.body;
  if (!bed_id || !crop_type_id || !current_quantity || !initial_quantity || !planted_date) {
    return res.status(400).json({ error: '모든 필드를 입력하세요' });
  }
  db.run(`
    INSERT INTO Crops (bed_id, crop_type_id, current_quantity, initial_quantity, planted_date)
    VALUES (?, ?, ?, ?, ?)
    RETURNING id
  `, [bed_id, crop_type_id, current_quantity, initial_quantity, planted_date], function(err, result) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: '작물 추가 완료', id: result.lastID });
  });
});

router.post('/:id/history', (req, res) => {
  const cropId = req.params.id;
  const { type, date, details, quantity_change } = req.body;
  if (!type || !date) {
    return res.status(400).json({ error: 'type과 date는 필수입니다' });
  }
  db.run(`
    INSERT INTO CropHistory (crop_id, type, date, details, quantity_change)
    VALUES (?, ?, ?, ?, ?)
    RETURNING id
  `, [cropId, type, date, details ? JSON.stringify(details) : null, quantity_change || 0], function(err, result) {
    if (err) return res.status(500).json({ error: err.message });
    if (quantity_change) {
      db.run(`
        UPDATE Crops SET current_quantity = current_quantity + ?
        WHERE id = ?
      `, [quantity_change, cropId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: '관리 기록 추가 완료', id: result.lastID });
      });
    } else {
      res.status(201).json({ message: '관리 기록 추가 완료', id: result.lastID });
    }
  });
});

router.put('/:id', (req, res) => {
  const cropId = req.params.id;
  const { water_cycle, fertilizer_cycle, pesticide_cycle } = req.body;
  if (!water_cycle || !fertilizer_cycle || !pesticide_cycle) {
    return res.status(400).json({ error: '모든 주기를 입력하세요' });
  }
  db.run(`
    UPDATE CropTypes
    SET water_cycle = ?, fertilizer_cycle = ?, pesticide_cycle = ?
    WHERE id = (SELECT crop_type_id FROM Crops WHERE id = ?)
  `, [water_cycle, fertilizer_cycle, pesticide_cycle, cropId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '주기 수정 완료' });
  });
});

router.delete('/:id', (req, res) => {
  const cropId = req.params.id;
  db.run('DELETE FROM CropHistory WHERE crop_id = ?', [cropId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    db.run('DELETE FROM Crops WHERE id = ?', [cropId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: '작물 삭제 완료' });
    });
  });
});

router.delete('/:id/history/:historyId', (req, res) => {
  const cropId = req.params.id;
  const historyId = req.params.historyId;
  db.get('SELECT quantity_change FROM CropHistory WHERE id = ? AND crop_id = ?', [historyId, cropId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: '기록을 찾을 수 없습니다' });
    const quantityChange = row.quantity_change;
    db.run('DELETE FROM CropHistory WHERE id = ?', [historyId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      if (quantityChange) {
        db.run(`
          UPDATE Crops SET current_quantity = current_quantity - ?
          WHERE id = ?
        `, [quantityChange, cropId], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: '관리 기록 삭제 완료, 수량 복구됨' });
        });
      } else {
        res.json({ message: '관리 기록 삭제 완료' });
      }
    });
  });
});

router.get('/:id/export', (req, res) => {
  const cropId = req.params.id;

  db.get(`
    SELECT c.initial_quantity, c.planted_date, ct.name AS crop_name, b.name AS bed_name
    FROM Crops c
    JOIN CropTypes ct ON c.crop_type_id = ct.id
    JOIN Beds b ON c.bed_id = b.id
    WHERE c.id = ?
  `, [cropId], (err, crop) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!crop) return res.status(404).json({ error: '작물을 찾을 수 없습니다' });

    db.all(`
      SELECT type, date, details, quantity_change
      FROM CropHistory
      WHERE crop_id = ?
      ORDER BY date ASC
    `, [cropId], (err, history) => {
      if (err) return res.status(500).json({ error: err.message });

      const data = history.map(row => ({
        날짜: row.date,
        관리_종류: row.type,
        세부사항: row.details ? JSON.parse(row.details) : {},
        수량_변화: row.quantity_change || 0
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'History');

      const plantedDate = crop.planted_date.replace(/-/g, '');
      const fileName = `${crop.bed_name}-${crop.crop_name}-${crop.initial_quantity}-${plantedDate}.xlsx`;
      const encodedFileName = encodeURIComponent(fileName);

      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    });
  });
});

router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { water_cycle, fertilizer_cycle, pesticide_cycle } = req.body;

  db.get(`SELECT crop_type_id FROM Crops WHERE id = ?`, [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Crop not found' });

    const updates = {};
    if (water_cycle !== undefined) updates.water_cycle = water_cycle;
    if (fertilizer_cycle !== undefined) updates.fertilizer_cycle = fertilizer_cycle;
    if (pesticide_cycle !== undefined) updates.pesticide_cycle = pesticide_cycle;

    db.run(`
      UPDATE CropTypes 
      SET water_cycle = ?, fertilizer_cycle = ?, pesticide_cycle = ?
      WHERE id = ?
    `, [updates.water_cycle || row.water_cycle, updates.fertilizer_cycle || row.fertilizer_cycle, updates.pesticide_cycle || row.pesticide_cycle, row.crop_type_id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Cycles updated' });
    });
  });
});

module.exports = router;