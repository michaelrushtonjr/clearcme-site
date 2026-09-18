// Read-only aggregate reporting. Pass DATABASE_URL explicitly; no env files load here.
import pg from 'pg';
const days = Number(process.argv[2] ?? 28);
if (!Number.isInteger(days) || days < 1 || days > 366) throw new Error('Usage: DATABASE_URL=… node scripts/seo-report.mjs [1–366 days]');
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL explicitly for the intended environment.');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('BEGIN READ ONLY');
  const result = await client.query(`SELECT cluster, channel, landing, event, sum(count)::int AS count
    FROM "SeoDailyMetric" WHERE day >= (CURRENT_DATE - ($1::int - 1))
    GROUP BY cluster, channel, landing, event ORDER BY cluster, channel, landing, event`, [days]);
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), days, window: 'UTC calendar days including today', attribution: 'First eligible public landing page within 30 days before registration', rows: result.rows }, null, 2));
  await client.query('COMMIT');
} finally { await client.end(); }
