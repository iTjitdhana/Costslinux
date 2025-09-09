const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configurations
const currentDBConfig = {
    host: process.env.DB_HOST || '192.168.0.94',
    user: process.env.DB_USER || 'jitdhana',
    password: process.env.DB_PASSWORD || 'iT12345$',
    database: 'esp_tracker',
    charset: 'utf8mb4'
};

const oldDBConfig = {
    host: process.env.DB_HOST || '192.168.0.94',
    user: process.env.DB_USER || 'jitdhana',
    password: process.env.DB_PASSWORD || 'iT12345$',
    database: 'esp_tracker_empty',
    charset: 'utf8mb4'
};

async function mergeDatabases() {
    let currentConnection, oldConnection;
    
    try {
        console.log('🔄 เริ่มกระบวนการ merge ข้อมูล...');
        
        // เชื่อมต่อ database ทั้งสอง
        currentConnection = await mysql.createConnection(currentDBConfig);
        oldConnection = await mysql.createConnection(oldDBConfig);
        
        console.log('✅ เชื่อมต่อ database สำเร็จ');
        
        // 1. หา work_plan_id สูงสุดใน database ปัจจุบัน
        const [maxWorkPlanResult] = await currentConnection.execute(
            'SELECT COALESCE(MAX(id), 0) as max_id FROM work_plans'
        );
        const maxWorkPlanId = maxWorkPlanResult[0].max_id;
        console.log(`📊 work_plan_id สูงสุดใน database ปัจจุบัน: ${maxWorkPlanId}`);
        
        // 2. หา work_plan_id สูงสุดใน database เก่า
        const [maxOldWorkPlanResult] = await oldConnection.execute(
            'SELECT COALESCE(MAX(id), 0) as max_id FROM work_plans'
        );
        const maxOldWorkPlanId = maxOldWorkPlanResult[0].max_id;
        console.log(`📊 work_plan_id สูงสุดใน database เก่า: ${maxOldWorkPlanId}`);
        
        if (maxOldWorkPlanId === 0) {
            console.log('⚠️ ไม่มีข้อมูล work_plans ใน database เก่า');
            return;
        }
        
        // 3. สร้าง mapping table สำหรับ work_plan_id ใหม่
        const offset = maxWorkPlanId + 1000; // เพิ่ม offset เพื่อความปลอดภัย
        console.log(`🔄 ใช้ offset: ${offset} สำหรับ work_plan_id ใหม่`);
        
        // 4. ดึงข้อมูล work_plans จาก database เก่า
        const [oldWorkPlans] = await oldConnection.execute(
            'SELECT * FROM work_plans ORDER BY id'
        );
        console.log(`📋 พบ work_plans ใน database เก่า: ${oldWorkPlans.length} รายการ`);
        
        // 5. Insert work_plans ใหม่เข้า database ปัจจุบัน
        console.log('🔄 กำลัง insert work_plans...');
        for (const workPlan of oldWorkPlans) {
            const newId = workPlan.id + offset;
            
            // ตรวจสอบว่า work_plan นี้มีอยู่แล้วหรือไม่ (ใช้ production_date และ job_code)
            const [existingWorkPlan] = await currentConnection.execute(
                'SELECT id FROM work_plans WHERE production_date = ? AND job_code = ?',
                [workPlan.production_date, workPlan.job_code]
            );
            
            if (existingWorkPlan.length === 0) {
                // Insert work_plan ใหม่
                await currentConnection.execute(
                    `INSERT INTO work_plans (
                        id, production_date, job_code, job_name, start_time, end_time, 
                        status_id, is_special, notes, operators, machine_id, production_room_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        newId, workPlan.production_date, workPlan.job_code, workPlan.job_name,
                        workPlan.start_time, workPlan.end_time, workPlan.status_id, workPlan.is_special,
                        workPlan.notes, workPlan.operators, workPlan.machine_id, workPlan.production_room_id
                    ]
                );
                console.log(`✅ Insert work_plan: ${workPlan.job_code} (${workPlan.production_date}) -> ID: ${newId}`);
            } else {
                console.log(`⚠️ ข้าม work_plan ที่มีอยู่แล้ว: ${workPlan.job_code} (${workPlan.production_date})`);
            }
        }
        
        // 6. ดึงข้อมูล logs จาก database เก่า
        const [oldLogs] = await oldConnection.execute(
            'SELECT * FROM logs ORDER BY id'
        );
        console.log(`📋 พบ logs ใน database เก่า: ${oldLogs.length} รายการ`);
        
        // 7. Insert logs ใหม่เข้า database ปัจจุบัน
        console.log('🔄 กำลัง insert logs...');
        for (const log of oldLogs) {
            const newWorkPlanId = log.work_plan_id + offset;
            
            // ตรวจสอบว่า work_plan_id ใหม่มีอยู่จริง
            const [workPlanExists] = await currentConnection.execute(
                'SELECT id FROM work_plans WHERE id = ?',
                [newWorkPlanId]
            );
            
            if (workPlanExists.length > 0) {
                // ตรวจสอบว่า log นี้มีอยู่แล้วหรือไม่
                const [existingLog] = await currentConnection.execute(
                    'SELECT id FROM logs WHERE work_plan_id = ? AND batch_id = ? AND process_number = ? AND status = ? AND timestamp = ?',
                    [newWorkPlanId, log.batch_id, log.process_number, log.status, log.timestamp]
                );
                
                if (existingLog.length === 0) {
                    // Insert log ใหม่
                    await currentConnection.execute(
                        'INSERT INTO logs (work_plan_id, batch_id, process_number, status, timestamp) VALUES (?, ?, ?, ?, ?)',
                        [newWorkPlanId, log.batch_id, log.process_number, log.status, log.timestamp]
                    );
                    console.log(`✅ Insert log: work_plan_id=${newWorkPlanId}, status=${log.status}, timestamp=${log.timestamp}`);
                } else {
                    console.log(`⚠️ ข้าม log ที่มีอยู่แล้ว: work_plan_id=${newWorkPlanId}, status=${log.status}, timestamp=${log.timestamp}`);
                }
            } else {
                console.log(`⚠️ ข้าม log เพราะ work_plan_id ${newWorkPlanId} ไม่มีอยู่`);
            }
        }
        
        // 8. อัปเดต AUTO_INCREMENT ของ work_plans
        const newMaxId = maxWorkPlanId + offset + maxOldWorkPlanId;
        await currentConnection.execute(
            `ALTER TABLE work_plans AUTO_INCREMENT = ${newMaxId + 1}`
        );
        console.log(`🔄 อัปเดต AUTO_INCREMENT ของ work_plans เป็น: ${newMaxId + 1}`);
        
        // 9. สร้างรายงานสรุป
        const [finalWorkPlanCount] = await currentConnection.execute(
            'SELECT COUNT(*) as count FROM work_plans'
        );
        const [finalLogCount] = await currentConnection.execute(
            'SELECT COUNT(*) as count FROM logs'
        );
        
        console.log('\n📊 รายงานสรุปการ merge:');
        console.log(`- work_plans ทั้งหมด: ${finalWorkPlanCount[0].count} รายการ`);
        console.log(`- logs ทั้งหมด: ${finalLogCount[0].count} รายการ`);
        console.log(`- ใช้ offset: ${offset}`);
        console.log('✅ การ merge ข้อมูลเสร็จสิ้น');
        
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

// ฟังก์ชันสำหรับตรวจสอบข้อมูลก่อน merge
async function checkDataBeforeMerge() {
    let currentConnection, oldConnection;
    
    try {
        currentConnection = await mysql.createConnection(currentDBConfig);
        oldConnection = await mysql.createConnection(oldDBConfig);
        
        console.log('🔍 ตรวจสอบข้อมูลก่อน merge...');
        
        // ตรวจสอบ work_plans
        const [currentWorkPlans] = await currentConnection.execute('SELECT COUNT(*) as count FROM work_plans');
        const [oldWorkPlans] = await oldConnection.execute('SELECT COUNT(*) as count FROM work_plans');
        
        // ตรวจสอบ logs
        const [currentLogs] = await currentConnection.execute('SELECT COUNT(*) as count FROM logs');
        const [oldLogs] = await oldConnection.execute('SELECT COUNT(*) as count FROM logs');
        
        console.log('\n📊 สถานะข้อมูลปัจจุบัน:');
        console.log(`- esp_tracker: work_plans=${currentWorkPlans[0].count}, logs=${currentLogs[0].count}`);
        console.log(`- esp_tracker_empty: work_plans=${oldWorkPlans[0].count}, logs=${oldLogs[0].count}`);
        
        // ตรวจสอบ work_plan_id ที่ซ้ำกัน
        const [duplicateWorkPlans] = await currentConnection.execute(`
            SELECT wp1.production_date, wp1.job_code, COUNT(*) as count
            FROM work_plans wp1
            INNER JOIN esp_tracker_empty.work_plans wp2 
            ON wp1.production_date = wp2.production_date AND wp1.job_code = wp2.job_code
            GROUP BY wp1.production_date, wp1.job_code
            HAVING COUNT(*) > 1
        `);
        
        if (duplicateWorkPlans.length > 0) {
            console.log('\n⚠️ พบ work_plans ที่ซ้ำกัน:');
            duplicateWorkPlans.forEach(dup => {
                console.log(`  - ${dup.job_code} (${dup.production_date}): ${dup.count} รายการ`);
            });
        } else {
            console.log('\n✅ ไม่พบ work_plans ที่ซ้ำกัน');
        }
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการตรวจสอบ:', error);
    } finally {
        if (currentConnection) await currentConnection.end();
        if (oldConnection) await oldConnection.end();
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--check')) {
        await checkDataBeforeMerge();
    } else if (args.includes('--merge')) {
        await mergeDatabases();
    } else {
        console.log('📋 วิธีใช้งาน:');
        console.log('  node generate_batch_ids.js --check  # ตรวจสอบข้อมูลก่อน merge');
        console.log('  node generate_batch_ids.js --merge  # ทำการ merge ข้อมูล');
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { mergeDatabases, checkDataBeforeMerge };
