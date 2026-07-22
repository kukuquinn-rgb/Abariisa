import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
  'Under Treatment': '#f59e0b', Quarantined: '#7c3aed', Deceased: '#374151'
};
const SPECIES_COLORS = {
  Cattle: '#b45309', Goat: '#0369a1', Sheep: '#7c3aed',
  Pig: '#db2777', Poultry: '#d97706', Other: '#6b7280'
};
const TASK_COLORS = {
  Pending: '#d97706', 'In Progress': '#2563eb',
  Completed: '#16a34a', Overdue: '#dc2626', Acknowledged: '#6b7280'
};
const RISK_COLORS = { Low: '#16a34a', Medium: '#d97706', High: '#dc2626', None: '#94a3b8' };
const trustColor = (s) => s >= 80 ? '#16a34a' : s >= 60 ? '#d97706' : '#dc2626';

const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle"
      dominantBaseline="central" fontSize={12} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const NoData = ({ msg }) => (
  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '2rem', textAlign: 'center' }}>
    {msg}
  </p>
);

const ChartNote = ({ text }) => (
  <p style={{
    fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.75rem',
    padding: '0.625rem 0.875rem', background: 'var(--color-bg)',
    borderLeft: '3px solid var(--color-primary-light)',
    borderRadius: '0 var(--radius) var(--radius) 0', lineHeight: 1.6
  }}>{text}</p>
);

// Delta indicator component
const Delta = ({ value, unit = '', invert = false }) => {
  if (value === null || value === undefined || isNaN(value)) {
    return <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>— no data</span>;
  }
  const positive = invert ? value < 0 : value > 0;
  const neutral = value === 0;
  const color = neutral ? 'var(--color-text-muted)' : positive ? '#16a34a' : '#dc2626';
  const Icon = neutral ? Minus : positive ? TrendingUp : TrendingDown;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color, fontWeight: 600 }}>
      <Icon size={13} />
      {value > 0 ? '+' : ''}{value}{unit} vs yesterday
    </span>
  );
};

// Summary card for the comparison row
const CompareCard = ({ label, today, yesterday, unit = '', invert = false, color }) => {
  const delta = today !== null && yesterday !== null ? today - yesterday : null;
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 10, padding: '14px 18px', flex: '1 1 140px', minWidth: 0,
      borderLeft: `4px solid ${color}`
    }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>
        {label}
      </p>
      <p style={{ fontSize: 26, fontWeight: 800, color, margin: '4px 0' }}>
        {today !== null ? `${today}${unit}` : '—'}
      </p>
      <Delta value={delta} unit={unit} invert={invert} />
    </div>
  );
};

// Insight generators
const getHealthInsight = (data, total) => {
  if (!data.length) return '';
  const healthy = data.find(d => d.name === 'Healthy');
  const sick = data.find(d => d.name === 'Sick');
  const treatment = data.find(d => d.name === 'Under Treatment');
  const quarantined = data.find(d => d.name === 'Quarantined');
  const healthyPct = healthy ? Math.round((healthy.value / total) * 100) : 0;
  const atRisk = (sick?.value || 0) + (treatment?.value || 0) + (quarantined?.value || 0);
  let insight = `${healthyPct}% of the herd (${healthy?.value || 0} of ${total} animals) are in good health. `;
  if (atRisk > 0) {
    const issues = [];
    if (sick?.value) issues.push(`${sick.value} sick`);
    if (treatment?.value) issues.push(`${treatment.value} under treatment`);
    if (quarantined?.value) issues.push(`${quarantined.value} quarantined`);
    insight += `${atRisk} animal${atRisk > 1 ? 's' : ''} require${atRisk === 1 ? 's' : ''} attention — ${issues.join(', ')}.`;
  } else {
    insight += 'No animals currently require veterinary attention.';
  }
  return insight;
};

const getSpeciesInsight = (data) => {
  if (!data.length) return '';
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const total = data.reduce((s, d) => s + d.value, 0);
  const top = sorted[0];
  const topPct = Math.round((top.value / total) * 100);
  return `The herd is made up of ${data.length} species. ${top.name} is the most common at ${topPct}% (${top.value} animals), followed by ${sorted[1]?.name || 'others'} at ${Math.round(((sorted[1]?.value || 0) / total) * 100)}%.`;
};

const getTaskInsight = (data) => {
  if (!data.length) return '';
  const total = data.reduce((s, d) => s + d.count, 0);
  const completed = data.find(d => d.name === 'Completed');
  const overdue = data.find(d => d.name === 'Overdue');
  const pending = data.find(d => d.name === 'Pending');
  let insight = `Out of ${total} tasks, ${completed?.count || 0} have been completed (${Math.round(((completed?.count || 0) / total) * 100)}% completion rate). `;
  if (overdue?.count > 0) insight += `${overdue.count} task${overdue.count > 1 ? 's are' : ' is'} overdue. `;
  if (pending?.count > 0) insight += `${pending.count} task${pending.count > 1 ? 's are' : ' is'} pending.`;
  return insight;
};

