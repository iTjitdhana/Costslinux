const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// อ่านไฟล์ config.env สำหรับฐานข้อมูล Logs แยกต่างหาก
const configPath = path.join(__dirname, '..', '..', 'config.env');
const configContent = fs.readFileSync(configPath, 'utf8');
const config = {};

configContent.split('\n').forEach(line => {
	const [key, value] = line.split('=');
	if (key && value) {
		config[key.trim()] = value.trim();
	}
});

// ใช้ชุดตัวแปร LOG_DB_* หากไม่กำหนดจะ fallback มาที่ DB_*
const pool = mysql.createPool({
	host: config.LOG_DB_HOST || config.DB_HOST,
	user: config.LOG_DB_USER || config.DB_USER,
	password: config.LOG_DB_PASSWORD || config.DB_PASSWORD,
	database: config.LOG_DB_NAME || config.DB_NAME,
	port: Number(config.LOG_DB_PORT || config.DB_PORT) || 3306,
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
	charset: 'utf8mb4',
	timezone: '+07:00',
	dateStrings: true,
	supportBigNumbers: true,
	bigNumberStrings: true
});

async function testLogsConnection() {
	try {
		const conn = await pool.getConnection();
		console.log('✅ Logs DB connected successfully!');
		conn.release();
	} catch (error) {
		console.error('❌ Logs DB connection failed:', error.message);
	}
}

async function logsQuery(sql, params = []) {
	const [rows] = await pool.execute(sql, params);
	return rows;
}

module.exports = { pool, logsQuery, testLogsConnection };


