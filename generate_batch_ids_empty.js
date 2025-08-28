const mysql = require('mysql2/promise');
const fs = require('fs');

// อ่านไฟล์ config.env
const config = {};
const envContent = fs.readFileSync('config.env', 'utf8');
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        config[key.trim()] = value.trim();
    }
});

async function generateBatchIdsEmpty() {
    let connection;
    
    try {
        // สร้างการเชื่อมต่อฐานข้อมูล esp_tracker_empty
        connection = await mysql.createConnection({
            host: config.DB_HOST || 'localhost',
            user: config.DB_USER || 'root',
            password: config.DB_PASSWORD || '',
            database: 'esp_tracker_empty', // เปลี่ยนเป็น esp_tracker_empty
            port: config.DB_PORT || 3306
        });

        console.log('เชื่อมต่อฐานข้อมูล esp_tracker_empty สำเร็จ');

        // 1. ตรวจสอบโครงสร้างของตาราง logs
        console.log('\n--- ตรวจสอบโครงสร้างของตาราง logs ---');
        const [describeResults] = await connection.execute('DESCRIBE logs');
        console.table(describeResults);

        // 2. ตรวจสอบว่าคอลัมน์ batch_id มีอยู่หรือไม่
        console.log('\n--- ตรวจสอบคอลัมน์ batch_id ---');
        const [columnInfo] = await connection.execute(`
            SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                CHARACTER_MAXIMUM_LENGTH,
                IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'esp_tracker_empty' 
              AND TABLE_NAME = 'logs' 
              AND COLUMN_NAME = 'batch_id'
        `);
        
        if (columnInfo.length === 0) {
            console.log('❌ ไม่พบคอลัมน์ batch_id - กำลังเพิ่มคอลัมน์ใหม่...');
            await connection.execute('ALTER TABLE logs ADD COLUMN batch_id VARCHAR(100) NULL');
            console.log('✅ เพิ่มคอลัมน์ batch_id สำเร็จ');
        } else {
            console.table(columnInfo);
            
            // ถ้า batch_id เป็น int ให้เปลี่ยนเป็น VARCHAR
            if (columnInfo[0].DATA_TYPE === 'int') {
                console.log('🔄 กำลังเปลี่ยน batch_id จาก int เป็น VARCHAR(100)...');
                await connection.execute('ALTER TABLE logs MODIFY COLUMN batch_id VARCHAR(100)');
                console.log('✅ เปลี่ยน batch_id เป็น VARCHAR(100) สำเร็จ');
            }
        }

        // 3. ตรวจสอบข้อมูล work_plans
        console.log('\n--- ตรวจสอบข้อมูล work_plans ---');
        const [workPlansData] = await connection.execute(`
            SELECT 
                id,
                job_code,
                job_name,
                COUNT(*) as count
            FROM work_plans 
            WHERE job_code IS NOT NULL 
              AND job_name IS NOT NULL
            GROUP BY id, job_code, job_name
            ORDER BY id DESC
            LIMIT 10
        `);
        console.table(workPlansData);

        // 4. ตรวจสอบข้อมูล logs
        console.log('\n--- ตรวจสอบข้อมูล logs ---');
        const [logsData] = await connection.execute(`
            SELECT 
                COUNT(*) as total_logs,
                COUNT(batch_id) as logs_with_batch_id,
                COUNT(*) - COUNT(batch_id) as logs_without_batch_id
            FROM logs
        `);
        console.table(logsData);

        // 5. Generate batch_id
        console.log('\n--- กำลัง Generate Batch ID ---');
        const [updateResult] = await connection.execute(`
            UPDATE logs l
            JOIN work_plans wp ON l.work_plan_id = wp.id
            SET l.batch_id = CONCAT(
                wp.job_code,
                '+',
                DATE_FORMAT(l.timestamp, '%y%m%d'),
                '(',
                wp.job_name,
                ')'
            )
            WHERE l.batch_id IS NULL 
              AND l.work_plan_id IS NOT NULL
              AND wp.job_code IS NOT NULL
              AND wp.job_name IS NOT NULL
        `);
        console.log(`✅ อัปเดต batch_id สำเร็จ ${updateResult.affectedRows} แถว`);

        // 6. แสดงผลลัพธ์
        console.log('\n--- ผลลัพธ์การ Generate Batch ID ---');
        const [resultData] = await connection.execute(`
            SELECT 
                'อัปเดต batch_id สำเร็จ' as status,
                COUNT(*) as updated_records
            FROM logs 
            WHERE batch_id IS NOT NULL
        `);
        console.table(resultData);

        // 7. แสดงตัวอย่างข้อมูลที่อัปเดตแล้ว
        console.log('\n--- ตัวอย่างข้อมูลที่อัปเดตแล้ว ---');
        const [sampleData] = await connection.execute(`
            SELECT 
                id,
                work_plan_id,
                batch_id,
                process_number,
                status,
                timestamp,
                DATE_FORMAT(timestamp, '%y%m%d') as formatted_date
            FROM logs 
            WHERE batch_id IS NOT NULL
            ORDER BY timestamp DESC
            LIMIT 10
        `);
        console.table(sampleData);

        console.log('\n🎉 Generate Batch IDs ใน esp_tracker_empty เสร็จสิ้น!');

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('ปิดการเชื่อมต่อฐานข้อมูล');
        }
    }
}

// รันฟังก์ชัน
generateBatchIdsEmpty();
