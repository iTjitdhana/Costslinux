const mysql = require('mysql2/promise');

async function ensureDatabase(connection, dbName) {
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;`
  );
}

async function ensureTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`default_itemvalue\`.\`default_itemvalue\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`sku_id\` int NOT NULL,
      \`sku_name\` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`sku_value\` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`sku_unit\` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`date_active\` date NOT NULL,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function columnExists(connection, schema, table, column) {
  const [rows] = await connection.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=? LIMIT 1`,
    [schema, table, column]
  );
  return rows.length > 0;
}

async function indexExists(connection, schema, table, indexName) {
  const [rows] = await connection.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND INDEX_NAME=? LIMIT 1`,
    [schema, table, indexName]
  );
  return rows.length > 0;
}

async function ensureColumns(connection) {
  const schema = 'default_itemvalue';
  const table = 'default_itemvalue';

  // Ensure staging numeric column for safe migration
  const hasStaging = await columnExists(connection, schema, table, 'sku_value_num');
  if (!hasStaging) {
    await connection.query(
      `ALTER TABLE \`${schema}\`.\`${table}\` ADD COLUMN \`sku_value_num\` DECIMAL(18,6) NULL AFTER \`sku_name\``
    );
  }

  if (!(await columnExists(connection, schema, table, 'price_per_unit'))) {
    await connection.query(
      `ALTER TABLE \`${schema}\`.\`${table}\` ADD COLUMN \`price_per_unit\` DECIMAL(18,6) NOT NULL DEFAULT 0.000000 AFTER \`sku_unit\``
    );
  }
  if (!(await columnExists(connection, schema, table, 'currency'))) {
    await connection.query(
      `ALTER TABLE \`${schema}\`.\`${table}\` ADD COLUMN \`currency\` CHAR(3) NOT NULL DEFAULT 'THB' AFTER \`price_per_unit\``
    );
  }
  if (!(await columnExists(connection, schema, table, 'source'))) {
    await connection.query(
      `ALTER TABLE \`${schema}\`.\`${table}\` ADD COLUMN \`source\` VARCHAR(100) NULL AFTER \`currency\``
    );
  }
  if (!(await columnExists(connection, schema, table, 'created_at'))) {
    await connection.query(
      `ALTER TABLE \`${schema}\`.\`${table}\` ADD COLUMN \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER \`date_active\``
    );
  }

  // Backfill staging numeric from price_per_unit or castable sku_value text
  await connection.query(`
    UPDATE \`${schema}\`.\`${table}\`
    SET \`sku_value_num\` = COALESCE(
      NULLIF(\`price_per_unit\`, 0.000000),
      CASE WHEN \`sku_value\` REGEXP '^-?[0-9]+(\\\\.[0-9]+)?$'
           THEN CAST(\`sku_value\` AS DECIMAL(18,6))
           ELSE NULL END
    )
    WHERE \`sku_value_num\` IS NULL;
  `);

  // For any remaining NULLs, set to 0.000000
  await connection.query(
    `UPDATE \`${schema}\`.\`${table}\` SET \`sku_value_num\` = 0.000000 WHERE \`sku_value_num\` IS NULL`
  );

  // Convert sku_value to DECIMAL and move data from staging
  const [colTypeRows] = await connection.query(
    `SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME='sku_value'`,
    [schema, table]
  );
  const isSkuValueText = colTypeRows.length && colTypeRows[0].DATA_TYPE !== 'decimal';
  if (isSkuValueText) {
    await connection.query(
      `ALTER TABLE \`${schema}\`.\`${table}\` MODIFY COLUMN \`sku_value\` DECIMAL(18,6) NOT NULL DEFAULT 0.000000`
    );
    await connection.query(
      `UPDATE \`${schema}\`.\`${table}\` SET \`sku_value\` = COALESCE(\`sku_value_num\`, 0.000000)`
    );
  }

  // Drop staging
  if (hasStaging) {
    await connection.query(
      `ALTER TABLE \`${schema}\`.\`${table}\` DROP COLUMN \`sku_value_num\``
    );
  } else {
    // Ensure drop even if created above
    const [stillHas] = await connection.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME='sku_value_num' LIMIT 1`,
      [schema, table]
    );
    if (stillHas.length) {
      await connection.query(
        `ALTER TABLE \`${schema}\`.\`${table}\` DROP COLUMN \`sku_value_num\``
      );
    }
  }

  // Rename columns to clearer names if not already renamed
  // sku_id -> material_id
  const [hasMaterialId] = await connection.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME='material_id' LIMIT 1`,
    [schema, table]
  );
  if (!hasMaterialId.length) {
    const [hasSkuId] = await connection.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME='sku_id' LIMIT 1`,
      [schema, table]
    );
    if (hasSkuId.length) {
      await connection.query(
        `ALTER TABLE \`${schema}\`.\`${table}\` CHANGE COLUMN \`sku_id\` \`material_id\` INT NOT NULL`
      );
    }
  }

  // sku_name -> material_name
  const [hasMaterialName] = await connection.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME='material_name' LIMIT 1`,
    [schema, table]
  );
  if (!hasMaterialName.length) {
    const [hasSkuName] = await connection.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME='sku_name' LIMIT 1`,
      [schema, table]
    );
    if (hasSkuName.length) {
      await connection.query(
        `ALTER TABLE \`${schema}\`.\`${table}\` CHANGE COLUMN \`sku_name\` \`material_name\` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL`
      );
    }
  }

  // sku_unit -> display_unit
  const [hasDisplayUnit] = await connection.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME='display_unit' LIMIT 1`,
    [schema, table]
  );
  if (!hasDisplayUnit.length) {
    const [hasSkuUnit] = await connection.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME='sku_unit' LIMIT 1`,
      [schema, table]
    );
    if (hasSkuUnit.length) {
      await connection.query(
        `ALTER TABLE \`${schema}\`.\`${table}\` CHANGE COLUMN \`sku_unit\` \`display_unit\` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL`
      );
    }
  }

  // date_active -> effective_date
  const [hasEffectiveDate] = await connection.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME='effective_date' LIMIT 1`,
    [schema, table]
  );
  if (!hasEffectiveDate.length) {
    const [hasDateActive] = await connection.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME='date_active' LIMIT 1`,
      [schema, table]
    );
    if (hasDateActive.length) {
      await connection.query(
        `ALTER TABLE \`${schema}\`.\`${table}\` CHANGE COLUMN \`date_active\` \`effective_date\` DATE NOT NULL`
      );
    }
  }

  // Ensure price_per_unit is the authoritative price column; drop old sku_value if still present
  const [hasSkuValue] = await connection.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME='sku_value' LIMIT 1`,
    [schema, table]
  );
  if (hasSkuValue.length) {
    // Copy numeric value into price_per_unit if needed
    await connection.query(
      `UPDATE \`${schema}\`.\`${table}\` SET \`price_per_unit\` = \`sku_value\` WHERE (\`price_per_unit\` IS NULL OR \`price_per_unit\` = 0.000000) AND \`sku_value\` IS NOT NULL`
    );
    // Drop sku_value
    await connection.query(
      `ALTER TABLE \`${schema}\`.\`${table}\` DROP COLUMN \`sku_value\``
    );
  }

  // Add conversion columns: base_unit and display_to_base_rate
  if (!(await columnExists(connection, schema, table, 'base_unit'))) {
    await connection.query(
      `ALTER TABLE \`${schema}\`.\`${table}\` ADD COLUMN \`base_unit\` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' AFTER \`display_unit\``
    );
  }
  if (!(await columnExists(connection, schema, table, 'display_to_base_rate'))) {
    await connection.query(
      `ALTER TABLE \`${schema}\`.\`${table}\` ADD COLUMN \`display_to_base_rate\` DECIMAL(18,6) NOT NULL DEFAULT 1.000000 AFTER \`base_unit\``
    );
  }
  // Initialize base_unit to display_unit if blank, and rate to 1 if null/zero
  await connection.query(
    `UPDATE \`${schema}\`.\`${table}\` SET \`base_unit\` = CASE WHEN \`base_unit\` IS NULL OR \`base_unit\` = '' THEN \`display_unit\` ELSE \`base_unit\` END`
  );
  await connection.query(
    `UPDATE \`${schema}\`.\`${table}\` SET \`display_to_base_rate\` = 1.000000 WHERE \`display_to_base_rate\` IS NULL OR \`display_to_base_rate\` = 0.000000`
  );
}

