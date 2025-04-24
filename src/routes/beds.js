const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 간단한 메모리 캐시 객체
const cache = {
  beds: null,
  lastUpdated: 0,
  ttl: 60 * 1000 // 1분 TTL (밀리초)
};

router.get('/', (req, res) => {
  const now = Date.now();
  if (cache.beds && (now - cache.lastUpdated) < cache.ttl) {
    console.log('Serving from cache');
    return res.json(cache.beds);
  }

  db.all('SELECT * FROM Beds', [], (err, beds) => {
    if (err) return res.status(500).json({ error: err.message });
    db.all(`
      SELECT c.id, c.bed_id, ct.name, c.current_quantity
      FROM Crops c
      JOIN CropTypes ct ON c.crop_type_id = ct.id
    `, [], (err, crops) => {
      if (err) return res.status(500).json({ error: err.message });
      const result = {};
      beds.forEach(bed => {
        result[bed.name] = crops
          .filter(c => c.bed_id === bed.id)
          .map(c => ({ id: c.id, name: c.name, quantity: c.current_quantity }));
      });
      cache.beds = result;
      cache.lastUpdated = now;
      console.log('Updated cache');
      res.json(result);
    });
  });
});

module.exports = router;