const getTrustInsight = (data) => {
  if (!data.length) return '';
  const atRisk = data.filter(d => d.score < 60).length;
  const highPerformers = data.filter(d => d.score >= 80).length;
  const avg = Math.round(data.reduce((s, d) => s + d.score, 0) / data.length);
  let insight = `Average Trust Score across ${data.length} workers is ${avg}%. `;
  if (highPerformers > 0) insight += `${highPerformers} worker${highPerformers > 1 ? 's' : ''} performing excellently (≥80%). `;
  if (atRisk > 0) insight += `${atRisk} worker${atRisk > 1 ? 's' : ''} ${atRisk > 1 ? 'have' : 'has'} a low Trust Score below 60% — consider performance review before assigning high-priority tasks.`;
  return insight;
};

const getAttendanceInsight = (data) => {
  if (!data.length) return '';
  const totalPresent = data.reduce((s, d) => s + (d.Present || 0), 0);
  const totalLate = data.reduce((s, d) => s + (d.Late || 0), 0);
  const totalAbsent = data.reduce((s, d) => s + (d.Absent || 0), 0);
  const total = totalPresent + totalLate + totalAbsent;
  const presentRate = total > 0 ? Math.round((totalPresent / total) * 100) : 0;
  let insight = `Over the last 14 days, the overall on-time attendance rate is ${presentRate}%. `;
  if (totalLate > 0) insight += `${totalLate} late arrival${totalLate > 1 ? 's' : ''} recorded. `;
  if (totalAbsent > 0) insight += `${totalAbsent} absence${totalAbsent > 1 ? 's' : ''} recorded. `;
  if (presentRate >= 85) insight += 'Attendance is strong across the team.';
  else if (presentRate >= 70) insight += 'Attendance is acceptable but has room for improvement.';
  else insight += 'Attendance rate is below target — consider addressing punctuality with affected workers.';
  return insight;
};

