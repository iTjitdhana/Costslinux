const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../config.env' });

// Configuration
const config = {
  database: {
    host: process.env.DB_HOST || '192.168.0.94',
    user: process.env.DB_USER || 'jitdhana',
    password: process.env.DB_PASSWORD || 'iT12345$',
    database: 'default_itemvalue',
    port: process.env.DB_PORT || 3306
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

    log('Database connection established successfully');
    return connection;
  } catch (error) {
    log(`Database connection failed: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Check database exists
async function checkDatabase(connection) {
  try {
    const [rows] = await connection.query("SHOW DATABASES LIKE 'default_itemvalue'");
    if (rows.length === 0) {
      log('Database default_itemvalue does not exist', 'WARN');
      return false;
    }
    
    log('Database default_itemvalue exists');
    await connection.query('USE `default_itemvalue`');
    return true;
  } catch (error) {
    log(`Error checking database: ${error.message}`, 'ERROR');
    return false;
  }
}

// Check table structure
async function checkTableStructure(connection) {
  try {
    const [rows] = await connection.query("SHOW TABLES LIKE 'default_itemvalue'");
    if (rows.length === 0) {
      log('Table default_itemvalue does not exist', 'WARN');
      return false;
    }
    
    log('Table default_itemvalue exists');
    
    // Get table structure
    const [columns] = await connection.query('DESCRIBE `default_itemvalue`');
    log('Table structure:');
    columns.forEach(col => {
      log(`  ${col.Field} - ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });
    
    return true;
  } catch (error) {
    log(`Error checking table structure: ${error.message}`, 'ERROR');
    return false;
  }
}

// Check data count
async function checkDataCount(connection) {
  try {
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM `default_itemvalue`');
    const count = rows[0].count;
    log(`Total records in table: ${count}`);
    
    if (count > 0) {
      // Get sample data
      const [sampleData] = await connection.query('SELECT * FROM `default_itemvalue` LIMIT 5');
      log('Sample data:');
      sampleData.forEach((row, index) => {
        log(`  Record ${index + 1}:`);
        log(`    ID: ${row.id}`);
        log(`    Material ID: ${row.material_id}`);
        log(`    Material Name: ${row.material_name}`);
        log(`    Display Unit: ${row.display_unit}`);
        log(`    Base Unit: ${row.base_unit}`);
        log(`    Display to Base Rate: ${row.display_to_base_rate}`);
        log(`    Price per Unit: ${row.price_per_unit}`);
        log(`    Currency: ${row.currency}`);
        log(`    Source: ${row.source}`);
        log(`    Effective Date: ${row.effective_date}`);
        log(`    Created At: ${row.created_at}`);
      });
    }
    
    return count;
  } catch (error) {
    log(`Error checking data count: ${error.message}`, 'ERROR');
    return 0;
  }
}

// Check for duplicates
async function checkDuplicates(connection) {
  try {
    const [rows] = await connection.query(`
      SELECT material_id, effective_date, COUNT(*) as count
      FROM default_itemvalue 
      GROUP BY material_id, effective_date 
      HAVING COUNT(*) > 1
    `);
    
    if (rows.length > 0) {
      log(`Found ${rows.length} duplicate combinations:`, 'WARN');
      rows.forEach(row => {
        log(`  Material ID: ${row.material_id}, Effective Date: ${row.effective_date}, Count: ${row.count}`);
      });
    } else {
      log('No duplicate records found');
    }
    
    return rows.length;
  } catch (error) {
    log(`Error checking duplicates: ${error.message}`, 'ERROR');
    return 0;
  }
}

// Check recent data
async function checkRecentData(connection) {
  try {
    const [rows] = await connection.query(`
      SELECT material_id, material_name, display_unit, price_per_unit, effective_date, created_at
      FROM default_itemvalue 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    if (rows.length > 0) {
      log('Recent data (last 10 records):');
      rows.forEach((row, index) => {
        log(`  ${index + 1}. ${row.material_name} (ID: ${row.material_id}) - ${row.price_per_unit} ${row.currency}/${row.display_unit} - ${row.effective_date}`);
      });
    }
  } catch (error) {
    log(`Error checking recent data: ${error.message}`, 'ERROR');
  }
}

// Main function
async function main() {
  let connection;
  
  try {
    log('Starting default_itemvalue structure check...');
    
    // Connect to database
    connection = await createDatabaseConnection();
    
    // Check database exists
    const dbExists = await checkDatabase(connection);
    if (!dbExists) {
      log('Database does not exist. Please create it first.', 'ERROR');
      return;
    }
    
    // Check table structure
    const tableExists = await checkTableStructure(connection);
    if (!tableExists) {
      log('Table does not exist. Please create it first.', 'ERROR');
      return;
    }
    
    // Check data count
    const count = await checkDataCount(connection);
    
    // Check for duplicates
    const duplicateCount = await checkDuplicates(connection);
    
    // Check recent data
    await checkRecentData(connection);
    
    // Summary
    log('Structure check completed!', 'SUCCESS');
    log(`Summary: ${count} total records, ${duplicateCount} duplicate combinations`);
    
  } catch (error) {
    log(`Check failed: ${error.message}`, 'ERROR');
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
  checkDatabase,
  checkTableStructure,
  checkDataCount,
  checkDuplicates
};





