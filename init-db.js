const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./greenhouse.db');

db.serialize(() => {
  // 테이블 생성
  db.run('CREATE TABLE IF NOT EXISTS Beds (id INTEGER PRIMARY KEY, name TEXT UNIQUE)');
  db.run('CREATE TABLE IF NOT EXISTS CropTypes (id INTEGER PRIMARY KEY, name TEXT UNIQUE, water_cycle INTEGER, fertilizer_cycle INTEGER, pesticide_cycle INTEGER)');
  db.run('CREATE TABLE IF NOT EXISTS Crops (id INTEGER PRIMARY KEY, bed_id INTEGER, crop_type_id INTEGER, current_quantity INTEGER, initial_quantity INTEGER, planted_date TEXT, FOREIGN KEY(bed_id) REFERENCES Beds(id), FOREIGN KEY(crop_type_id) REFERENCES CropTypes(id))');
  db.run('CREATE TABLE IF NOT EXISTS CropHistory (id INTEGER PRIMARY KEY, crop_id INTEGER, type TEXT, date TEXT, details TEXT, quantity_change INTEGER, FOREIGN KEY(crop_id) REFERENCES Crops(id))');

  // 인덱스 추가
  db.run('CREATE INDEX IF NOT EXISTS idx_crops_bed_id ON Crops(bed_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_crops_crop_type_id ON Crops(crop_type_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_crophistory_crop_id ON CropHistory(crop_id)');
});

// 초기 데이터 삽입 (비동기 처리)
db.get('SELECT COUNT(*) as count FROM Beds', (err, row) => {
  if (err) {
    console.error('Error checking Beds table:', err.message);
    db.close();
    return;
  }

  if (row.count === 0) {
    let completed = 0;
    const total = 12 + 9; // 단베드 12개 + 장베드 9개

    const checkCompletion = () => {
      completed++;
      if (completed === total) {
        console.log('Initial data inserted successfully');
        db.close();
      }
    };

    for (let i = 1; i <= 12; i++) {
      db.run('INSERT INTO Beds (name) VALUES (?)', [`단베드 ${i}`], (err) => {
        if (err) console.error('Error inserting bed:', err.message);
        checkCompletion();
      });
    }
    for (let i = 1; i <= 9; i++) {
      db.run('INSERT INTO Beds (name) VALUES (?)', [`장베드 ${i}`], (err) => {
        if (err) console.error('Error inserting bed:', err.message);
        checkCompletion();
      });
    }
  } else {
    console.log('Beds table already initialized');
    db.close();
  }
});