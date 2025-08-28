const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node backend/scripts/run_sql_file.js <sql_file_path>');
    process.exit(1);
  }
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error('SQL file not found:', absolutePath);
    process.exit(1);
  }
  const sql = fs.readFileSync(absolutePath, 'utf8');

  const connection = await mysql.createConnection({
    host: '192.168.0.94',
    user: 'jitdhana',
    password: 'iT12345$',
    port: 3306,
    multipleStatements: true,
    dateStrings: true,
  });
  try {
    await connection.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    await connection.query("SET collation_connection = utf8mb4_unicode_ci");
    await connection.query(sql);
    console.log('SQL executed successfully:', path.basename(absolutePath));
  } finally {
    await connection.end();
  }
}

run().catch(err => {
  console.error('Failed to execute SQL:', err.message);
  if (err && err.sql) console.error('SQL snippet:', err.sql);
  process.exit(1);
});