export default function ReportsPage() {
  const navigate = useNavigate();
  const [livestock, setLivestock] = useState(null);
  const [taskStats, setTaskStats] = useState([]);
  const [riskCounts, setRiskCounts] = useState([]);
  const [trustScores, setTrustScores] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [attTrends, setAttTrends] = useState([]);
  const [taskTrends, setTaskTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [lsRes, tsRes, trustRes, attRes, attTrendsRes, taskTrendsRes] = await Promise.all([
          api.get('/livestock/stats'),
          api.get('/tasks/stats'),
          api.get('/trust-scores').catch(() => ({ data: [] })),
          api.get('/attendance'),
          api.get('/attendance/trends'),
          api.get('/tasks/trends'),
        ]);

        setLivestock(lsRes.data);
        setTaskStats(Array.isArray(tsRes.data) ? tsRes.data : []);
        setTrustScores(Array.isArray(trustRes.data) ? trustRes.data : []);
        setAttTrends(Array.isArray(attTrendsRes.data) ? attTrendsRes.data : []);
        setTaskTrends(Array.isArray(taskTrendsRes.data) ? taskTrendsRes.data : []);

        try {
          const riskRes = await api.get('/tasks/risk-summary');
          setRiskCounts(Array.isArray(riskRes.data?.riskCounts) ? riskRes.data.riskCounts : []);
        } catch { setRiskCounts([]); }

        const records = Array.isArray(attRes.data) ? attRes.data : [];
        const byDate = {};
        records.forEach((r) => {
          const date = new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
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

  // Compute today vs yesterday from trends
  const todayAtt = attTrends[attTrends.length - 1] || null;
  const yesterdayAtt = attTrends[attTrends.length - 2] || null;
  const todayTask = taskTrends[taskTrends.length - 1] || null;
  const yesterdayTask = taskTrends[taskTrends.length - 2] || null;

  const todayPresent = todayAtt?.Present ?? null;
  const yesterdayPresent = yesterdayAtt?.Present ?? null;
  const todayCompleted = todayTask?.Completed ?? null;
  const yesterdayCompleted = yesterdayTask?.Completed ?? null;
  const todayOverdue = todayTask?.Overdue ?? null;
  const yesterdayOverdue = yesterdayTask?.Overdue ?? null;
  const todayAbsent = todayAtt ? (todayAtt.Late || 0) + (todayAtt.Absent || 0) : null;
  const yesterdayAbsent = yesterdayAtt ? (yesterdayAtt.Late || 0) + (yesterdayAtt.Absent || 0) : null;

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

  const total = livestock?.total || 0;

  return (
    <div>
      <style>{`
        @media print {
          .sidebar, .topbar, .no-print { display: none !important; }
          .main-area { margin-left: 0 !important; }
          .page-content { padding: 0 !important; }
          .card { break-inside: avoid; }
        }
      `}</style>

      <div className="page-header">
        <div className="page-header-left">
          <h1>Reports & Analytics</h1>
          <p>Operational overview — {new Date().toLocaleDateString('en-UG', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}</p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary" icon={<Download size={16} />} onClick={() => window.print()}>
            Download / Print
          </Button>
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* ── TODAY VS YESTERDAY SUMMARY ─────────────────────────────────────── */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader
          title="Today at a Glance"
          subtitle="Key metrics compared to yesterday — updates automatically from live farm data"
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: '1.25rem' }}>
          <CompareCard
            label="Workers Present Today"
            today={todayPresent}
            yesterday={yesterdayPresent}
            color="#16a34a"
          />
          <CompareCard
            label="Late or Absent Today"
            today={todayAbsent}
            yesterday={yesterdayAbsent}
            color="#f59e0b"
            invert
          />
          <CompareCard
            label="Tasks Completed Today"
            today={todayCompleted}
            yesterday={yesterdayCompleted}
            color="#2563eb"
          />
          <CompareCard
            label="Tasks Overdue Today"
            today={todayOverdue}
            yesterday={yesterdayOverdue}
            color="#dc2626"
            invert
          />
        </div>

        {/* 7-day side-by-side trend */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
              Attendance Trend — Last 7 Days
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={attTrends} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                <Tooltip />
                <Legend iconSize={9} wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Present" fill="#16a34a" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Late" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Absent" fill="#dc2626" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
              Task Activity Trend — Last 7 Days
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={taskTrends} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                <Tooltip />
                <Legend iconSize={9} wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="Completed" stroke="#16a34a" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="Pending" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="Overdue" stroke="#dc2626" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* ── SECTION A: LIVESTOCK ───────────────────────────────────────────── */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader
          title="A. Livestock Status Report"
          subtitle={`${total} total animals across all paddocks and housing units`}
        />
        {healthData.length === 0 ? <NoData msg="No livestock records found." /> : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                Health Status Distribution
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={healthData} dataKey="value" nameKey="name"
                    labelLine={false} label={PieLabel} outerRadius={100}>
                    {healthData.map((entry, i) => (
                      <Cell key={i} fill={HEALTH_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} animals`, n]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <ChartNote text={getHealthInsight(healthData, total)} />
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                Species Composition
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={speciesData} dataKey="value" nameKey="name"
                    labelLine={false} label={PieLabel} outerRadius={100}>
                    {speciesData.map((entry, i) => (
                      <Cell key={i} fill={SPECIES_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} animals`, n]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <ChartNote text={getSpeciesInsight(speciesData)} />
            </div>
          </div>
        )}
      </Card>

      {/* ── SECTION B: TASKS ──────────────────────────────────────────────── */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader
          title="B. Task Completion Report"
          subtitle="Current task status distribution and predictive risk breakdown"
        />
        {taskData.length === 0 ? <NoData msg="No task data found." /> : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                Tasks by Status
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={taskData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [v, 'Tasks']} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {taskData.map((entry, i) => (
                      <Cell key={i} fill={TASK_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <ChartNote text={getTaskInsight(taskData)} />
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                Task Risk Distribution (FR9)
              </p>
              {riskData.length === 0 ? (
                <>
                  <NoData msg="No risk-flagged active tasks at this time." />
                  <ChartNote text="All active tasks are currently assigned to workers with Trust Scores above the risk threshold. No immediate operational risk detected." />
                </>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={riskData} dataKey="value" nameKey="name"
                        labelLine={false} label={PieLabel} outerRadius={100}>
                        {riskData.map((entry, i) => (
                          <Cell key={i} fill={RISK_COLORS[entry.name] || '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [`${v} tasks`, n + ' Risk']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  <ChartNote text="Risk flags are generated by the Task Risk Prediction engine (FR9) based on each worker's Trust Score at the time of task assignment." />
                </>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ── SECTION C: TRUST SCORES ───────────────────────────────────────── */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader
          title="C. Worker Performance Report"
          subtitle="Trust Score ranking — calculated from attendance, punctuality, task completion, responsiveness and consistency (FR8)"
        />
        {trustData.length === 0 ? <NoData msg="No trust score data found." /> : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(280, trustData.length * 45)}>
              <BarChart data={trustData} layout="vertical"
                margin={{ top: 5, right: 60, bottom: 5, left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" domain={[0, 100]}
                  tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={75} />
                <Tooltip formatter={(v) => [`${v}%`, 'Trust Score']} />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {trustData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <ChartNote text={getTrustInsight(trustData)} />
          </>
        )}
      </Card>

      {/* ── SECTION D: ATTENDANCE ─────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="D. Attendance Summary Report"
          subtitle="Daily worker attendance trends over the last 14 days (FR4)"
        />
        {attendance.length === 0 ? <NoData msg="No attendance records found." /> : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={attendance} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Present" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Late" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Absent" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
            <ChartNote text={getAttendanceInsight(attendance)} />
          </>
        )}
      </Card>
    </div>
  );
}