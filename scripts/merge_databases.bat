@echo off
chcp 65001 >nul
echo ========================================
echo    Merge Database Script for Windows
echo ========================================
echo.

echo 🔍 ขั้นตอนที่ 1: ตรวจสอบข้อมูลก่อน merge
echo.
node generate_batch_ids.js --check
echo.

echo.
echo ⚠️  หมายเหตุ: ควรทำ backup ข้อมูลก่อนดำเนินการต่อ
echo.
echo 🔄 ขั้นตอนที่ 1.5: ทำการ backup ข้อมูล
echo.
node backup_database.js
echo.

set /p confirm="ต้องการดำเนินการ merge ต่อหรือไม่? (y/N): "
if /i "%confirm%"=="y" (
    echo.
    echo 🔄 ขั้นตอนที่ 2: ทำการ merge ข้อมูล
    echo.
    node generate_batch_ids.js --merge
    echo.
    
    echo 🔍 ขั้นตอนที่ 3: ตรวจสอบผลลัพธ์
    echo.
    node verify_merge.js --detailed
    echo.
    
    echo ✅ การ merge ข้อมูลเสร็จสิ้น
) else (
    echo ❌ ยกเลิกการดำเนินการ
)

echo.
echo กด Enter เพื่อปิดหน้าต่าง...
pause >nul
