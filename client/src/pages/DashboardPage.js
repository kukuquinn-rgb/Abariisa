import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Beef, Users, ClipboardList, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatCard, Card, CardHeader, Badge, Spinner, Button } from '../components/dashboard/UI';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../utils/api';
import '../components/dashboard/UI.css';

export default function DashboardPage() {
  const { user, isManager } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [livestockStats, taskStats, tasks] = await Promise.all([
          isManager ? api.get('/livestock/stats') : Promise.resolve({ data: null }),
          api.get('/tasks/stats'),
          api.get('/tasks?limit=5')
        ]);

        setStats({
          livestock: livestockStats.data,
          tasks: taskStats.data
        });
        setRecentTasks(tasks.data.slice(0, 6));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isManager]);

  if (loading) return <Spinner size="lg" />;

  const taskByStatus = (status) =>
    stats?.tasks?.find((s) => s._id === status)?.count ?? 0;

  const statusBadge = (status) => {
    const map = {
      Pending: 'warning', 'In Progress': 'info', Completed: 'success',
      Overdue: 'danger', Acknowledged: 'default'
    };
    return <Badge variant={map[status] || 'default'}>{status}</Badge>;
  };

  const priorityBadge = (p) => {
    const map = { High: 'danger', Medium: 'warning', Low: 'success' };
    return <Badge variant={map[p] || 'default'} size="sm">{p}</Badge>;
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p>Here's what's happening on the farm today.</p>
        </div>
      </div>

      {/* Key stats */}
      <div className="stats-grid">
        {isManager && (
          <StatCard
            label="Total Livestock"
            value={stats?.livestock?.total ?? '—'}
            icon={<Beef size={22} />}
            variant="primary"
          />
        )}
        <StatCard
          label="Pending Tasks"
          value={taskByStatus('Pending')}
          icon={<Clock size={22} />}
          variant="warning"
        />
        <StatCard
          label="Completed Tasks"
          value={taskByStatus('Completed')}
          icon={<CheckCircle size={22} />}
          variant="success"
        />
        <StatCard
          label="Overdue Tasks"
          value={taskByStatus('Overdue')}
          icon={<AlertTriangle size={22} />}
          variant="danger"
        />
      </div>

      {/* Recent Tasks */}
      <Card>
        <CardHeader
          title="Recent Tasks"
          subtitle="Your most recent task assignments"
          action={
            <Button variant="secondary" size="sm" onClick={() => navigate('/tasks')}>
              View all
            </Button>
          }
        />
        {recentTasks.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>
            No tasks yet.
          </p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th>
                  {isManager && <th>Assigned to</th>}
                  <th>Priority</th>
                  <th>Due date</th>
                  <th>Status</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.map((t) => (
                  <tr key={t._id}>
                    <td style={{ fontWeight: 500 }}>{t.title}</td>
                    {isManager && <td>{t.assignedTo?.name ?? '—'}</td>}
                    <td>{priorityBadge(t.priority)}</td>
                    <td>{new Date(t.dueDate).toLocaleDateString()}</td>
                    <td>{statusBadge(t.status)}</td>
                    <td>
                      {t.riskFlag ? (
                        <Badge variant={t.riskFlag === 'High' ? 'danger' : t.riskFlag === 'Medium' ? 'warning' : 'success'} size="sm">
                          {t.riskFlag} Risk
                        </Badge>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
