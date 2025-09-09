const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configurations
const currentDBConfig = {
    host: '192.168.0.94',
    user: 'jitdhana',
    password: 'iT12345$',
    database: 'esp_tracker'
};

const oldDBConfig = {
    host: '192.168.0.94',
    user: 'jitdhana',
    password: 'iT12345$',
    database: 'esp_tracker_empty'
};

async function checkDuplicateData() {
    let currentConnection, oldConnection;
    
    try {
        currentConnection = await mysql.createConnection(currentDBConfig);
        oldConnection = await mysql.createConnection(oldDBConfig);
        
        console.log('🔍 ตรวจสอบข้อมูลซ้ำระหว่าง esp_tracker และ esp_tracker_empty...\n');
        
        // 1. ตรวจสอบ work_plans ที่ซ้ำกัน (production_date + job_code)
        console.log('📋 ตรวจสอบ work_plans ที่ซ้ำกัน (production_date + job_code):');
        const [duplicateWorkPlans] = await currentConnection.execute(`
            SELECT 
                wp1.production_date,
                wp1.job_code,
                GROUP_CONCAT(wp1.job_name ORDER BY wp1.id) as job_names,
                COUNT(*) as count,
                GROUP_CONCAT(wp1.id ORDER BY wp1.id) as current_ids,
                GROUP_CONCAT(wp1.start_time ORDER BY wp1.id) as current_start_times
            FROM work_plans wp1
            GROUP BY wp1.production_date, wp1.job_code
            HAVING COUNT(*) > 1
            ORDER BY wp1.production_date DESC, wp1.job_code
        `);
        
        if (duplicateWorkPlans.length > 0) {
            console.log(`⚠️ พบ work_plans ซ้ำ ${duplicateWorkPlans.length} รายการ:`);
            duplicateWorkPlans.forEach((dup, index) => {
                console.log(`${index + 1}. วันที่: ${dup.production_date}, รหัส: ${dup.job_code}, ชื่อ: ${dup.job_names}`);
                console.log(`   จำนวน: ${dup.count}, IDs: ${dup.current_ids}`);
                console.log(`   เวลาเริ่ม: ${dup.current_start_times}\n`);
            });
        } else {
            console.log('✅ ไม่พบ work_plans ซ้ำใน esp_tracker\n');
        }
        
        // 2. ตรวจสอบ work_plans ที่อาจซ้ำกับ esp_tracker_empty
        console.log('📋 ตรวจสอบ work_plans ที่อาจซ้ำกับ esp_tracker_empty:');
        const [potentialDuplicates] = await currentConnection.execute(`
            SELECT 
                wp.production_date,
                wp.job_code,
                wp.job_name,
                wp.id as current_id,
                wp.start_time as current_start_time
            FROM work_plans wp
            WHERE EXISTS (
                SELECT 1 FROM esp_tracker_empty.work_plans wp_old 
                WHERE wp_old.production_date = wp.production_date 
                AND wp_old.job_code = wp.job_code
            )
            ORDER BY wp.production_date DESC, wp.job_code
        `);
        
        if (potentialDuplicates.length > 0) {
            console.log(`⚠️ พบ work_plans ที่อาจซ้ำกับ esp_tracker_empty ${potentialDuplicates.length} รายการ:`);
            potentialDuplicates.forEach((dup, index) => {
                console.log(`${index + 1}. วันที่: ${dup.production_date}, รหัส: ${dup.job_code}, ชื่อ: ${dup.job_name}`);
                console.log(`   ID ปัจจุบัน: ${dup.current_id}, เวลาเริ่ม: ${dup.current_start_time}\n`);
            });
        } else {
            console.log('✅ ไม่พบ work_plans ที่ซ้ำกับ esp_tracker_empty\n');
        }
        
        // 3. ตรวจสอบ logs ที่ซ้ำกัน (work_plan_id + batch_id + process_number + status + timestamp)
        console.log('📋 ตรวจสอบ logs ที่ซ้ำกัน:');
        const [duplicateLogs] = await currentConnection.execute(`
            SELECT 
                l.work_plan_id,
                l.batch_id,
                l.process_number,
                l.status,
                l.timestamp,
                COUNT(*) as count,
                GROUP_CONCAT(l.id ORDER BY l.id) as log_ids
            FROM logs l
            GROUP BY l.work_plan_id, l.batch_id, l.process_number, l.status, l.timestamp
            HAVING COUNT(*) > 1
            ORDER BY l.timestamp DESC
            LIMIT 20
        `);
        
        if (duplicateLogs.length > 0) {
            console.log(`⚠️ พบ logs ซ้ำ ${duplicateLogs.length} รายการ (แสดง 20 รายการแรก):`);
            duplicateLogs.forEach((dup, index) => {
                console.log(`${index + 1}. work_plan_id: ${dup.work_plan_id}, batch_id: ${dup.batch_id}`);
                console.log(`   process: ${dup.process_number}, status: ${dup.status}, time: ${dup.timestamp}`);
                console.log(`   จำนวน: ${dup.count}, log IDs: ${dup.log_ids}\n`);
            });
        } else {
            console.log('✅ ไม่พบ logs ซ้ำใน esp_tracker\n');
        }
        
        // 4. ตรวจสอบ logs ที่อาจซ้ำกับ esp_tracker_empty
        console.log('📋 ตรวจสอบ logs ที่อาจซ้ำกับ esp_tracker_empty:');
        const [potentialDuplicateLogs] = await currentConnection.execute(`
            SELECT 
                l.work_plan_id,
                l.batch_id,
                l.process_number,
                l.status,
                l.timestamp,
                l.id as current_log_id
            FROM logs l
            WHERE EXISTS (
                SELECT 1 FROM esp_tracker_empty.logs l_old 
                WHERE l_old.work_plan_id = l.work_plan_id 
                AND l_old.batch_id = l.batch_id
                AND l_old.process_number = l.process_number
                AND l_old.status = l.status
                AND l_old.timestamp = l.timestamp
            )
            ORDER BY l.timestamp DESC
            LIMIT 20
        `);
        
        if (potentialDuplicateLogs.length > 0) {
            console.log(`⚠️ พบ logs ที่อาจซ้ำกับ esp_tracker_empty ${potentialDuplicateLogs.length} รายการ (แสดง 20 รายการแรก):`);
            potentialDuplicateLogs.forEach((dup, index) => {
                console.log(`${index + 1}. work_plan_id: ${dup.work_plan_id}, batch_id: ${dup.batch_id}`);
                console.log(`   process: ${dup.process_number}, status: ${dup.status}, time: ${dup.timestamp}`);
                console.log(`   log ID ปัจจุบัน: ${dup.current_log_id}\n`);
            });
        } else {
            console.log('✅ ไม่พบ logs ที่ซ้ำกับ esp_tracker_empty\n');
        }
        
        // 5. สรุปข้อมูล
        console.log('📊 สรุปข้อมูล:');
        const [currentWorkPlanCount] = await currentConnection.execute('SELECT COUNT(*) as count FROM work_plans');
        const [currentLogCount] = await currentConnection.execute('SELECT COUNT(*) as count FROM logs');
        const [oldWorkPlanCount] = await oldConnection.execute('SELECT COUNT(*) as count FROM work_plans');
        const [oldLogCount] = await oldConnection.execute('SELECT COUNT(*) as count FROM logs');
        
        console.log(`- esp_tracker: work_plans=${currentWorkPlanCount[0].count}, logs=${currentLogCount[0].count}`);
        console.log(`- esp_tracker_empty: work_plans=${oldWorkPlanCount[0].count}, logs=${oldLogCount[0].count}`);
        
        // 6. คำแนะนำ
        console.log('\n💡 คำแนะนำ:');
        if (potentialDuplicates.length > 0 || potentialDuplicateLogs.length > 0) {
            console.log('⚠️ มีข้อมูลที่อาจซ้ำ - ควรใช้ generate_batch_ids.js ที่มีระบบป้องกันการซ้ำ');
        } else {
            console.log('✅ ข้อมูลไม่ซ้ำ - สามารถ merge ได้อย่างปลอดภัย');
        }
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error);
        throw error;
    } finally {
        if (currentConnection) {
            await currentConnection.end();
        }
        if (oldConnection) {
            await oldConnection.end();
        }
    }
}

// รันฟังก์ชัน
checkDuplicateData();
