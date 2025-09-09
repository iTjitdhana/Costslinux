const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../config.env' });

// Configuration
const config = {
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

// Test Google Sheets authentication
async function testGoogleSheetsAuth() {
  try {
    log('Testing Google Sheets authentication...');
    
    const credentialsPath = path.resolve(__dirname, config.googleSheets.credentialsPath);
    
    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Credentials file not found: ${credentialsPath}`);
    }

    log(`Using credentials file: ${credentialsPath}`);
    
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    log(`Service account email: ${credentials.client_email}`);
    
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

// Test spreadsheet access
async function testSpreadsheetAccess(sheets) {
  try {
    if (!config.googleSheets.spreadsheetId) {
      throw new Error('Spreadsheet ID not configured. Please set GOOGLE_SHEETS_SPREADSHEET_ID in config.env');
    }

    log(`Testing access to spreadsheet: ${config.googleSheets.spreadsheetId}`);
    
    // Get spreadsheet metadata
    const metadataResponse = await sheets.spreadsheets.get({
      spreadsheetId: config.googleSheets.spreadsheetId
    });
    
    const spreadsheet = metadataResponse.data;
    log(`Spreadsheet title: ${spreadsheet.properties.title}`);
    log(`Spreadsheet URL: ${spreadsheet.spreadsheetUrl}`);
    
    // List sheets
    log('Available sheets:');
    spreadsheet.sheets.forEach(sheet => {
      log(`  - ${sheet.properties.title} (ID: ${sheet.properties.sheetId})`);
    });
    
    // Test data access
    log(`Testing data access with range: ${config.googleSheets.range}`);
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: config.googleSheets.spreadsheetId,
      range: config.googleSheets.range
    });

    const rows = dataResponse.data.values;
    if (!rows || rows.length === 0) {
      log('No data found in the specified range', 'WARN');
      return;
    }

    log(`Successfully accessed ${rows.length} rows`);
    log('First 3 rows preview:');
    
    for (let i = 0; i < Math.min(3, rows.length); i++) {
      log(`  Row ${i + 1}: ${rows[i].join(' | ')}`);
    }
    
    if (rows.length > 3) {
      log(`  ... and ${rows.length - 3} more rows`);
    }
    
  } catch (error) {
    log(`Spreadsheet access failed: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Main test function
async function main() {
  try {
    log('Starting Google Sheets connection test...');
    
    // Test authentication
    const sheets = await testGoogleSheetsAuth();
    
    // Test spreadsheet access
    await testSpreadsheetAccess(sheets);
    
    log('All tests passed successfully!', 'SUCCESS');
    
  } catch (error) {
    log(`Test failed: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  main().catch(error => {
    log(`Unhandled error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

module.exports = {
  testGoogleSheetsAuth,
  testSpreadsheetAccess
};





