const axios = require('axios');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

// Configuration
const config = {
  database: {
    host: process.env.DB_HOST || '192.168.0.94',
    user: process.env.DB_USER || 'jitdhana',
    password: process.env.DB_PASSWORD || 'iT12345$',
    database: 'default_itemvalue',
    port: process.env.DB_PORT || 3306
  },
  appsScript: {
    webAppUrl: process.env.GOOGLE_APPS_SCRIPT_URL
  }
};

// Logging function
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

// Database connection
async function createDatabaseConnection() {
  try {
    const connection = await mysql.createConnection({
      host: config.database.host,
      user: config.database.user,
      password: config.database.password,
      port: config.database.port
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database.database}\``);
    await connection.query(`USE \`${config.database.database}\``);

    log('Database connection established successfully');
    return connection;
  } catch (error) {
    log(`Database connection failed: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Fetch data from Google Apps Script
async function fetchAppsScriptData() {
  try {
    if (!config.appsScript.webAppUrl) {
      throw new Error('Google Apps Script Web App URL not configured');
    }

    log(`Fetching data from Google Apps Script: ${config.appsScript.webAppUrl}`);

    // Simple GET request - no API key needed
    const response = await axios.get(config.appsScript.webAppUrl, {
      timeout: 30000
    });

    if (response.data.error) {
      throw new Error(`Apps Script error: ${response.data.error}`);
    }

    const data = response.data.data;
    log(`Fetched ${data.totalRows} rows from Google Apps Script`);
    return data;
  } catch (error) {
    log(`Apps Script Error: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Unit conversion mapping
const unitConversionMap = {
  'กก.': { base_unit: 'กก.', rate: 1.0 },
  'กรัม': { base_unit: 'กก.', rate: 0.001 },
  'ตัน': { base_unit: 'กก.', rate: 1000 },
  'กระปุก': { base_unit: 'กระปุก', rate: 1.0 },
  'ขวด': { base_unit: 'ขวด', rate: 1.0 },
  'กระป๋อง': { base_unit: 'กระป๋อง', rate: 1.0 },
  'หีบ': { base_unit: 'หีบ', rate: 1.0 },
  'แพ็ค': { base_unit: 'แพ็ค', rate: 1.0 },
  'ถุง': { base_unit: 'ถุง', rate: 1.0 },
  'แกลลอน': { base_unit: 'ลิตร', rate: 3.78541 },
  'ลิตร': { base_unit: 'ลิตร', rate: 1.0 },
  'มิลลิลิตร': { base_unit: 'ลิตร', rate: 0.001 },
  'ชิ้น': { base_unit: 'ชิ้น', rate: 1.0 },
  'ตัว': { base_unit: 'ตัว', rate: 1.0 },
  'หน่วย': { base_unit: 'หน่วย', rate: 1.0 }
};

function getUnitConversion(displayUnit) {
  const normalizedUnit = displayUnit.trim();
  return unitConversionMap[normalizedUnit] || { base_unit: normalizedUnit, rate: 1.0 };
}

// Parse and validate data
function parseAppsScriptData(appsScriptData) {
  const { headers, data } = appsScriptData;
  
  const expectedColumns = {
    category: 'หมวดหมู่',
    productId: 'รหัสสินค้า',
    productName: 'ชื่อสินค้า',
    quantity: 'จำนวนนับ',
    unit: 'หน่วย',
    costPerUnit: 'ราคาทุน\nต่อหน่วย',
    value: 'มูลค่า'
  };

  const columnMappings = {};
  for (const [key, thaiName] of Object.entries(expectedColumns)) {
    const index = headers.findIndex(header => 
      header && header.toString().includes(thaiName.replace('\n', ''))
    );
    if (index === -1) {
      log(`Warning: Column '${thaiName}' not found`, 'WARN');
    } else {
      columnMappings[key] = index;
    }
  }

  const parsedData = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    try {
      const displayUnit = row[columnMappings.unit] || 'กก.';
      const unitConversion = getUnitConversion(displayUnit);
      
      const item = {
        material_id: row[columnMappings.productId] ? parseInt(row[columnMappings.productId]) : null,
        material_name: row[columnMappings.productName] || '',
        display_unit: displayUnit,
        base_unit: unitConversion.base_unit,
        display_to_base_rate: unitConversion.rate,
        price_per_unit: row[columnMappings.costPerUnit] ? parseFloat(row[columnMappings.costPerUnit]) : 0,
        currency: 'THB',
        source: 'Google Apps Script Import',
        effective_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };

      if (!item.material_id || !item.material_name || item.price_per_unit <= 0) {
        log(`Skipping row ${i + 2}: Invalid data`, 'WARN');
        continue;
      }

      parsedData.push(item);
    } catch (error) {
      log(`Error parsing row ${i + 2}: ${error.message}`, 'ERROR');
    }
  }

  log(`Successfully parsed ${parsedData.length} valid records`);
  return parsedData;
}

// Check for duplicate data
async function checkDuplicates(connection, data) {
  const duplicates = [];
  
  for (const item of data) {
    const [rows] = await connection.query(
      `SELECT id, material_id, effective_date, price_per_unit 
       FROM default_itemvalue 
       WHERE material_id = ? AND effective_date = ?`,
      [item.material_id, item.effective_date]
    );
    
    if (rows.length > 0) {
      duplicates.push({
        existing: rows[0],
        new: item
      });
    }
  }
  
  return duplicates;
}

// Insert or update data
async function insertOrUpdateData(connection, data, duplicates) {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of data) {
    const isDuplicate = duplicates.some(d => 
      d.new.material_id === item.material_id && 
      d.new.effective_date === item.effective_date
    );

    if (isDuplicate) {
      try {
        await connection.query(
          `UPDATE default_itemvalue 
           SET material_name = ?, display_unit = ?, base_unit = ?, display_to_base_rate = ?,
               price_per_unit = ?, currency = ?, source = ?, created_at = ?
           WHERE material_id = ? AND effective_date = ?`,
          [
            item.material_name,
            item.display_unit,
            item.base_unit,
            item.display_to_base_rate,
            item.price_per_unit,
            item.currency,
            item.source,
            item.created_at,
            item.material_id,
            item.effective_date
          ]
        );
        updated++;
        log(`Updated: ${item.material_name} (ID: ${item.material_id})`);
      } catch (error) {
        log(`Failed to update ${item.material_name}: ${error.message}`, 'ERROR');
        skipped++;
      }
    } else {
      try {
        await connection.query(
          `INSERT INTO default_itemvalue 
           (material_id, material_name, display_unit, base_unit, display_to_base_rate, 
            price_per_unit, currency, source, effective_date, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.material_id,
            item.material_name,
            item.display_unit,
            item.base_unit,
            item.display_to_base_rate,
            item.price_per_unit,
            item.currency,
            item.source,
            item.effective_date,
            item.created_at
          ]
        );
        inserted++;
        log(`Inserted: ${item.material_name} (ID: ${item.material_id})`);
      } catch (error) {
        log(`Failed to insert ${item.material_name}: ${error.message}`, 'ERROR');
        skipped++;
      }
    }
  }

  return { inserted, updated, skipped };
}

// Main function
async function main() {
  let connection;
  
  try {
    log('Starting Google Apps Script import process...');
    
    connection = await createDatabaseConnection();
    const appsScriptData = await fetchAppsScriptData();
    const parsedData = parseAppsScriptData(appsScriptData);
    
    if (parsedData.length === 0) {
      log('No valid data to import', 'WARN');
      return;
    }
    
    log('Checking for duplicate data...');
    const duplicates = await checkDuplicates(connection, parsedData);
    
    if (duplicates.length > 0) {
      log(`Found ${duplicates.length} duplicate records`, 'WARN');
    }
    
    log('Importing data to database...');
    const result = await insertOrUpdateData(connection, parsedData, duplicates);
    
    log('Import completed successfully!', 'SUCCESS');
    log(`Summary: ${result.inserted} inserted, ${result.updated} updated, ${result.skipped} skipped`);
    
  } catch (error) {
    log(`Import failed: ${error.message}`, 'ERROR');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      log('Database connection closed');
    }
  }
}

if (require.main === module) {
  main().catch(error => {
    log(`Unhandled error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

module.exports = {
  main,
  fetchAppsScriptData,
  parseAppsScriptData,
  checkDuplicates,
  insertOrUpdateData
};
