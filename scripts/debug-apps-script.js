const axios = require('axios');
require('dotenv').config({ path: './config.env' });

async function debugAppsScript() {
  try {
    const url = process.env.GOOGLE_APPS_SCRIPT_URL;
    console.log('Fetching data from:', url);
    
    const response = await axios.get(url, { timeout: 30000 });
    
    if (response.data.success) {
      const data = response.data.data;
      console.log('\n=== HEADERS ===');
      console.log(data.headers);
      
      console.log('\n=== FIRST 5 ROWS ===');
      data.data.slice(0, 5).forEach((row, index) => {
        console.log(`Row ${index + 1}:`, row);
      });
      
      // Test column mapping
      const expectedColumns = {
        category: 'หมวดหมู่',
        productId: 'รหัสสินค้า',
        productName: 'ชื่อสินค้า',
        quantity: 'จำนวนนับ',
        unit: 'หน่วย',
        costPerUnit: 'ราคาทุน\nต่อหน่วย',
        value: 'มูลค่า'
      };

      console.log('\n=== COLUMN MAPPING TEST ===');
      for (const [key, thaiName] of Object.entries(expectedColumns)) {
        const index = data.headers.findIndex(header => 
          header && header.toString().includes(thaiName.replace('\n', ''))
        );
        console.log(`${key}: ${thaiName} -> index ${index}`);
      }
      
      console.log('\n=== SUMMARY ===');
      console.log('Total rows:', data.totalRows);
      console.log('Sheet name:', data.sheetName);
      console.log('Range:', data.range);
    } else {
      console.log('Error:', response.data.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugAppsScript();
