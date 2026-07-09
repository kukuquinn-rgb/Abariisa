import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import api from '../utils/api';
import { Card, CardHeader, Button, Spinner } from '../components/dashboard/UI';
import '../components/dashboard/UI.css';

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

const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle"
      dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const NoData = ({ msg }) => (
  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem',
    padding: '2rem', textAlign: 'center' }}>{msg}</p>
);

export default function ReportsPage() {
  const navigate = useNavigate();
  const [livestock, setLivestock] = useState(null);
  const [taskStats, setTaskStats] = useState([]);
  const [riskCounts, setRiskCounts] = useState([]);
  const [trustScores, setTrustScores] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [lsRes, tsRes, trustRes, attRes] = await Promise.all([
          api.get('/livestock/stats'),
          api.get('/tasks/stats'),
          api.get('/trust-scores').catch(() => ({ data: [] })),
          api.get('/attendance')
        ]);

        setLivestock(lsRes.data);
        setTaskStats(Array.isArray(tsRes.data) ? tsRes.data : []);
        setTrustScores(Array.isArray(trustRes.data) ? trustRes.data : []);

        // Try risk summary separately
        try {
          const riskRes = await api.get('/tasks/risk-summary');
          setRiskCounts(Array.isArray(riskRes.data?.riskCounts)
            ? riskRes.data.riskCounts : []);
        } catch { setRiskCounts([]); }

        // Group attendance by date
        const records = Array.isArray(attRes.data) ? attRes.data : [];
        const byDate = {};
        records.forEach((r) => {
          const date = new Date(r.date).toLocaleDateString('en-GB',
            { day: '2-digit', month: 'short' });
          if (!byDate[date]) byDate[date] = { date, Present: 0, Late: 0, Absent: 0 };
          const status = r.status || 'Present';
          byDate[date][status] = (byDate[date][status] || 0) + 1;
        });
        setAttendance(Object.values(byDate).slice(-14));
      } catch (err) {
        console.error('Reports fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <Spinner size="lg" />;

  const healthData = (livestock?.byHealth || []).map((h) => ({
    name: String(h._id || 'Unknown'), value: Number(h.count) || 0
  }));
  const speciesData = (livestock?.bySpecies || []).map((s) => ({
    name: String(s._id || 'Unknown'), value: Number(s.count) || 0
  }));
  const taskData = taskStats.map((t) => ({
    name: String(t._id || 'Unknown'), count: Number(t.count) || 0
  }));
  const riskData = riskCounts.map((r) => ({
    name: String(r._id || 'None'), value: Number(r.count) || 0
  }));
  const trustData = trustScores
    .filter((ts) => ts && ts.worker)
    .map((ts) => ({
      name: String(ts.worker.name || 'Worker').split(' ')[0],
      score: Number(ts.overallScore) || 0,
      fill: trustColor(Number(ts.overallScore) || 0)
    }));

  return (
    <div>
      <style>{`
        @media print {
          .sidebar, .topbar, .no-print { display: none !important; }
          .main-area { margin-left: 0 !important; }
          .page-content { padding: 0 !important; }
        }
      `}</style>

      <div className="page-header">
        <div className="page-header-left">
          <h1>Reports & Analytics</h1>
          <p>Farm operational overview — {new Date().toLocaleDateString()}</p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary" icon={<Download size={16} />}
            onClick={() => window.print()}>
            Download / Print
          </Button>
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            Back
          </Button>
        </div>
      </div>

      {/* Section A: Livestock */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader title="Livestock Status"
          subtitle={`${livestock?.total || 0} total animals`} />
        {healthData.length === 0
          ? <NoData msg="No livestock records found." />
          : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600,
                  color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                  Health Status
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={healthData} dataKey="value" nameKey="name"
                      labelLine={false} label={PieLabel} outerRadius={100}>
                      {healthData.map((entry, i) => (
                        <Cell key={i}
                          fill={HEALTH_COLORS[entry.name] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600,
                  color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                  Species Breakdown
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={speciesData} dataKey="value" nameKey="name"
                      labelLine={false} label={PieLabel} outerRadius={100}>
                      {speciesData.map((entry, i) => (
                        <Cell key={i}
                          fill={SPECIES_COLORS[entry.name] || '#94a3b8'} />
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

      {/* Section B: Tasks */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader title="Task Overview"
          subtitle="Task status distribution and risk breakdown" />
        {taskData.length === 0
          ? <NoData msg="No task data found." />
          : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600,
                  color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                  Tasks by Status
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={taskData}
                    margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3"
                      stroke="var(--color-border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {taskData.map((entry, i) => (
                        <Cell key={i}
                          fill={TASK_COLORS[entry.name] || '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600,
                  color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                  Risk Distribution
                </p>
                {riskData.length === 0
                  ? <NoData msg="No risk flags on active tasks." />
                  : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={riskData} dataKey="value" nameKey="name"
                          labelLine={false} label={PieLabel} outerRadius={100}>
                          {riskData.map((entry, i) => (
                            <Cell key={i}
                              fill={RISK_COLORS[entry.name] || '#94a3b8'} />
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

      {/* Section C: Worker Trust Scores */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader title="Worker Trust Score Performance"
          subtitle="Ranked lowest to highest" />
        {trustData.length === 0
          ? <NoData msg="No trust score data found." />
          : (
            <ResponsiveContainer width="100%"
              height={Math.max(280, trustData.length * 45)}>
              <BarChart data={trustData} layout="vertical"
                margin={{ top: 5, right: 60, bottom: 5, left: 80 }}>
                <CartesianGrid strokeDasharray="3 3"
                  stroke="var(--color-border)" />
                <XAxis type="number" domain={[0, 100]}
                  tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name"
                  tick={{ fontSize: 12 }} width={75} />
                <Tooltip formatter={(v) => [`${v}%`, 'Trust Score']} />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {trustData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
      </Card>

      {/* Section D: Attendance */}
      <Card>
        <CardHeader title="Attendance Summary"
          subtitle="Daily trends over last 14 days" />
        {attendance.length === 0
          ? <NoData msg="No attendance records found." />
          : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={attendance}
                margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3"
                  stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Present"
                  stroke="#16a34a" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Late"
                  stroke="#d97706" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Absent"
                  stroke="#dc2626" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
      </Card>
    </div>
  );
}