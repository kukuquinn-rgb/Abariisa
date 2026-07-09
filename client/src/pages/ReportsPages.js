import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import api from '../utils/api';
import {
  Card, CardHeader, Button, Spinner, Alert, Badge
} from '../components/dashboard/UI';
import '../components/dashboard/UI.css';

// ── Colour palettes ──────────────────────────────────────────────────────────
const HEALTH_COLORS = {
  Healthy: '#16a34a', Sick: '#dc2626',
  'Under Treatment': '#d97706', Quarantined: '#2563eb', Deceased: '#6b7280'
};
const SPECIES_COLORS = {
  Cattle: '#166534', Goat: '#15803d', Sheep: '#16a34a',
  Pig: '#4ade80', Poultry: '#86efac', Other: '#d1fae5'
};
const TASK_COLORS = {
  Pending: '#d97706', 'In Progress': '#2563eb',
  Completed: '#16a34a', Overdue: '#dc2626', Acknowledged: '#6b7280'
};
const RISK_COLORS = { Low: '#16a34a', Medium: '#d97706', High: '#dc2626' };

const trustColor = (score) =>
  score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626';

// ── Custom label for pie charts ───────────────────────────────────────────────
const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
      fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function ReportsPage() {
  const navigate = useNavigate();
  const [livestock, setLivestock] = useState(null);
  const [taskStats, setTaskStats] = useState([]);
  const [riskData, setRiskData] = useState(null);
  const [trustScores, setTrustScores] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [lsRes, tsRes, riskRes, trustRes, attRes] = await Promise.all([
          api.get('/livestock/stats'),
          api.get('/tasks/stats'),
          api.get('/tasks/risk-summary').catch(() => ({ data: null })),
          api.get('/trust-scores').catch(() => ({ data: [] })),
          api.get('/attendance')
        ]);
        setLivestock(lsRes.data);
        setTaskStats(tsRes.data);
        setRiskData(riskRes.data);
        setTrustScores(trustRes.data);

        // Group attendance by date for line chart
        const records = attRes.data;
        const byDate = {};
        records.forEach((r) => {
          const date = new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
          if (!byDate[date]) byDate[date] = { date, Present: 0, Late: 0, Absent: 0 };
          byDate[date][r.status] = (byDate[date][r.status] || 0) + 1;
        });
        const sorted = Object.values(byDate).slice(-14);
        setAttendance(sorted);
      } catch (err) {
        console.error('Reports fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <Spinner size="lg" />;

  // Format livestock data for recharts
  const healthData = livestock?.byHealth?.map((h) => ({
    name: h._id, value: h.count
  })) || [];
  const speciesData = livestock?.bySpecies?.map((s) => ({
    name: s._id, value: s.count
  })) || [];

  // Format task stats
  const taskData = taskStats.map((t) => ({ name: t._id, count: t.count }));

  // Format risk counts
  const riskCounts = riskData?.riskCounts?.map((r) => ({
    name: r._id || 'None', value: r.count
  })) || [];

  // Format trust scores for horizontal bar chart
  const trustData = trustScores
    .filter((ts) => ts.worker)
    .map((ts) => ({
      name: ts.worker.name?.split(' ')[0] || 'Worker',
      score: ts.overallScore,
      fill: trustColor(ts.overallScore)
    }));

  return (
    <div>
      {/* Print styles */}
      <style>{`
        @media print {
          .sidebar, .topbar, .no-print { display: none !important; }
          .main-area { margin-left: 0 !important; }
          .page-content { padding: 0 !important; }
          .card { break-inside: avoid; margin-bottom: 1rem; }
        }
      `}</style>

      <div className="page-header">
        <div className="page-header-left">
          <h1>Reports & Analytics</h1>
          <p>Operational overview across all farm modules — {new Date().toLocaleDateString()}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }} className="no-print">
          <Button variant="secondary" icon={<Download size={16} />} onClick={() => window.print()}>
            Download / Print
          </Button>
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* ── Section A: Livestock Status ─────────────────────────────────────── */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader title="Livestock Status" subtitle={`${livestock?.total || 0} total animals across all paddocks`} />
        {healthData.length === 0 ? (
          <Alert variant="info">No livestock records found.</Alert>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>
                Health Status
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={healthData} dataKey="value" nameKey="name"
                    labelLine={false} label={PieLabel} outerRadius={100}>
                    {healthData.map((entry) => (
                      <Cell key={entry.name} fill={HEALTH_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>
                Species Breakdown
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={speciesData} dataKey="value" nameKey="name"
                    labelLine={false} label={PieLabel} outerRadius={100}>
                    {speciesData.map((entry) => (
                      <Cell key={entry.name} fill={SPECIES_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </Card>

      {/* ── Section B: Task Completion ──────────────────────────────────────── */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader title="Task Completion Overview" subtitle="Current task status distribution and risk breakdown" />
        {taskData.length === 0 ? (
          <Alert variant="info">No task data found.</Alert>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>
                Tasks by Status
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={taskData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {taskData.map((entry) => (
                      <Cell key={entry.name} fill={TASK_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>
                Risk Level Distribution
              </p>
              {riskCounts.length === 0 ? (
                <Alert variant="success">No risk flags on active tasks.</Alert>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={riskCounts} dataKey="value" nameKey="name"
                      labelLine={false} label={PieLabel} outerRadius={100}>
                      {riskCounts.map((entry) => (
                        <Cell key={entry.name} fill={RISK_COLORS[entry.name] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ── Section C: Worker Performance ──────────────────────────────────── */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader title="Worker Trust Score Performance"
          subtitle="Ranked lowest to highest — at-risk workers shown first" />
        {trustData.length === 0 ? (
          <Alert variant="info">No trust score data found.</Alert>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(280, trustData.length * 40)}>
            <BarChart data={trustData} layout="vertical"
              margin={{ top: 5, right: 60, bottom: 5, left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={75} />
              <Tooltip formatter={(v) => [`${v}%`, 'Trust Score']} />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {trustData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* ── Section D: Attendance Summary ──────────────────────────────────── */}
      <Card>
        <CardHeader title="Attendance Summary"
          subtitle="Daily attendance trends over the last 14 days" />
        {attendance.length === 0 ? (
          <Alert variant="info">No attendance records found.</Alert>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={attendance} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Present" stroke="#16a34a" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="Late" stroke="#d97706" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Absent" stroke="#dc2626" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}