@echo off
echo Starting Google Sheets Import...
cd /d "%~dp0"
node scripts/import-google-sheets.js
pause





