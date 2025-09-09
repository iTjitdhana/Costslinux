// Quick status-test runner: node scripts/status_test.js 2025-09-09 [work_plan_id]
const { query } = require('../backend/database/connection');

async function main() {
  const dateArg = process.argv[2];
  const wpIdArg = process.argv[3] ? parseInt(process.argv[3], 10) : null;
  const date = dateArg || new Date().toISOString().slice(0, 10);

  const whereExtra = wpIdArg ? ' AND wp.id = ?' : '';
  const params = wpIdArg ? [date, wpIdArg] : [date];

  const sql = `
    SELECT
      wp.id AS work_plan_id,
      wp.job_code,
      wp.job_name,
      wp.status_id,
      CASE WHEN ff.work_plan_id IS NULL THEN 0 ELSE 1 END AS has_finished_record,
      COALESCE(ff.is_finished, 0) AS is_finished_flag,
      (
        SELECT COUNT(*) FROM logs l
        WHERE l.work_plan_id = wp.id
          AND DATE(l.timestamp) = DATE(wp.production_date)
          AND l.status = 'start'
      ) AS start_logs_count
    FROM work_plans wp
    LEFT JOIN finished_flags ff ON ff.work_plan_id = wp.id
    WHERE DATE(wp.production_date) = ?${whereExtra}
    ORDER BY wp.id
  `;

  try {
    const rows = await query(sql, params);
    const mapped = rows.map(r => {
      const statusId = Number(r.status_id);
      const hasFinished = Number(r.has_finished_record) === 1;
      const finishedFlag = Number(r.is_finished_flag) === 1;
      const startLogs = Number(r.start_logs_count) || 0;
      let status = 'pending';
      if (statusId === 9) status = 'cancelled';
      else if (hasFinished || finishedFlag) status = 'completed';
      else if (startLogs > 0) status = 'in_progress';

      return { ...r, status_id: statusId, has_finished_record: Number(r.has_finished_record), is_finished_flag: Number(r.is_finished_flag), start_logs_count: startLogs, computed_status: status };
    });

    console.log(JSON.stringify({ date, count: mapped.length, data: mapped }, null, 2));
  } catch (err) {
    console.error('status_test error:', err.message);
    process.exit(1);
  }
}

main();


