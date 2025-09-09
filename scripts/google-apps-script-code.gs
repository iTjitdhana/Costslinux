/**
 * Google Apps Script for Exporting Google Sheets Data
 * 
 * Instructions:
 * 1. Open your Google Sheets
 * 2. Go to Extensions > Apps Script
 * 3. Replace the default code with this code
 * 4. Save the project
 * 5. Deploy as Web App:
 *    - Click "Deploy" > "New deployment"
 *    - Choose "Web app"
 *    - Set "Execute as" to "Me"
 *    - Set "Who has access" to "Anyone"
 *    - Click "Deploy"
 * 6. Copy the Web App URL and use it in your Node.js script
 */

// Configuration
const CONFIG = {
  // Sheet name to read data from (change this to your sheet name)
  SHEET_NAME: 'สต็อกครัวกลาง',
  
  // Range to read data from (e.g., 'A:J' for columns A to J)
  DATA_RANGE: 'B:H',
  
  // Row number where headers start (Row 2 in the image)
  HEADER_ROW: 2
};

/**
 * Main function to handle HTTP requests
 */
function doPost(e) {
  try {
    // Get the data (no API key required)
    const data = getSheetData();
    
    // Return the response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: data,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in doPost:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Get function to handle GET requests (for testing)
 */
function doGet(e) {
  try {
    // Get the data
    const data = getSheetData();
    
    // Return the response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: data,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in doGet:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Get data from the active spreadsheet
 */
function getSheetData() {
  try {
    // Get the active spreadsheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // Get the sheet by name
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) {
      throw new Error(`Sheet '${CONFIG.SHEET_NAME}' not found`);
    }
    
    // Get the data range
    const range = sheet.getRange(CONFIG.DATA_RANGE);
    const values = range.getValues();
    
    // Filter out empty rows
    const nonEmptyRows = values.filter(row => 
      row.some(cell => cell !== null && cell !== '' && cell.toString().trim() !== '')
    );
    
    if (nonEmptyRows.length === 0) {
      throw new Error('No data found in the specified range');
    }
    
    // Calculate header row index (HEADER_ROW is 1-based, convert to 0-based)
    const headerRowIndex = CONFIG.HEADER_ROW - 1;
    
    // Get headers from the specified row
    const headers = nonEmptyRows[headerRowIndex];
    
    // Get data rows (skip header row and any rows before it)
    const dataRows = nonEmptyRows.slice(headerRowIndex + 1);
    
    // Log for debugging
    console.log(`Found ${dataRows.length} data rows`);
    console.log('Headers:', headers);
    
    return {
      headers: headers,
      data: dataRows,
      totalRows: dataRows.length,
      sheetName: CONFIG.SHEET_NAME,
      range: CONFIG.DATA_RANGE,
      headerRow: CONFIG.HEADER_ROW,
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error getting sheet data:', error);
    throw error;
  }
}

/**
 * Test function to verify the script is working
 */
function testGetData() {
  try {
    const data = getSheetData();
    console.log('Test successful!');
    console.log('Data:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}

/**
 * Function to manually trigger data export (for testing)
 */
function manualExport() {
  try {
    const data = getSheetData();
    
    // Create a summary
    const summary = {
      totalRows: data.totalRows,
      headers: data.headers,
      sampleData: data.data.slice(0, 3), // First 3 rows
      timestamp: new Date().toISOString()
    };
    
    console.log('Manual export successful!');
    console.log('Summary:', JSON.stringify(summary, null, 2));
    
    return summary;
  } catch (error) {
    console.error('Manual export failed:', error);
    throw error;
  }
}

/**
 * Function to validate the configuration
 */
function validateConfig() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
    
    if (!sheet) {
      throw new Error(`Sheet '${CONFIG.SHEET_NAME}' not found`);
    }
    
    const range = sheet.getRange(CONFIG.DATA_RANGE);
    const values = range.getValues();
    
    console.log('Configuration validation successful!');
    console.log(`Sheet: ${CONFIG.SHEET_NAME}`);
    console.log(`Range: ${CONFIG.DATA_RANGE}`);
    console.log(`Total cells: ${values.length * values[0].length}`);
    console.log(`Rows: ${values.length}`);
    console.log(`Columns: ${values[0].length}`);
    
    return {
      valid: true,
      sheetName: CONFIG.SHEET_NAME,
      range: CONFIG.DATA_RANGE,
      totalRows: values.length,
      totalColumns: values[0].length
    };
  } catch (error) {
    console.error('Configuration validation failed:', error);
    return {
      valid: false,
      error: error.toString()
    };
  }
}
