// ตรวจสอบ material_id ในตาราง material โดยใช้ backend connection
const { query } = require('./backend/database/connection');

async function checkMaterialIdsBackend() {
  try {
    console.log('🔌 กำลังเชื่อมต่อฐานข้อมูลผ่าน backend...');

    console.log('📊 ตรวจสอบ material_id ในตาราง material:');
    
    // ตรวจสอบ material_id ในตาราง material
    const materialRows = await query('SELECT id, Mat_Id, Mat_Name, price FROM material LIMIT 10');
    console.log('   - ตัวอย่าง material_id ในตาราง material:');
    materialRows.forEach((row, index) => {
      console.log(`     ${index + 1}. ID: ${row.id}, Mat_Id: ${row.Mat_Id}, ${row.Mat_Name}: ฿${row.price}`);
    });
    
    // ตรวจสอบ material_id ในตาราง default_itemvalue
    console.log('\n📊 ตรวจสอบ material_id ในตาราง default_itemvalue:');
    const { query: defaultQuery } = require('./backend/database/defaultItemvalueConnection');
    const defaultRows = await defaultQuery('SELECT material_id, material_name, price_per_unit FROM default_itemvalue.v_latest_material_price LIMIT 10');
    console.log('   - ตัวอย่าง material_id ในตาราง default_itemvalue:');
    defaultRows.forEach((row, index) => {
      console.log(`     ${index + 1}. material_id: ${row.material_id}, ${row.material_name}: ฿${row.price_per_unit}`);
    });
    
    // ตรวจสอบความสัมพันธ์
    console.log('\n🔗 ตรวจสอบความสัมพันธ์:');
    const materialIds = materialRows.map(row => row.id);
    const defaultMaterialIds = defaultRows.map(row => row.material_id);
    
    console.log('   - material.id ในตาราง material:', materialIds.join(', '));
    console.log('   - material_id ในตาราง default_itemvalue:', defaultMaterialIds.join(', '));
    
    const commonIds = materialIds.filter(id => defaultMaterialIds.includes(id));
    console.log('   - material_id ที่ตรงกัน:', commonIds.length > 0 ? commonIds.join(', ') : 'ไม่มี');
    
    if (commonIds.length === 0) {
      console.log('\n⚠️  ไม่มี material_id ที่ตรงกัน!');
      console.log('   - ต้องใช้ Mat_Id แทน id ในการเชื่อมต่อ');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

checkMaterialIdsBackend();
