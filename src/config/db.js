const { Pool } = require('pg');

// PostgreSQL 연결 설정
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Render의 무료 플랜에서 SSL 인증서 검증 비활성화
  }
});

// SQLite와 호환성을 위해 db 객체 생성
const db = {
  get: async (query, params, callback) => {
    try {
      const result = await pool.query(query, params);
      callback(null, result.rows[0]);
    } catch (err) {
      callback(err, null);
    }
  },
  all: async (query, params, callback) => {
    try {
      const result = await pool.query(query, params);
      callback(null, result.rows);
    } catch (err) {
      callback(err, null);
    }
  },
  run: async (query, params, callback) => {
    try {
      const result = await pool.query(query, params);
      callback(null, { lastID: result.rows[0]?.id || 0 });
    } catch (err) {
      callback(err, null);
    }
  }
};

module.exports = db;