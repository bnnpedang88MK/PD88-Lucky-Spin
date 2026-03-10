'use client';

import { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Tooltip, ResponsiveContainer, XAxis, YAxis, Cell } from 'recharts';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';
const COLORS = ['#3ba55d', '#6ccf89', '#16a34a', '#22c55e', '#14532d'];

const initialFilters = { search: '', prize: 'all', startDate: '', endDate: '', page: 1, pageSize: 8 };

function Card({ label, value }) {
  return <div className="card"><p>{label}</p><h3>{value}</h3></div>;
}

export default function DashboardPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [funnel, setFunnel] = useState(null);
  const [claims, setClaims] = useState({ data: [], total: 0, page: 1, pageSize: 8 });
  const [topUsers, setTopUsers] = useState([]);

  const qs = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
    return params.toString();
  }, [filters]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const endpoints = ['summary', 'activity', 'prize-distribution', 'funnel', 'claims', 'top-users'];
      const responses = await Promise.all(
        endpoints.map((ep) => fetch(`${API_BASE}/${ep}?${qs}`, { cache: 'no-store' }).then((r) => {
          if (!r.ok) throw new Error(`Failed: ${ep}`);
          return r.json();
        }))
      );

      setSummary(responses[0]);
      setActivity(responses[1]);
      setDistribution(responses[2]);
      setFunnel(responses[3]);
      setClaims(responses[4]);
      setTopUsers(responses[5]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [qs]);

  function exportCsv() {
    const header = ['ID', 'Username', 'Email', 'Prize', 'Value', 'Claimed At', 'Distributed'];
    const rows = claims.data.map((r) => [r.id, r.username, r.email, r.prizeName, r.cash_value, r.claimed_at, r.is_distributed ? 'Yes' : 'No']);
    const csv = [header, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'voucher-claims.csv');
    link.click();
  }

  const funnelData = funnel ? [
    { stage: 'Users', value: funnel.totalUsers },
    { stage: 'Login', value: funnel.loggedInUsers },
    { stage: 'Spun', value: funnel.spunUsers },
    { stage: 'Claimed', value: funnel.claimedUsers },
    { stage: 'Distributed', value: funnel.distributedUsers }
  ] : [];

  return (
    <main className="container">
      <header className="header"><h1>PEDANG88 Lucky Spin Analytics</h1></header>

      <section className="filters card">
        <input placeholder="Search user/email" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} />
        <select value={filters.prize} onChange={(e) => setFilters((f) => ({ ...f, prize: e.target.value, page: 1 }))}>
          <option value="all">All prizes</option>
          <option value="Free Spin x5">Free Spin x5</option>
          <option value="Cash Voucher RM20">Cash Voucher RM20</option>
          <option value="Cash Voucher RM50">Cash Voucher RM50</option>
          <option value="Bonus Credit RM10">Bonus Credit RM10</option>
          <option value="Jackpot RM100">Jackpot RM100</option>
        </select>
        <input type="date" value={filters.startDate} onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value, page: 1 }))} />
        <input type="date" value={filters.endDate} onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value, page: 1 }))} />
        <button onClick={exportCsv}>Export CSV</button>
      </section>

      {loading && <div className="state">Loading dashboard data...</div>}
      {error && <div className="state error">{error}</div>}
      {!loading && !error && (
        <>
          <section className="grid grid-6">
            <Card label="Search Hits" value={summary?.searchHits ?? 0} />
            <Card label="Logins" value={summary?.loginUsers ?? 0} />
            <Card label="Visitors" value={summary?.visitors ?? 0} />
            <Card label="Claimed Vouchers" value={summary?.claimedVouchers ?? 0} />
            <Card label="Distributed Vouchers" value={summary?.distributedVouchers ?? 0} />
            <Card label="Total Prize Out" value={`RM ${Number(summary?.totalPrizeOut || 0).toFixed(2)}`} />
          </section>

          <section className="grid grid-3">
            <div className="card chart"><h3>Activity Trend</h3><ResponsiveContainer width="100%" height={240}><AreaChart data={activity}><XAxis dataKey="day" /><YAxis /><Tooltip /><Area dataKey="claims" stroke="#22c55e" fill="#166534" /></AreaChart></ResponsiveContainer></div>
            <div className="card chart"><h3>Prize Distribution</h3><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={distribution} dataKey="totalClaims" nameKey="name" outerRadius={90}>{distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
            <div className="card chart"><h3>Conversion Funnel</h3><ResponsiveContainer width="100%" height={240}><BarChart data={funnelData}><XAxis dataKey="stage" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#15803d" /></BarChart></ResponsiveContainer></div>
          </section>

          <section className="grid grid-2">
            <div className="card tableCard">
              <h3>Latest Voucher Claims</h3>
              {claims.data.length === 0 ? <div className="state">No claims found.</div> : (
                <table><thead><tr><th>User</th><th>Prize</th><th>Value</th><th>Claimed At</th><th>Status</th></tr></thead><tbody>
                  {claims.data.map((c) => <tr key={c.id}><td>{c.username}</td><td>{c.prizeName}</td><td>RM {Number(c.cash_value).toFixed(2)}</td><td>{new Date(c.claimed_at).toLocaleString()}</td><td>{c.is_distributed ? 'Distributed' : 'Pending'}</td></tr>)}
                </tbody></table>
              )}
              <div className="pagination">
                <button disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>Prev</button>
                <span>Page {claims.page} / {Math.max(1, Math.ceil(claims.total / claims.pageSize))}</span>
                <button disabled={claims.page >= Math.ceil(claims.total / claims.pageSize)} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>Next</button>
              </div>
            </div>

            <div className="card tableCard">
              <h3>Top Lucky Spin Users</h3>
              {topUsers.length === 0 ? <div className="state">No top users available.</div> : (
                <table><thead><tr><th>User</th><th>Email</th><th>Claims</th><th>Total Won</th></tr></thead><tbody>
                  {topUsers.map((u) => <tr key={u.id}><td>{u.username}</td><td>{u.email}</td><td>{u.claimsCount}</td><td>RM {Number(u.totalWon).toFixed(2)}</td></tr>)}
                </tbody></table>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
