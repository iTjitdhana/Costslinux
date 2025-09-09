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

async function checkLogs() {
    let connection;
    
    try {
        console.log('🔍 ตรวจสอบข้อมูล Logs...');
        
        connection = await mysql.createConnection(dbConfig);
        
        // 1. จำนวน logs ทั้งหมด
        console.log('\n📊 จำนวน Logs ทั้งหมด:');
        const [totalLogs] = await connection.execute('SELECT COUNT(*) as count FROM logs');
        console.log(`- Total logs: ${totalLogs[0].count} รายการ`);
        
        // 2. แยกตาม status
        console.log('\n📊 Logs แยกตาม Status:');
        const [statusLogs] = await connection.execute(`
            SELECT 
                status,
                COUNT(*) as count,
                MIN(timestamp) as earliest,
                MAX(timestamp) as latest
            FROM logs 
            GROUP BY status
            ORDER BY count DESC
        `);
        
        statusLogs.forEach(status => {
            console.log(`- ${status.status}: ${status.count} รายการ (${status.earliest} ถึง ${status.latest})`);
        });
        
        // 3. แยกตามวันที่
        console.log('\n📊 Logs แยกตามวันที่ (10 วันล่าสุด):');
        const [dateLogs] = await connection.execute(`
            SELECT 
                DATE(timestamp) as date,
                COUNT(*) as total_logs,
                SUM(CASE WHEN status = 'start' THEN 1 ELSE 0 END) as start_count,
                SUM(CASE WHEN status = 'stop' THEN 1 ELSE 0 END) as stop_count
            FROM logs 
            GROUP BY DATE(timestamp)
            ORDER BY date DESC
            LIMIT 10
        `);
        
        dateLogs.forEach(date => {
            console.log(`- ${date.date}: ${date.total_logs} รายการ (start: ${date.start_count}, stop: ${date.stop_count})`);
        });
        
        // 4. Logs ที่มี work_plan_id
        console.log('\n📊 Logs ที่มี work_plan_id:');
        const [withWorkPlan] = await connection.execute('SELECT COUNT(*) as count FROM logs WHERE work_plan_id IS NOT NULL');
        const [withoutWorkPlan] = await connection.execute('SELECT COUNT(*) as count FROM logs WHERE work_plan_id IS NULL');
        console.log(`- มี work_plan_id: ${withWorkPlan[0].count} รายการ`);
        console.log(`- ไม่มี work_plan_id: ${withoutWorkPlan[0].count} รายการ`);
        
        // 5. Logs ที่มี batch_id
        console.log('\n📊 Logs ที่มี batch_id:');
        const [withBatchId] = await connection.execute('SELECT COUNT(*) as count FROM logs WHERE batch_id IS NOT NULL');
        const [withoutBatchId] = await connection.execute('SELECT COUNT(*) as count FROM logs WHERE batch_id IS NULL');
        console.log(`- มี batch_id: ${withBatchId[0].count} รายการ`);
        console.log(`- ไม่มี batch_id: ${withoutBatchId[0].count} รายการ`);
        
        // 6. ช่วงเวลาของ logs
        console.log('\n📊 ช่วงเวลาของ Logs:');
        const [timeRange] = await connection.execute(`
            SELECT 
                MIN(timestamp) as earliest_log,
                MAX(timestamp) as latest_log,
                DATEDIFF(MAX(timestamp), MIN(timestamp)) as days_span
            FROM logs
        `);
        
        console.log(`- เริ่มต้น: ${timeRange[0].earliest_log}`);
        console.log(`- สิ้นสุด: ${timeRange[0].latest_log}`);
        console.log(`- จำนวนวัน: ${timeRange[0].days_span} วัน`);
        
        // 7. Logs ล่าสุด 20 รายการ
        console.log('\n📊 Logs ล่าสุด 20 รายการ:');
        const [recentLogs] = await connection.execute(`
            SELECT 
                id,
                work_plan_id,
                batch_id,
                process_number,
                status,
                timestamp
            FROM logs 
            ORDER BY timestamp DESC
            LIMIT 20
        `);
        
        recentLogs.forEach(log => {
            console.log(`- ID: ${log.id}, work_plan_id: ${log.work_plan_id}, batch_id: ${log.batch_id}, status: ${log.status}, time: ${log.timestamp}`);
        });
        
        // 8. Logs เก่าสุด 20 รายการ
        console.log('\n📊 Logs เก่าสุด 20 รายการ:');
        const [oldLogs] = await connection.execute(`
            SELECT 
                id,
                work_plan_id,
                batch_id,
                process_number,
                status,
                timestamp
            FROM logs 
            ORDER BY timestamp ASC
            LIMIT 20
        `);
        
        oldLogs.forEach(log => {
            console.log(`- ID: ${log.id}, work_plan_id: ${log.work_plan_id}, batch_id: ${log.batch_id}, status: ${log.status}, time: ${log.timestamp}`);
        });
        
        // 9. Logs ที่ซ้ำกัน (ถ้ามี)
        console.log('\n📊 Logs ที่ซ้ำกัน:');
        const [duplicateLogs] = await connection.execute(`
            SELECT 
                work_plan_id,
                batch_id,
                process_number,
                status,
                timestamp,
                COUNT(*) as duplicate_count
            FROM logs 
            GROUP BY work_plan_id, batch_id, process_number, status, timestamp
            HAVING COUNT(*) > 1
            ORDER BY duplicate_count DESC
            LIMIT 10
        `);
        
        if (duplicateLogs.length > 0) {
            duplicateLogs.forEach(dup => {
                console.log(`- work_plan_id: ${dup.work_plan_id}, batch_id: ${dup.batch_id}, status: ${dup.status}, time: ${dup.timestamp}, count: ${dup.duplicate_count}`);
            });
        } else {
            console.log('✅ ไม่พบ logs ที่ซ้ำกัน');
        }
        
        // 10. Logs แยกตาม work_plan_id (top 10)
        console.log('\n📊 Logs แยกตาม work_plan_id (top 10):');
        const [workPlanLogs] = await connection.execute(`
            SELECT 
                work_plan_id,
                COUNT(*) as log_count,
                MIN(timestamp) as first_log,
                MAX(timestamp) as last_log
            FROM logs 
            WHERE work_plan_id IS NOT NULL
            GROUP BY work_plan_id
            ORDER BY log_count DESC
            LIMIT 10
        `);
        
        workPlanLogs.forEach(wp => {
            console.log(`- work_plan_id: ${wp.work_plan_id}, logs: ${wp.log_count}, first: ${wp.first_log}, last: ${wp.last_log}`);
        });
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการตรวจสอบ logs:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// ฟังก์ชันสำหรับดู logs ทั้งหมด (ไม่มี LIMIT)
async function showAllLogs() {
    let connection;
    
    try {
        console.log('📋 แสดง Logs ทั้งหมด (ไม่มี LIMIT)...');
        
        connection = await mysql.createConnection(dbConfig);
        
        const [allLogs] = await connection.execute(`
            SELECT 
                id,
                work_plan_id,
                batch_id,
                process_number,
                status,
                timestamp,
                DATE(timestamp) as date_only,
                TIME(timestamp) as time_only
            FROM logs 
            ORDER BY timestamp DESC
        `);
        
        console.log(`\n📊 พบ logs ทั้งหมด: ${allLogs.length} รายการ`);
        console.log('\nรายละเอียด logs:');
        console.log('ID | work_plan_id | batch_id | process | status | timestamp');
        console.log('---|-------------|----------|---------|--------|----------');
        
        allLogs.forEach(log => {
            console.log(`${log.id} | ${log.work_plan_id || 'NULL'} | ${log.batch_id || 'NULL'} | ${log.process_number || 'NULL'} | ${log.status} | ${log.timestamp}`);
        });
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการแสดง logs ทั้งหมด:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--all')) {
        await showAllLogs();
    } else {
        await checkLogs();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { checkLogs, showAllLogs };
