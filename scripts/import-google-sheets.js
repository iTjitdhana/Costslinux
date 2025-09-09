const { google } = require('googleapis');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../config.env' });

// Configuration
const config = {
  database: {
    host: process.env.DB_HOST || '192.168.0.94',
    user: process.env.DB_USER || 'jitdhana',
    password: process.env.DB_PASSWORD || 'iT12345$',
    database: 'default_itemvalue',
    port: process.env.DB_PORT || 3306
  },
  googleSheets: {
    credentialsPath: process.env.GOOGLE_SHEETS_CREDENTIALS_PATH || 'scripts/google-sheets-credentials.json',
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    range: process.env.GOOGLE_SHEETS_RANGE || 'A:J'
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

    // Create database if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database.database}\``);
    await connection.query(`USE \`${config.database.database}\``);

    log('Database connection established successfully');
    return connection;
  } catch (error) {
    log(`Database connection failed: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Google Sheets authentication
async function authenticateGoogleSheets() {
  try {
    const credentialsPath = path.resolve(__dirname, config.googleSheets.credentialsPath);
    
    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Credentials file not found: ${credentialsPath}`);
    }

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    log('Google Sheets authentication successful');
    return sheets;
  } catch (error) {
    log(`Google Sheets authentication failed: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Fetch data from Google Sheets
async function fetchSheetData(sheets) {
  try {
    if (!config.googleSheets.spreadsheetId) {
      throw new Error('Spreadsheet ID not configured. Please set GOOGLE_SHEETS_SPREADSHEET_ID in config.env');
    }

    log(`Fetching data from spreadsheet: ${config.googleSheets.spreadsheetId}`);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.googleSheets.spreadsheetId,
      range: config.googleSheets.range
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('No data found in spreadsheet');
    }

    log(`Fetched ${rows.length} rows from Google Sheets`);
    return rows;
  } catch (error) {
    log(`Failed to fetch sheet data: ${error.message}`, 'ERROR');
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

// Get unit conversion info
function getUnitConversion(displayUnit) {
  const normalizedUnit = displayUnit.trim();
  return unitConversionMap[normalizedUnit] || { base_unit: normalizedUnit, rate: 1.0 };
}

// Parse and validate data
function parseSheetData(rows) {
  const headers = rows[0];
  const data = rows.slice(1);
  
  log(`Headers found: ${headers.join(', ')}`);
  
  // Expected columns based on the image
  const expectedColumns = {
    category: 'หมวดหมู่',
    productId: 'รหัสสินค้า',
    productName: 'ชื่อสินค้า',
    quantity: 'จํานวนนับ',
    unit: 'หน่วย',
    costPerUnit: 'ราคาทุนต่อหน่วย',
    value: 'มูลค่า'
  };

  // Find column indices
  const columnIndices = {};
  for (const [key, thaiName] of Object.entries(expectedColumns)) {
    const index = headers.findIndex(header => header.includes(thaiName));
    if (index === -1) {
      log(`Warning: Column '${thaiName}' not found`, 'WARN');
    } else {
      columnIndices[key] = index;
    }
  }

  // Parse data rows
  const parsedData = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row.length === 0 || row.every(cell => !cell || cell.trim() === '')) {
      continue; // Skip empty rows
    }

    try {
      const displayUnit = row[columnIndices.unit] || 'กก.';
      const unitConversion = getUnitConversion(displayUnit);
      
      const item = {
        material_id: row[columnIndices.productId] ? parseInt(row[columnIndices.productId]) : null,
        material_name: row[columnIndices.productName] || '',
        display_unit: displayUnit,
        base_unit: unitConversion.base_unit,
        display_to_base_rate: unitConversion.rate,
        price_per_unit: row[columnIndices.costPerUnit] ? parseFloat(row[columnIndices.costPerUnit]) : 0,
        currency: 'THB',
        source: 'Google Sheets Import',
        effective_date: new Date().toISOString().split('T')[0], // Today's date
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };

      // Validate required fields
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
      // Update existing record
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
      // Insert new record
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
    log('Starting Google Sheets import process...');
    
    // Connect to database
    connection = await createDatabaseConnection();
    
    // Authenticate with Google Sheets
    const sheets = await authenticateGoogleSheets();
    
    // Fetch data from Google Sheets
    const sheetData = await fetchSheetData(sheets);
    
    // Parse and validate data
    const parsedData = parseSheetData(sheetData);
    
    if (parsedData.length === 0) {
      log('No valid data to import', 'WARN');
      return;
    }
    
    // Check for duplicates
    log('Checking for duplicate data...');
    const duplicates = await checkDuplicates(connection, parsedData);
    
    if (duplicates.length > 0) {
      log(`Found ${duplicates.length} duplicate records`, 'WARN');
      for (const dup of duplicates) {
        log(`Duplicate: ${dup.new.material_name} (ID: ${dup.new.material_id}) on ${dup.new.effective_date}`, 'WARN');
      }
    }
    
    // Insert or update data
    log('Importing data to database...');
    const result = await insertOrUpdateData(connection, parsedData, duplicates);
    
    // Summary
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

// Run the script
if (require.main === module) {
  main().catch(error => {
    log(`Unhandled error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

module.exports = {
  main,
  parseSheetData,
  checkDuplicates,
  insertOrUpdateData
};
