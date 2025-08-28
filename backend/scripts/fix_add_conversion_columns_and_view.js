const mysql = require('mysql2/promise');

async function columnExists(conn, schema, table, column) {
  const [rows] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=? LIMIT 1`,
    [schema, table, column]
  );
  return rows.length > 0;
}

async function main() {
  const conn = await mysql.createConnection({
    host: '192.168.0.94',
    user: 'jitdhana',
    password: 'iT12345$',
    port: 3306,
    multipleStatements: true,
  });
  try {
    await conn.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    await conn.query("SET collation_connection = utf8mb4_unicode_ci");
    await conn.query('USE `default_itemvalue`');

    const schema = 'default_itemvalue';
    const table = 'default_itemvalue';

    // Add columns if missing
    if (!(await columnExists(conn, schema, table, 'base_unit'))) {
      await conn.query(
        `ALTER TABLE \`${schema}\`.\`${table}\` ADD COLUMN \`base_unit\` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' AFTER \`display_unit\``
      );
    }
    if (!(await columnExists(conn, schema, table, 'display_to_base_rate'))) {
      await conn.query(
        `ALTER TABLE \`${schema}\`.\`${table}\` ADD COLUMN \`display_to_base_rate\` DECIMAL(18,6) NOT NULL DEFAULT 1.000000 AFTER \`base_unit\``
      );
    }

    // Initialize sensible defaults
    await conn.query(
      `UPDATE \`${schema}\`.\`${table}\` SET \`base_unit\` = CASE WHEN \`base_unit\` IS NULL OR \`base_unit\` = '' THEN \`display_unit\` ELSE \`base_unit\` END`
    );
    await conn.query(
      `UPDATE \`${schema}\`.\`${table}\` SET \`display_to_base_rate\` = 1.000000 WHERE \`display_to_base_rate\` IS NULL OR \`display_to_base_rate\` = 0.000000`
    );

    // Recreate view with new columns
    await conn.query(`
      CREATE OR REPLACE VIEW \`v_latest_material_price\` AS
      SELECT t.material_id,
             t.material_name,
             t.display_unit,
             t.base_unit,
             t.display_to_base_rate,
             CASE WHEN t.display_to_base_rate IS NULL OR t.display_to_base_rate = 0 THEN NULL
                  ELSE ROUND(t.price_per_unit / t.display_to_base_rate, 6) END AS price_per_base_unit,
             t.price_per_unit,
             t.currency,
             t.effective_date,
             t.source,
             t.created_at
      FROM \`default_itemvalue\` t
      JOIN (
        SELECT material_id, display_unit, MAX(effective_date) AS max_date
        FROM \`default_itemvalue\`
        GROUP BY material_id, display_unit
      ) m ON m.material_id = t.material_id
         AND m.display_unit = t.display_unit
         AND m.max_date = t.effective_date;
    `);

    console.log('Fixed columns and recreated view successfully.');
  } catch (e) {
    console.error('Fix failed:', e.message);
    if (e && e.sql) console.error('SQL snippet:', e.sql);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();



