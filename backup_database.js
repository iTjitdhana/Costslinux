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

async function backupDatabase() {
    let connection;
    
    try {
        console.log('🔄 เริ่มกระบวนการ backup ข้อมูล...');
        
        connection = await mysql.createConnection(dbConfig);
        
        // สร้างชื่อ backup database พร้อม timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupDbName = `esp_tracker_backup_${timestamp}`;
        
        console.log(`📁 สร้าง backup database: ${backupDbName}`);
        
        // 1. สร้าง backup database
        await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${backupDbName}\``);
        console.log('✅ สร้าง backup database สำเร็จ');
        
        // 2. Backup work_plans table
        console.log('🔄 กำลัง backup work_plans...');
        await connection.execute(`
            CREATE TABLE \`${backupDbName}\`.work_plans_backup AS 
            SELECT * FROM work_plans
        `);
        
        // 3. Backup logs table
        console.log('🔄 กำลัง backup logs...');
        await connection.execute(`
            CREATE TABLE \`${backupDbName}\`.logs_backup AS 
            SELECT * FROM logs
        `);
        
        // 4. Backup production_batches table (ถ้ามี)
        console.log('🔄 กำลัง backup production_batches...');
        try {
            await connection.execute(`
                CREATE TABLE \`${backupDbName}\`.production_batches_backup AS 
                SELECT * FROM production_batches
            `);
        } catch (error) {
            console.log('⚠️ ไม่พบตาราง production_batches หรือไม่มีข้อมูล');
        }
        
        // 5. Backup finished_flags table
        console.log('🔄 กำลัง backup finished_flags...');
        try {
            await connection.execute(`
                CREATE TABLE \`${backupDbName}\`.finished_flags_backup AS 
                SELECT * FROM finished_flags
            `);
        } catch (error) {
            console.log('⚠️ ไม่พบตาราง finished_flags หรือไม่มีข้อมูล');
        }
        
        // 6. Backup work_plan_operators table (ถ้ามี)
        console.log('🔄 กำลัง backup work_plan_operators...');
        try {
            await connection.execute(`
                CREATE TABLE \`${backupDbName}\`.work_plan_operators_backup AS 
                SELECT * FROM work_plan_operators
            `);
        } catch (error) {
            console.log('⚠️ ไม่พบตาราง work_plan_operators หรือไม่มีข้อมูล');
        }
        
        // 7. สร้างรายงาน backup
        console.log('\n📊 รายงานการ backup:');
        
        const [workPlansCount] = await connection.execute(`SELECT COUNT(*) as count FROM \`${backupDbName}\`.work_plans_backup`);
        const [logsCount] = await connection.execute(`SELECT COUNT(*) as count FROM \`${backupDbName}\`.logs_backup`);
        
        console.log(`- Backup database: ${backupDbName}`);
        console.log(`- work_plans: ${workPlansCount[0].count} รายการ`);
        console.log(`- logs: ${logsCount[0].count} รายการ`);
        console.log(`- เวลา: ${new Date().toLocaleString('th-TH')}`);
        
        // 8. บันทึกชื่อ backup database ลงไฟล์
        const fs = require('fs');
        const backupInfo = {
            backupDatabase: backupDbName,
            timestamp: new Date().toISOString(),
            workPlansCount: workPlansCount[0].count,
            logsCount: logsCount[0].count
        };
        
        fs.writeFileSync('backup_info.json', JSON.stringify(backupInfo, null, 2));
        console.log('\n💾 บันทึกข้อมูล backup ลงไฟล์ backup_info.json');
        
        console.log('\n✅ การ backup ข้อมูลเสร็จสิ้น');
        console.log(`📁 ชื่อ backup database: ${backupDbName}`);
        console.log('⚠️  เก็บชื่อ database นี้ไว้สำหรับการ rollback หากจำเป็น');
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการ backup:', error);
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
        
        console.log('📋 รายการ backup databases ที่มีอยู่:');
        
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
    } else {
        await backupDatabase();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { backupDatabase, listBackups };
