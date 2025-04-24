const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000;
app.listen(port, () => {
   console.log(`Server running on port ${port}`);
});

const bedsRouter = require('./routes/beds');
const cropsRouter = require('./routes/crops');
const todosRouter = require('./routes/todos');
const cropTypesRouter = require('./routes/cropTypes');

// 라우터 타입 확인
console.log('bedsRouter:', typeof bedsRouter, bedsRouter);
console.log('cropsRouter:', typeof cropsRouter, cropsRouter);
console.log('todosRouter:', typeof todosRouter, todosRouter);
console.log('cropTypesRouter:', typeof cropTypesRouter, cropTypesRouter);

app.use(cors());
app.use(express.json());
app.use('/beds', bedsRouter);
app.use('/crops', cropsRouter);
app.use('/todos', todosRouter);
app.use('/crop-types', cropTypesRouter);

app.listen(3000, () => {
    console.log('Server running on port 3000');
});

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const initTables = async () => {
  try {
    // Beds 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Beds (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL
      )
    `);
    // CropTypes 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS CropTypes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        water_cycle INTEGER NOT NULL,
        fertilizer_cycle INTEGER NOT NULL,
        pesticide_cycle INTEGER NOT NULL
      )
    `);
    // Crops 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Crops (
        id SERIAL PRIMARY KEY,
        bed_id INTEGER NOT NULL,
        crop_type_id INTEGER NOT NULL,
        current_quantity INTEGER NOT NULL,
        initial_quantity INTEGER NOT NULL,
        planted_date DATE NOT NULL,
        FOREIGN KEY (bed_id) REFERENCES Beds(id),
        FOREIGN KEY (crop_type_id) REFERENCES CropTypes(id)
      )
    `);
    // CropHistory 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS CropHistory (
        id SERIAL PRIMARY KEY,
        crop_id INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        details JSONB,
        quantity_change INTEGER,
        FOREIGN KEY (crop_id) REFERENCES Crops(id)
      )
    `);
    console.log("Tables created successfully");
  } catch (err) {
    console.error("Error creating tables:", err);
  }
};

initTables();