async function ensureIndexes(connection) {
  const schema = 'default_itemvalue';
  const table = 'default_itemvalue';
  // Drop old indexes if exist
  try { await connection.query(`DROP INDEX \`idx_sku_id_date\` ON \`${schema}\`.\`${table}\``); } catch(e) {}
  try { await connection.query(`DROP INDEX \`idx_sku_unit\` ON \`${schema}\`.\`${table}\``); } catch(e) {}
  // Create new indexes
  if (!(await indexExists(connection, schema, table, 'idx_material_id_effective_date'))) {
    await connection.query(
      `CREATE INDEX \`idx_material_id_effective_date\` ON \`${schema}\`.\`${table}\` (\`material_id\`, \`effective_date\`)`
    );
  }
  if (!(await indexExists(connection, schema, table, 'idx_display_unit'))) {
    await connection.query(
      `CREATE INDEX \`idx_display_unit\` ON \`${schema}\`.\`${table}\` (\`display_unit\`)`
    );
  }
  // Enforce uniqueness per material/unit/date to avoid duplicates
  // Drop old unique if present
  try {
    await connection.query(`ALTER TABLE \`${schema}\`.\`${table}\` DROP INDEX \`uq_sku_date_unit\``);
  } catch(e) {}
  // Add new unique
  try {
    await connection.query(
      `ALTER TABLE \`${schema}\`.\`${table}\` ADD CONSTRAINT \`uq_material_unit_date\` UNIQUE (\`material_id\`, \`display_unit\`, \`effective_date\`)`
    );
  } catch (e) {
    console.warn('Could not add unique constraint uq_material_unit_date (likely due to duplicates).');
  }
}

