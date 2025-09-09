const mysql = require('mysql2/promise');

async function checkPrices() {
  let connection;
  try {
    console.log('🔌 กำลังเชื่อมต่อฐานข้อมูล...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'cots'
    });
    console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');

    console.log('📊 สถิติราคาในตาราง material:');
    
    // ตรวจสอบจำนวนวัตถุดิบทั้งหมด
    const [totalRows] = await connection.execute('SELECT COUNT(*) as total FROM material');
    console.log('   - วัตถุดิบทั้งหมด:', totalRows[0].total);
    
    // ตรวจสอบจำนวนวัตถุดิบที่มีราคา
    const [priceRows] = await connection.execute('SELECT COUNT(*) as with_price FROM material WHERE price > 0');
    console.log('   - วัตถุดิบที่มีราคา:', priceRows[0].with_price);
    console.log('   - วัตถุดิบที่ไม่มีราคา:', totalRows[0].total - priceRows[0].with_price);
    
    // ตัวอย่างวัตถุดิบที่มีราคา
    const [sampleRows] = await connection.execute('SELECT Mat_Name, price FROM material WHERE price > 0 LIMIT 5');
    console.log('\n💰 ตัวอย่างวัตถุดิบที่มีราคา:');
    sampleRows.forEach(row => {
      console.log('   -', row.Mat_Name + ':', '฿' + row.price);
    });
    
    // ตรวจสอบ BOM
    console.log('\n📋 ตรวจสอบ BOM:');
    const [bomRows] = await connection.execute('SELECT COUNT(*) as total FROM fg_bom');
    console.log('   - BOM items ทั้งหมด:', bomRows[0].total);
    
    // ตรวจสอบ workplans
    console.log('\n📅 ตรวจสอบ Workplans:');
    const [wpRows] = await connection.execute('SELECT COUNT(*) as total FROM work_plans WHERE DATE(production_date) = "2025-01-09"');
    console.log('   - Workplans สำหรับ 2025-01-09:', wpRows[0].total);
    
    // ตรวจสอบ workplans ล่าสุด
    const [latestWpRows] = await connection.execute('SELECT COUNT(*) as total FROM work_plans WHERE production_date >= "2025-01-01"');
    console.log('   - Workplans ตั้งแต่ 2025-01-01:', latestWpRows[0].total);
    
    if (latestWpRows[0].total > 0) {
      const [sampleWpRows] = await connection.execute('SELECT job_code, job_name, production_date FROM work_plans WHERE production_date >= "2025-01-01" ORDER BY production_date DESC LIMIT 3');
      console.log('\n📝 ตัวอย่าง Workplans ล่าสุด:');
      sampleWpRows.forEach(row => {
        console.log('   -', row.job_code + ':', row.job_name, '(' + row.production_date + ')');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkPrices();
