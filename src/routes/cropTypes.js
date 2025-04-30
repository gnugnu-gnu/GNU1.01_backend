const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', (req, res) => {
    db.all('SELECT * FROM CropTypes', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/', (req, res) => {
    const { name, water_cycle, fertilizer_cycle, pesticide_cycle } = req.body;
    if (!name || !water_cycle || !fertilizer_cycle || !pesticide_cycle) {
        return res.status(400).json({ error: '모든 필드를 입력하세요' });
    }

    db.run(`
        INSERT INTO CropTypes (name, water_cycle, fertilizer_cycle, pesticide_cycle)
        VALUES (?, ?, ?, ?)
    `, [name, water_cycle, fertilizer_cycle, pesticide_cycle], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: '작물 종류 추가 완료', id: this.lastID });
    });
});

// DELETE: 작물 종류 삭제
router.delete('/:id', (req, res) => {
    const cropTypeId = req.params.id;

    db.run('DELETE FROM CropTypes WHERE id = ?', [cropTypeId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: '작물 종류 삭제 완료' });
    });
});

module.exports = router;