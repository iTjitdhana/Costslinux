const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || '192.168.0.94',
    user: process.env.DB_USER || 'jitdhana',
    password: process.env.DB_PASSWORD || 'iT12345$',
    database: 'esp_tracker',
    charset: 'utf8mb4'
};

async function verifyMerge() {
    let connection;
    
    try {
        console.log('🔍 ตรวจสอบความถูกต้องของข้อมูลหลัง merge...');
        
        connection = await mysql.createConnection(dbConfig);
        
        // 1. ตรวจสอบจำนวนข้อมูลทั้งหมด
        console.log('\n📊 จำนวนข้อมูลทั้งหมด:');
        
        const [workPlansCount] = await connection.execute('SELECT COUNT(*) as count FROM work_plans');
        const [logsCount] = await connection.execute('SELECT COUNT(*) as count FROM logs');
        const [productionBatchesCount] = await connection.execute('SELECT COUNT(*) as count FROM production_batches');
        const [finishedFlagsCount] = await connection.execute('SELECT COUNT(*) as count FROM finished_flags');
        
        console.log(`- work_plans: ${workPlansCount[0].count} รายการ`);
        console.log(`- logs: ${logsCount[0].count} รายการ`);
        console.log(`- production_batches: ${productionBatchesCount[0].count} รายการ`);
        console.log(`- finished_flags: ${finishedFlagsCount[0].count} รายการ`);
        
        // 2. ตรวจสอบ foreign key integrity
        console.log('\n🔗 ตรวจสอบ Foreign Key Integrity:');
        
        // ตรวจสอบ logs ที่ไม่มี work_plan_id ที่ถูกต้อง
        const [orphanedLogs] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM logs l 
            LEFT JOIN work_plans wp ON l.work_plan_id = wp.id 
            WHERE wp.id IS NULL
        `);
        
        if (orphanedLogs[0].count > 0) {
            console.log(`❌ พบ logs ที่ไม่มี work_plan_id ที่ถูกต้อง: ${orphanedLogs[0].count} รายการ`);
        } else {
            console.log('✅ ไม่พบ logs ที่ไม่มี work_plan_id ที่ถูกต้อง');
        }
        
        // ตรวจสอบ finished_flags ที่ไม่มี work_plan_id ที่ถูกต้อง
        const [orphanedFlags] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM finished_flags ff 
            LEFT JOIN work_plans wp ON ff.work_plan_id = wp.id 
            WHERE wp.id IS NULL
        `);
        
        if (orphanedFlags[0].count > 0) {
            console.log(`❌ พบ finished_flags ที่ไม่มี work_plan_id ที่ถูกต้อง: ${orphanedFlags[0].count} รายการ`);
        } else {
            console.log('✅ ไม่พบ finished_flags ที่ไม่มี work_plan_id ที่ถูกต้อง');
        }
        
        // ตรวจสอบ production_batches ที่ไม่มี work_plan_id ที่ถูกต้อง
        const [orphanedBatches] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM production_batches pb 
            LEFT JOIN work_plans wp ON pb.work_plan_id = wp.id 
            WHERE wp.id IS NULL
        `);
        
        if (orphanedBatches[0].count > 0) {
            console.log(`❌ พบ production_batches ที่ไม่มี work_plan_id ที่ถูกต้อง: ${orphanedBatches[0].count} รายการ`);
        } else {
            console.log('✅ ไม่พบ production_batches ที่ไม่มี work_plan_id ที่ถูกต้อง');
        }
        
        // 3. ตรวจสอบข้อมูลซ้ำ
        console.log('\n🔄 ตรวจสอบข้อมูลซ้ำ:');
        
        // ตรวจสอบ work_plans ที่ซ้ำกัน
        const [duplicateWorkPlans] = await connection.execute(`
            SELECT production_date, job_code, COUNT(*) as count
            FROM work_plans 
            GROUP BY production_date, job_code 
            HAVING COUNT(*) > 1
        `);
        
        if (duplicateWorkPlans.length > 0) {
            console.log('⚠️ พบ work_plans ที่ซ้ำกัน:');
            duplicateWorkPlans.forEach(dup => {
                console.log(`  - ${dup.job_code} (${dup.production_date}): ${dup.count} รายการ`);
            });
        } else {
            console.log('✅ ไม่พบ work_plans ที่ซ้ำกัน');
        }
        
        // ตรวจสอบ logs ที่ซ้ำกัน
        const [duplicateLogs] = await connection.execute(`
            SELECT work_plan_id, batch_id, process_number, status, timestamp, COUNT(*) as count
            FROM logs 
            GROUP BY work_plan_id, batch_id, process_number, status, timestamp 
            HAVING COUNT(*) > 1
        `);
        
        if (duplicateLogs.length > 0) {
            console.log('⚠️ พบ logs ที่ซ้ำกัน:');
            duplicateLogs.forEach(dup => {
                console.log(`  - work_plan_id=${dup.work_plan_id}, status=${dup.status}, timestamp=${dup.timestamp}: ${dup.count} รายการ`);
            });
        } else {
            console.log('✅ ไม่พบ logs ที่ซ้ำกัน');
        }
        
        // 4. ตรวจสอบช่วง ID
        console.log('\n📈 ช่วง ID ของข้อมูล:');
        
        const [workPlanIdRange] = await connection.execute('SELECT MIN(id) as min_id, MAX(id) as max_id FROM work_plans');
        const [logIdRange] = await connection.execute('SELECT MIN(id) as min_id, MAX(id) as max_id FROM logs');
        
        console.log(`- work_plans ID range: ${workPlanIdRange[0].min_id} - ${workPlanIdRange[0].max_id}`);
        console.log(`- logs ID range: ${logIdRange[0].min_id} - ${logIdRange[0].max_id}`);
        
        // 5. ตรวจสอบ AUTO_INCREMENT
        const [autoIncrementInfo] = await connection.execute(`
            SELECT 
                TABLE_NAME,
                AUTO_INCREMENT
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = 'esp_tracker' 
            AND TABLE_NAME IN ('work_plans', 'logs')
        `);
        
        console.log('\n🔄 AUTO_INCREMENT values:');
        autoIncrementInfo.forEach(table => {
            console.log(`- ${table.TABLE_NAME}: ${table.AUTO_INCREMENT}`);
        });
        
        // 6. สรุปผลการตรวจสอบ
        console.log('\n📋 สรุปผลการตรวจสอบ:');
        
        const hasOrphanedData = orphanedLogs[0].count > 0 || orphanedFlags[0].count > 0 || orphanedBatches[0].count > 0;
        const hasDuplicates = duplicateWorkPlans.length > 0 || duplicateLogs.length > 0;
        
        if (hasOrphanedData) {
            console.log('❌ พบปัญหาข้อมูลที่ขาดหายไป (orphaned data)');
        } else {
            console.log('✅ ไม่พบข้อมูลที่ขาดหายไป');
        }
        
        if (hasDuplicates) {
            console.log('⚠️ พบข้อมูลซ้ำ');
        } else {
            console.log('✅ ไม่พบข้อมูลซ้ำ');
        }
        
        if (!hasOrphanedData && !hasDuplicates) {
            console.log('🎉 การ merge ข้อมูลสำเร็จและข้อมูลถูกต้อง');
        } else {
            console.log('⚠️ ควรตรวจสอบและแก้ไขปัญหาที่พบ');
        }
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการตรวจสอบ:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// ฟังก์ชันสำหรับแสดงรายละเอียดข้อมูลที่ผิดปกติ
async function showDetailedIssues() {
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        
        console.log('\n🔍 รายละเอียดปัญหาที่พบ:');
        
        // แสดง logs ที่ไม่มี work_plan_id ที่ถูกต้อง
        const [orphanedLogs] = await connection.execute(`
            SELECT l.* 
            FROM logs l 
            LEFT JOIN work_plans wp ON l.work_plan_id = wp.id 
            WHERE wp.id IS NULL
            LIMIT 10
        `);
        
        if (orphanedLogs.length > 0) {
            console.log('\n📋 Logs ที่ไม่มี work_plan_id ที่ถูกต้อง (แสดง 10 รายการแรก):');
            orphanedLogs.forEach(log => {
                console.log(`  - ID: ${log.id}, work_plan_id: ${log.work_plan_id}, status: ${log.status}, timestamp: ${log.timestamp}`);
            });
        }
        
        // แสดง work_plans ที่ซ้ำกัน
        const [duplicateWorkPlans] = await connection.execute(`
            SELECT production_date, job_code, GROUP_CONCAT(id) as ids, COUNT(*) as count
            FROM work_plans 
            GROUP BY production_date, job_code 
            HAVING COUNT(*) > 1
            LIMIT 5
        `);
        
        if (duplicateWorkPlans.length > 0) {
            console.log('\n📋 Work_plans ที่ซ้ำกัน (แสดง 5 รายการแรก):');
            duplicateWorkPlans.forEach(dup => {
                console.log(`  - ${dup.job_code} (${dup.production_date}): IDs [${dup.ids}], count: ${dup.count}`);
            });
        }
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--detailed')) {
        await verifyMerge();
        await showDetailedIssues();
    } else {
        await verifyMerge();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { verifyMerge, showDetailedIssues };
