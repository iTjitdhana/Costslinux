const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || '192.168.0.94',
    user: process.env.DB_USER || 'jitdhana',
    password: process.env.DB_PASSWORD || 'iT12345$',
    database: 'esp_tracker',
    charset: 'utf8mb4'
};

async function rollbackDatabase(backupDbName = null) {
    let connection;
    
    try {
        console.log('🔄 เริ่มกระบวนการ rollback ข้อมูล...');
        
        // ถ้าไม่ได้ระบุ backup database ให้อ่านจากไฟล์
        if (!backupDbName) {
            try {
                const backupInfo = JSON.parse(fs.readFileSync('backup_info.json', 'utf8'));
                backupDbName = backupInfo.backupDatabase;
                console.log(`📁 ใช้ backup database จากไฟล์: ${backupDbName}`);
            } catch (error) {
                console.log('❌ ไม่พบไฟล์ backup_info.json');
                console.log('📋 รายการ backup databases ที่มีอยู่:');
                await listBackups();
                console.log('\n⚠️  กรุณาระบุชื่อ backup database:');
                console.log('   node rollback_database.js <backup_database_name>');
                return;
            }
        }
        
        connection = await mysql.createConnection(dbConfig);
        
        // ตรวจสอบว่า backup database มีอยู่จริง
        const [backupExists] = await connection.execute(`
            SELECT SCHEMA_NAME 
            FROM information_schema.SCHEMATA 
            WHERE SCHEMA_NAME = ?
        `, [backupDbName]);
        
        if (backupExists.length === 0) {
            console.log(`❌ ไม่พบ backup database: ${backupDbName}`);
            console.log('📋 รายการ backup databases ที่มีอยู่:');
            await listBackups();
            return;
        }
        
        console.log(`✅ พบ backup database: ${backupDbName}`);
        
        // ตรวจสอบข้อมูลก่อน rollback
        console.log('\n📊 ข้อมูลปัจจุบัน:');
        const [currentWorkPlans] = await connection.execute('SELECT COUNT(*) as count FROM work_plans');
        const [currentLogs] = await connection.execute('SELECT COUNT(*) as count FROM logs');
        console.log(`- work_plans: ${currentWorkPlans[0].count} รายการ`);
        console.log(`- logs: ${currentLogs[0].count} รายการ`);
        
        // ตรวจสอบข้อมูลใน backup
        console.log('\n📊 ข้อมูลใน backup:');
        const [backupWorkPlans] = await connection.execute(`SELECT COUNT(*) as count FROM \`${backupDbName}\`.work_plans_backup`);
        const [backupLogs] = await connection.execute(`SELECT COUNT(*) as count FROM \`${backupDbName}\`.logs_backup`);
        console.log(`- work_plans: ${backupWorkPlans[0].count} รายการ`);
        console.log(`- logs: ${backupLogs[0].count} รายการ`);
        
        // หา work_plan_id สูงสุดใน backup
        const [maxBackupId] = await connection.execute(`SELECT MAX(id) as max_id FROM \`${backupDbName}\`.work_plans_backup`);
        const maxBackupWorkPlanId = maxBackupId[0].max_id || 0;
        
        console.log(`\n⚠️  การ rollback จะลบข้อมูลที่มี work_plan_id > ${maxBackupWorkPlanId}`);
        
        // ยืนยันการ rollback
        console.log('\n⚠️  ต้องการดำเนินการ rollback ต่อหรือไม่? (y/N)');
        console.log('   คำตอบ: y (ดำเนินการต่อ) หรือ N (ยกเลิก)');
        
        // ใน Node.js script เราจะให้ผู้ใช้ยืนยันผ่าน command line argument
        const args = process.argv.slice(2);
        if (!args.includes('--confirm')) {
            console.log('\n💡 ใช้คำสั่ง: node rollback_database.js --confirm เพื่อยืนยันการ rollback');
            return;
        }
        
        console.log('\n🔄 เริ่มการ rollback...');
        
        // 1. ลบ logs ที่มี work_plan_id ใหม่
        console.log('🔄 ลบ logs ที่มี work_plan_id ใหม่...');
        const [deletedLogs] = await connection.execute(`
            DELETE FROM logs 
            WHERE work_plan_id > ?
        `, [maxBackupWorkPlanId]);
        console.log(`✅ ลบ logs: ${deletedLogs.affectedRows} รายการ`);
        
        // 2. ลบ work_plans ที่ merge เข้ามา
        console.log('🔄 ลบ work_plans ที่ merge เข้ามา...');
        const [deletedWorkPlans] = await connection.execute(`
            DELETE FROM work_plans 
            WHERE id > ?
        `, [maxBackupWorkPlanId]);
        console.log(`✅ ลบ work_plans: ${deletedWorkPlans.affectedRows} รายการ`);
        
        // 3. ลบ finished_flags ที่เกี่ยวข้อง
        console.log('🔄 ลบ finished_flags ที่เกี่ยวข้อง...');
        try {
            const [deletedFlags] = await connection.execute(`
                DELETE FROM finished_flags 
                WHERE work_plan_id > ?
            `, [maxBackupWorkPlanId]);
            console.log(`✅ ลบ finished_flags: ${deletedFlags.affectedRows} รายการ`);
        } catch (error) {
            console.log('⚠️ ไม่พบตาราง finished_flags');
        }
        
        // 4. ลบ work_plan_operators ที่เกี่ยวข้อง
        console.log('🔄 ลบ work_plan_operators ที่เกี่ยวข้อง...');
        try {
            const [deletedOperators] = await connection.execute(`
                DELETE FROM work_plan_operators 
                WHERE work_plan_id > ?
            `, [maxBackupWorkPlanId]);
            console.log(`✅ ลบ work_plan_operators: ${deletedOperators.affectedRows} รายการ`);
        } catch (error) {
            console.log('⚠️ ไม่พบตาราง work_plan_operators');
        }
        
        // 5. ลบ production_batches ที่เกี่ยวข้อง
        console.log('🔄 ลบ production_batches ที่เกี่ยวข้อง...');
        try {
            const [deletedBatches] = await connection.execute(`
                DELETE FROM production_batches 
                WHERE work_plan_id > ?
            `, [maxBackupWorkPlanId]);
            console.log(`✅ ลบ production_batches: ${deletedBatches.affectedRows} รายการ`);
        } catch (error) {
            console.log('⚠️ ไม่พบตาราง production_batches');
        }
        
        // 6. อัปเดต AUTO_INCREMENT กลับไปเป็นค่าเดิม
        console.log('🔄 อัปเดต AUTO_INCREMENT...');
        await connection.execute(`
            ALTER TABLE work_plans AUTO_INCREMENT = ${maxBackupWorkPlanId + 1}
        `);
        console.log(`✅ อัปเดต AUTO_INCREMENT เป็น: ${maxBackupWorkPlanId + 1}`);
        
        // 7. ตรวจสอบผลลัพธ์
        console.log('\n📊 ผลลัพธ์หลัง rollback:');
        const [finalWorkPlans] = await connection.execute('SELECT COUNT(*) as count FROM work_plans');
        const [finalLogs] = await connection.execute('SELECT COUNT(*) as count FROM logs');
        console.log(`- work_plans: ${finalWorkPlans[0].count} รายการ`);
        console.log(`- logs: ${finalLogs[0].count} รายการ`);
        
        // 8. เปรียบเทียบกับ backup
        console.log('\n📊 เปรียบเทียบกับ backup:');
        console.log(`- work_plans: ${finalWorkPlans[0].count} vs ${backupWorkPlans[0].count}`);
        console.log(`- logs: ${finalLogs[0].count} vs ${backupLogs[0].count}`);
        
        if (finalWorkPlans[0].count === backupWorkPlans[0].count) {
            console.log('✅ การ rollback สำเร็จ - จำนวน work_plans ตรงกับ backup');
        } else {
            console.log('⚠️ จำนวน work_plans ไม่ตรงกับ backup');
        }
        
        console.log('\n✅ การ rollback เสร็จสิ้น');
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการ rollback:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// ฟังก์ชันสำหรับแสดงรายการ backup ที่มีอยู่
async function listBackups() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            ...dbConfig,
            database: 'information_schema'
        });
        
        const [backups] = await connection.execute(`
            SELECT SCHEMA_NAME as database_name, 
                   CREATE_TIME as created_at
            FROM SCHEMATA 
            WHERE SCHEMA_NAME LIKE 'esp_tracker_backup_%'
            ORDER BY CREATE_TIME DESC
        `);
        
        if (backups.length === 0) {
            console.log('❌ ไม่พบ backup databases');
        } else {
            backups.forEach((backup, index) => {
                console.log(`${index + 1}. ${backup.database_name} (${backup.created_at})`);
            });
        }
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการแสดงรายการ backup:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--list')) {
        await listBackups();
    } else if (args.includes('--help')) {
        console.log('📋 วิธีใช้งาน rollback_database.js:');
        console.log('  node rollback_database.js                    # Rollback ใช้ backup ล่าสุด');
        console.log('  node rollback_database.js <backup_db_name>   # Rollback ใช้ backup ที่ระบุ');
        console.log('  node rollback_database.js --confirm         # ยืนยันการ rollback');
        console.log('  node rollback_database.js --list            # แสดงรายการ backup');
        console.log('  node rollback_database.js --help            # แสดงวิธีใช้งาน');
    } else {
        // หา backup database name จาก arguments
        const backupDbName = args.find(arg => !arg.startsWith('--'));
        await rollbackDatabase(backupDbName);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { rollbackDatabase, listBackups };