async function ensureView(connection) {
  // Use CREATE OR REPLACE VIEW for idempotency
  await connection.query(`
    CREATE OR REPLACE VIEW \`default_itemvalue\`.\`v_latest_material_price\` AS
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
    FROM \`default_itemvalue\`.\`default_itemvalue\` t
    JOIN (
      SELECT material_id, display_unit, MAX(effective_date) AS max_date
      FROM \`default_itemvalue\`.\`default_itemvalue\`
      GROUP BY material_id, display_unit
    ) m ON m.material_id = t.material_id
       AND m.display_unit = t.display_unit
       AND m.max_date = t.effective_date;
  `);

  // Backward-compatible view where price is exposed as sku_value (numeric)
  await connection.query(`
    -- Backward compatible view with old sku_* names
    CREATE OR REPLACE VIEW \`default_itemvalue\`.\`v_latest_sku_price\` AS
    SELECT material_id AS sku_id,
           material_name AS sku_name,
           display_unit AS sku_unit,
           base_unit,
           display_to_base_rate,
           price_per_base_unit,
           price_per_unit,
           currency,
           effective_date AS date_active,
           source,
           created_at
    FROM \`default_itemvalue\`.\`v_latest_material_price\`;

    CREATE OR REPLACE VIEW \`default_itemvalue\`.\`v_latest_sku_price_compat\` AS
    SELECT material_id AS sku_id,
           material_name AS sku_name,
           display_unit AS sku_unit,
           price_per_unit AS sku_value,
           currency,
           effective_date AS date_active,
           source,
           created_at
    FROM \`default_itemvalue\`.\`v_latest_material_price\`;
  `);
}

async function main() {
  const root = await mysql.createConnection({
    host: '192.168.0.94',
    user: 'jitdhana',
    password: 'iT12345$',
    port: 3306,
    multipleStatements: true,
    dateStrings: true,
  });
  try {
    await root.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    await root.query("SET collation_connection = utf8mb4_unicode_ci");
    await ensureDatabase(root, 'default_itemvalue');
    await ensureTable(root);
    await ensureColumns(root);
    await ensureIndexes(root);
    await ensureView(root);
    console.log('Migration completed for default_itemvalue.default_itemvalue');
  } finally {
    await root.end();
  }
}

main().catch(err => {
  console.error('Migration failed:', err.message);
  if (err && err.sql) console.error('SQL snippet:', err.sql);
  process.exit(1);
});


