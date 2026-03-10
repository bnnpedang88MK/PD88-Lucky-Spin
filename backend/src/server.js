import express from 'express';
import cors from 'cors';
import pool from './db.js';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

app.use(cors({ origin: frontendOrigin }));
app.use(express.json());

const querySchema = z.object({
  search: z.string().optional(),
  prize: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional()
});

function buildFilters(params) {
  const filters = [];
  const values = [];

  if (params.search) {
    filters.push('(u.username LIKE ? OR u.email LIKE ?)');
    values.push(`%${params.search}%`, `%${params.search}%`);
  }

  if (params.prize && params.prize !== 'all') {
    filters.push('p.name = ?');
    values.push(params.prize);
  }

  if (params.startDate) {
    filters.push('vc.claimed_at >= ?');
    values.push(`${params.startDate} 00:00:00`);
  }

  if (params.endDate) {
    filters.push('vc.claimed_at <= ?');
    values.push(`${params.endDate} 23:59:59`);
  }

  return {
    whereClause: filters.length ? `WHERE ${filters.join(' AND ')}` : '',
    values
  };
}

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/summary', async (req, res) => {
  try {
    const params = querySchema.parse(req.query);
    const { whereClause, values } = buildFilters(params);

    const [rows] = await pool.query(
      `SELECT
        COUNT(DISTINCT vc.user_id) AS visitors,
        COUNT(vc.id) AS claimedVouchers,
        SUM(vc.is_distributed = 1) AS distributedVouchers,
        COALESCE(SUM(p.cash_value),0) AS totalPrizeOut,
        COUNT(DISTINCT CASE WHEN u.last_login_at IS NOT NULL THEN u.id END) AS loginUsers,
        COUNT(DISTINCT CASE WHEN (u.username LIKE ? OR u.email LIKE ?) THEN u.id END) AS searchHits
      FROM voucher_claims vc
      JOIN users u ON vc.user_id = u.id
      JOIN prizes p ON vc.prize_id = p.id
      ${whereClause}`,
      [`%${params.search || ''}%`, `%${params.search || ''}%`, ...values]
    );

    res.json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/activity', async (req, res) => {
  try {
    const params = querySchema.parse(req.query);
    const { whereClause, values } = buildFilters(params);
    const [rows] = await pool.query(
      `SELECT DATE(vc.claimed_at) as day,
              COUNT(*) as claims,
              COUNT(DISTINCT vc.user_id) as users
       FROM voucher_claims vc
       JOIN users u ON vc.user_id = u.id
       JOIN prizes p ON vc.prize_id = p.id
       ${whereClause}
       GROUP BY DATE(vc.claimed_at)
       ORDER BY day ASC`,
      values
    );
    res.json(rows);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/prize-distribution', async (req, res) => {
  try {
    const params = querySchema.parse(req.query);
    const { whereClause, values } = buildFilters(params);
    const [rows] = await pool.query(
      `SELECT p.name, COUNT(*) as totalClaims, COALESCE(SUM(p.cash_value),0) as prizeValue
       FROM voucher_claims vc
       JOIN users u ON vc.user_id = u.id
       JOIN prizes p ON vc.prize_id = p.id
       ${whereClause}
       GROUP BY p.name
       ORDER BY totalClaims DESC`,
      values
    );
    res.json(rows);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/funnel', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM users) AS totalUsers,
        (SELECT COUNT(*) FROM users WHERE last_login_at IS NOT NULL) AS loggedInUsers,
        (SELECT COUNT(DISTINCT user_id) FROM spins) AS spunUsers,
        (SELECT COUNT(DISTINCT user_id) FROM voucher_claims) AS claimedUsers,
        (SELECT COUNT(DISTINCT user_id) FROM voucher_claims WHERE is_distributed = 1) AS distributedUsers`
    );
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/claims', async (req, res) => {
  try {
    const params = querySchema.parse(req.query);
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    const offset = (page - 1) * pageSize;
    const { whereClause, values } = buildFilters(params);

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total
       FROM voucher_claims vc
       JOIN users u ON vc.user_id = u.id
       JOIN prizes p ON vc.prize_id = p.id
       ${whereClause}`,
      values
    );

    const [rows] = await pool.query(
      `SELECT vc.id, u.username, u.email, p.name as prizeName, p.cash_value, vc.claimed_at, vc.is_distributed
       FROM voucher_claims vc
       JOIN users u ON vc.user_id = u.id
       JOIN prizes p ON vc.prize_id = p.id
       ${whereClause}
       ORDER BY vc.claimed_at DESC
       LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    res.json({
      page,
      pageSize,
      total: countRows[0].total,
      data: rows
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/top-users', async (req, res) => {
  try {
    const params = querySchema.parse(req.query);
    const { whereClause, values } = buildFilters(params);
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.email, COUNT(vc.id) as claimsCount, COALESCE(SUM(p.cash_value),0) as totalWon
       FROM voucher_claims vc
       JOIN users u ON vc.user_id = u.id
       JOIN prizes p ON vc.prize_id = p.id
       ${whereClause}
       GROUP BY u.id, u.username, u.email
       ORDER BY claimsCount DESC, totalWon DESC
       LIMIT 10`,
      values
    );
    res.json(rows);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/alerts', async (_, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 'high_claim_rate' as type, CONCAT(COUNT(*), ' claims in last 24h') as message
       FROM voucher_claims
       WHERE claimed_at >= NOW() - INTERVAL 1 DAY
       HAVING COUNT(*) > 20
       UNION
       SELECT 'low_distribution' as type, CONCAT(ROUND((SUM(is_distributed=1)/COUNT(*))*100,2), '% distributed') as message
       FROM voucher_claims
       HAVING (SUM(is_distributed=1)/COUNT(*)) < 0.7`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
