import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { Button, Card, CardHeader, Badge, Spinner, Alert } from '../components/dashboard/UI';

const ScoreBar = ({ label, value }) => {
  const color = value >= 80 ? 'var(--color-success)' : value >= 60 ? 'var(--color-warning)' : 'var(--color-danger)';
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '0.875rem', fontWeight: 700, color }}>{value}%</span>
      </div>
      <div style={{ height: 8, background: 'var(--color-border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 'var(--radius-full)', transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
};

export default function WorkerProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/users/${id}`),
      api.get(`/tasks?assignedTo=${id}`)
    ]).then(([userRes, tasksRes]) => {
      setWorker(userRes.data);
      setTasks(tasksRes.data);
    }).catch(() => toast.error('Failed to load worker profile'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner size="lg" />;
  if (!worker) return <Alert variant="danger">Worker not found.</Alert>;

  const ts = worker.trustScore;
  const overallColor = ts?.overallScore >= 80 ? 'var(--color-success)' : ts?.overallScore >= 60 ? 'var(--color-warning)' : 'var(--color-danger)';

  const chartData = ts?.history?.map((h) => ({
    date: new Date(h.date).toLocaleDateString(),
    score: h.score
  })) ?? [];

  const recommendation = () => {
    const score = ts?.overallScore ?? 100;
    if (score >= 85) return { variant: 'success', msg: 'Highly reliable worker. Suitable for all task types.' };
    if (score >= 70) return { variant: 'info', msg: 'Generally reliable. Monitor high-priority task completion.' };
    if (score >= 55) return { variant: 'warning', msg: 'Some reliability concerns. Increase supervision for critical tasks.' };
    return { variant: 'danger', msg: 'Low reliability score. Recommend performance review before assigning high-risk tasks.' };
  };

  const { variant: recVariant, msg: recMsg } = recommendation();

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate('/workers')}>
          Back to Workers
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left: Worker info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card>
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%', background: 'var(--color-primary-bg)',
                color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', fontWeight: 700, margin: '0 auto 1rem'
              }} aria-label="Worker avatar">
                {worker.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <h2 style={{ fontWeight: 700, fontSize: '1.25rem' }}>{worker.name}</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{worker.email}</p>
              {worker.position && <Badge variant="primary" style={{ marginTop: '0.75rem' }}>{worker.position}</Badge>}
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0.5rem 0' }} />
            <dl style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0 0' }}>
              {[
                ['Department', worker.department || '—'],
                ['Phone', worker.phone || '—'],
                ['Joined', new Date(worker.createdAt).toLocaleDateString()],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <dt style={{ color: 'var(--color-text-muted)' }}>{k}</dt>
                  <dd style={{ fontWeight: 500 }}>{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Overall Trust Score */}
          {ts && (
            <Card>
              <CardHeader title="Trust Score" />
              <div style={{ textAlign: 'center', padding: '0.5rem 0 1.5rem' }}>
                <p style={{ fontSize: '3.5rem', fontWeight: 800, color: overallColor, lineHeight: 1 }}>
                  {ts.overallScore}%
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                  Last updated: {new Date(ts.lastCalculated).toLocaleDateString()}
                </p>
              </div>
              <ScoreBar label="Attendance" value={ts.attendanceScore} />
              <ScoreBar label="Punctuality" value={ts.punctualityScore} />
              <ScoreBar label="Task Completion" value={ts.taskCompletionScore} />
              <ScoreBar label="Responsiveness" value={ts.responsivenessScore} />
              <ScoreBar label="Consistency" value={ts.consistencyScore} />
              <Alert variant={recVariant}>{recMsg}</Alert>
            </Card>
          )}
        </div>

        {/* Right: Charts + Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Trust score trend */}
          {chartData.length > 1 && (
            <Card>
              <CardHeader title="Trust Score Trend" subtitle="Last 30 days" />
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', borderColor: 'var(--color-border)' }}
                    formatter={(v) => [`${v}%`, 'Trust Score']}
                  />
                  <Line type="monotone" dataKey="score" stroke={overallColor} strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Task history */}
          <Card>
            <CardHeader title="Task History" subtitle={`${tasks.length} tasks assigned`} />
            {tasks.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '1rem 0' }}>
                No tasks assigned yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {tasks.slice(0, 10).map((t) => {
                  const statusColor = { Completed: 'success', Overdue: 'danger', 'In Progress': 'info', Pending: 'warning' };
                  return (
                    <div key={t._id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.75rem', background: 'var(--color-bg)',
                      borderRadius: 'var(--radius)', border: '1px solid var(--color-border)'
                    }}>
                      <div>
                        <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{t.title}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          Due: {new Date(t.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {t.riskFlag && <Badge variant={t.riskFlag === 'High' ? 'danger' : 'warning'} size="sm">⚠ {t.riskFlag}</Badge>}
                        <Badge variant={statusColor[t.status] || 'default'} size="sm">{t.status}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
