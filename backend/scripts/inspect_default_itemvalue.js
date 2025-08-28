const mysql = require('mysql2/promise');

async function main() {
  const config = {
    host: '192.168.0.94',
    user: 'jitdhana',
    password: 'iT12345$',
    port: 3306,
    multipleStatements: true,
    dateStrings: true,
  };

  let connection;
  try {
    connection = await mysql.createConnection(config);
    await connection.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    await connection.query("SET collation_connection = utf8mb4_unicode_ci");

    // Verify database exists
    const [dbs] = await connection.query(
      "SHOW DATABASES LIKE 'default_itemvalue'"
    );
    if (dbs.length === 0) {
      console.log('[INFO] Database default_itemvalue not found.');
      return;
    }

    await connection.query('USE `default_itemvalue`');

    // Verify table exists
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'default_itemvalue'"
    );
    if (tables.length === 0) {
      console.log('[INFO] Table default_itemvalue.default_itemvalue not found.');
      return;
    }

    // SHOW CREATE TABLE
    const [createRows] = await connection.query(
      'SHOW CREATE TABLE `default_itemvalue`'
    );
    console.log('===== SHOW CREATE TABLE default_itemvalue =====');
    console.log(createRows[0]['Create Table']);

    // DESCRIBE
    const [descRows] = await connection.query('DESCRIBE `default_itemvalue`');
    console.log('===== DESCRIBE default_itemvalue =====');
    console.table(descRows);

    // Indexes
    const [indexRows] = await connection.query(
      'SHOW INDEX FROM `default_itemvalue`'
    );
    console.log('===== INDEXES default_itemvalue =====');
    console.table(indexRows);

    // Row count and sample
    const [[{ cnt }]] = await connection.query(
      'SELECT COUNT(*) AS cnt FROM `default_itemvalue`'
    );
    console.log(`===== ROW COUNT =====\n${cnt}`);

    const [sampleRows] = await connection.query(
      'SELECT * FROM `default_itemvalue` LIMIT 5'
    );
    console.log('===== SAMPLE ROWS (up to 5) =====');
    console.table(sampleRows);

    // Columns detail from INFORMATION_SCHEMA
    const [colDetails] = await connection.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY, EXTRA, COLUMN_COMMENT
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = 'default_itemvalue' AND TABLE_NAME = 'default_itemvalue'
       ORDER BY ORDINAL_POSITION`
    );
    console.log('===== INFORMATION_SCHEMA.COLUMNS =====');
    console.table(colDetails);

    // View check
    const [viewRows] = await connection.query(
      'SELECT * FROM `default_itemvalue`.`v_latest_sku_price` LIMIT 10'
    );
    console.log('===== VIEW v_latest_sku_price (up to 10) =====');
    console.table(viewRows);
  } catch (err) {
    console.error('[ERROR]', err.message);
    if (err && err.stack) console.error(err.stack);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
}

main();


