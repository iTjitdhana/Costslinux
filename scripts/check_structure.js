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

async function checkStructure() {
    let connection;
    
    try {
        // สร้างการเชื่อมต่อฐานข้อมูล
        connection = await mysql.createConnection({
            host: config.DB_HOST || 'localhost',
            user: config.DB_USER || 'root',
            password: config.DB_PASSWORD || '',
            database: config.DB_NAME || 'esp_tracker',
            port: config.DB_PORT || 3306
        });

        console.log('เชื่อมต่อฐานข้อมูลสำเร็จ');

        // ตรวจสอบโครงสร้างของตาราง logs
        console.log('\n--- ตรวจสอบโครงสร้างของตาราง logs ---');
        const [describeResults] = await connection.execute('DESCRIBE logs');
        console.table(describeResults);

        // ตรวจสอบขนาดของคอลัมน์ batch_id
        console.log('\n--- ตรวจสอบขนาดของคอลัมน์ batch_id ---');
        const [columnInfo] = await connection.execute(`
            SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                CHARACTER_MAXIMUM_LENGTH,
                IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'esp_tracker' 
              AND TABLE_NAME = 'logs' 
              AND COLUMN_NAME = 'batch_id'
        `);
        console.table(columnInfo);

        // ดูตัวอย่างข้อมูล work_plans เพื่อประเมินความยาวของ batch_id
        console.log('\n--- ดูตัวอย่างข้อมูล work_plans เพื่อประเมินความยาวของ batch_id ---');
        const [sampleData] = await connection.execute(`
            SELECT 
                wp.id,
                wp.job_code,
                wp.job_name,
                LENGTH(wp.job_code) as job_code_length,
                LENGTH(wp.job_name) as job_name_length,
                CONCAT(
                    wp.job_code,
                    '+',
                    DATE_FORMAT(NOW(), '%y%m%d'),
                    '(',
                    wp.job_name,
                    ')'
                ) as sample_batch_id,
                LENGTH(CONCAT(
                    wp.job_code,
                    '+',
                    DATE_FORMAT(NOW(), '%y%m%d'),
                    '(',
                    wp.job_name,
                    ')'
                )) as batch_id_length
            FROM work_plans wp
            WHERE wp.job_code IS NOT NULL 
              AND wp.job_name IS NOT NULL
            ORDER BY batch_id_length DESC
            LIMIT 10
        `);
        console.table(sampleData);

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
checkStructure();
