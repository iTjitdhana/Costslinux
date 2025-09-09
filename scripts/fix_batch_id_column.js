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

async function fixBatchIdColumn() {
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

        // อ่านไฟล์ SQL
        const sqlScript = fs.readFileSync('fix_batch_id_column.sql', 'utf8');
        
        // แยกคำสั่ง SQL แต่ละคำสั่ง
        const statements = sqlScript.split(';').filter(stmt => stmt.trim());
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            if (statement) {
                console.log(`\n--- รันคำสั่งที่ ${i + 1} ---`);
                console.log(statement.substring(0, 100) + '...');
                
                try {
                    const [results] = await connection.execute(statement);
                    
                    if (results.affectedRows !== undefined) {
                        console.log(`✅ อัปเดต ${results.affectedRows} แถว`);
                    } else if (Array.isArray(results)) {
                        console.log(`✅ ผลลัพธ์: ${results.length} แถว`);
                        if (results.length > 0) {
                            console.table(results.slice(0, 5)); // แสดงแค่ 5 แถวแรก
                        }
                    }
                } catch (error) {
                    console.error(`❌ เกิดข้อผิดพลาด:`, error.message);
                }
            }
        }

        console.log('\n🎉 แก้ไขคอลัมน์ batch_id เสร็จสิ้น!');

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('ปิดการเชื่อมต่อฐานข้อมูล');
        }
    }
}

// รันฟังก์ชัน
fixBatchIdColumn();
