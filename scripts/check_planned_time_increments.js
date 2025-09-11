// Node script: Validate planned time increments are in 15-minute steps
// Usage:
//   node scripts/check_planned_time_increments.js [fromDate] [toDate]
// Examples:
//   node scripts/check_planned_time_increments.js           # today only
//   node scripts/check_planned_time_increments.js 2025-09-09 2025-09-09

const axios = require('axios');

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatHM(mins) {
  const m = Number(mins || 0);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

async function main() {
  const from = process.argv[2] || todayISO();
  const to = process.argv[3] || from;
  // Allow override via CLI: --base=http://host:port
  const baseArg = (process.argv.find(a => a.startsWith('--base=')) || '').split('=')[1];
  const baseURL = (baseArg && baseArg.trim()) || process.env.COSTS_API_BASE_URL || 'http://localhost:3104';

  console.log(`🔎 ตรวจสอบช่วงวันที่ ${from} ถึง ${to}`);
  console.log(`📡 เรียก API: ${baseURL}/api/costs/logs-summary`);

  try {
    const res = await axios.get(`${baseURL}/api/costs/logs-summary`, {
      params: { from, to }
    });
    const rows = res.data?.data || [];

    const allowedMinutes = new Set([0, 15, 30, 45]);
    const issues = [];

    for (const r of rows) {
      const mins = Number(r.planned_total_minutes);
      if (!Number.isFinite(mins) || mins <= 0) continue; // skip empty/null
      const minutePart = mins % 60;
      if (!allowedMinutes.has(minutePart)) {
        issues.push({
          work_plan_id: r.work_plan_id,
          job_code: r.job_code,
          job_name: r.job_name,
          production_date: r.production_date,
          planned_start_time: r.planned_start_time,
          planned_end_time: r.planned_end_time,
          planned_total_hm: formatHM(mins),
          minute_part: String(minutePart).padStart(2, '0')
        });
      }
    }

    console.log(`\n📊 รายการทั้งหมด: ${rows.length}`);
    console.log(`⚠️  พบรายการนาทีไม่ลงตัว (ไม่ใช่ 00,15,30,45): ${issues.length}`);

    if (issues.length) {
      console.log('\nรายละเอียดรายการที่ต้องตรวจสอบ:');
      for (const it of issues) {
        console.log(
          `- WP#${it.work_plan_id} | ${it.job_code} ${it.job_name} | วันที่ ${it.production_date} | ตามแผน ${it.planned_start_time || '-'} - ${it.planned_end_time || '-'} | รวม ${it.planned_total_hm} (นาที ${it.minute_part})`
        );
      }
    } else {
      console.log('\n✅ ไม่พบรายการที่นาทีผิดเงื่อนไข');
    }

    console.log('\nเสร็จสิ้น');
  } catch (err) {
    console.error('❌ เรียก API ล้มเหลว:', err?.response?.data || err.message);
    process.exitCode = 1;
  }
}

main();


