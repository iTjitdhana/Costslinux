const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// อ่านไฟล์ config.env
const configPath = path.join(__dirname, '..', '..', 'config.env');
const configContent = fs.readFileSync(configPath, 'utf8');
const config = {};

configContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    config[key.trim()] = value.trim();
  }
});

// สร้าง connection pool สำหรับฐานข้อมูล default_itemvalue
const defaultItemvaluePool = mysql.createPool({
  host: config.DB_HOST,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: 'default_itemvalue', // ใช้ฐานข้อมูล default_itemvalue โดยตรง
  port: config.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+07:00',
  dateStrings: true,
  supportBigNumbers: true,
  bigNumberStrings: true
});

// ทดสอบการเชื่อมต่อ
async function testConnection() {
  try {
    const connection = await defaultItemvaluePool.getConnection();
    // Enforce session collation/charset to avoid mix errors
    await connection.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    await connection.query("SET collation_connection = utf8mb4_unicode_ci");
    console.log('✅ Default Itemvalue Database connected successfully!');
    connection.release();
  } catch (error) {
    console.error('❌ Default Itemvalue Database connection failed:', error.message);
    process.exit(1);
  }
}

// ฟังก์ชันสำหรับ query ข้อมูล
async function query(sql, params = []) {
  try {
    const connection = await defaultItemvaluePool.getConnection();
    try {
      await connection.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
      await connection.query("SET collation_connection = utf8mb4_unicode_ci");
      const [rows] = await connection.execute(sql, params);
      return rows;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Default Itemvalue Database query error:', error);
    throw error;
  }
}

// ฟังก์ชันสำหรับ query ข้อมูลแบบ transaction
async function transaction(callback) {
  const connection = await defaultItemvaluePool.getConnection();
  try {
    await connection.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    await connection.query("SET collation_connection = utf8mb4_unicode_ci");
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool: defaultItemvaluePool,
  query,
  transaction,
  testConnection
};

