import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Beef, ClipboardList, AlertTriangle, CheckCircle,
  Clock, CalendarCheck, CalendarOff
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { StatCard, Card, CardHeader, Badge, Spinner, Button } from '../components/dashboard/UI';
import RiskDashboard from '../components/dashboard/RiskDashboard';
import TrustScoreLeaderboard from '../components/dashboard/TrustScoreLeaderboard';
import api from '../utils/api';
import '../components/dashboard/UI.css';

export default function DashboardPage() {
  const { user, isManager, isWorker, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Manager state
  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [attendanceTrends, setAttendanceTrends] = useState([]);
  const [taskTrends, setTaskTrends] = useState([]);

  // Worker state
  const [workerTasks, setWorkerTasks] = useState([]);
  const [workerAttendance, setWorkerAttendance] = useState([]);
  const [trustScore, setTrustScore] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [leaveSummary, setLeaveSummary] = useState(null);
  const [workHours, setWorkHours] = useState(null);
  const [workerAttTrends, setWorkerAttTrends] = useState([]);
  const [workerTaskTrends, setWorkerTaskTrends] = useState([]);

  const [loading, setLoading] = useState(true);
  const [attendanceActionLoading, setAttendanceActionLoading] = useState(false);
  const [taskActionLoadingId, setTaskActionLoadingId] = useState(null);

  const today = new Date();
  const todayTasks = workerTasks.filter((t) => isSameDay(t.dueDate, today));
  const recentTaskList = [...workerTasks]
    .sort((a, b) => new Date(b.createdAt || b.dueDate) - new Date(a.createdAt || a.dueDate))
    .slice(0, 5);
  const thisMonthAtt = workerAttendance.filter((r) => isSameMonth(r.date, today));
  const presentCount = thisMonthAtt.filter((r) => r.status === 'Present').length;
  const lateCount = thisMonthAtt.filter((r) => r.status === 'Late').length;
  const absentCount = thisMonthAtt.filter((r) => r.status === 'Absent').length;
  const trustScoreValue = trustScore?.overallScore ?? '—';
  const trustScoreVariant = trustScoreValue === '—' ? 'default'
    : trustScoreValue >= 80 ? 'success'
    : trustScoreValue >= 60 ? 'warning' : 'danger';
  const taskByStatus = (s) => stats?.tasks?.find((x) => x._id === s)?.count ?? 0;

  const statusBadge = (status) => {
    const map = {
      Pending: 'warning', 'In Progress': 'info',
      Completed: 'success', Overdue: 'danger', Acknowledged: 'default'
    };
    return <Badge variant={map[status] || 'default'}>{status}</Badge>;
  };

  const priorityBadge = (p) => {
    const map = { High: 'danger', Medium: 'warning', Low: 'success' };
    return <Badge variant={map[p] || 'default'} size="sm">{p}</Badge>;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return;
      try {
        if (isWorker) {
          if (!user?.id) { setLoading(false); return; }
          const [tasksR, attR, trustR, leaveR, hoursR, attTrendsR, taskTrendsR] = await Promise.allSettled([
            api.get('/tasks'),
            api.get('/attendance'),
            api.get(`/trust-scores/${user.id}`),
            api.get('/leave/my'),
            api.get('/attendance/work-hours'),
            api.get('/attendance/trends'),
            api.get('/tasks/trends'),
          ]);
          const attList = attR.status === 'fulfilled' ? attR.value.data || [] : [];
          setWorkerTasks(tasksR.status === 'fulfilled' ? tasksR.value.data || [] : []);
          setWorkerAttendance(attList);
          setTrustScore(trustR.status === 'fulfilled' ? trustR.value.data || null : null);
          setLeaveSummary(leaveR.status === 'fulfilled' ? leaveR.value.data || null : null);
          setWorkHours(hoursR.status === 'fulfilled' ? hoursR.value.data || null : null);
          setWorkerAttTrends(attTrendsR.status === 'fulfilled' ? attTrendsR.value.data || [] : []);
          setWorkerTaskTrends(taskTrendsR.status === 'fulfilled' ? taskTrendsR.value.data || [] : []);
          setTodayAttendance(attList.find((r) => isSameDay(r.date, new Date())) || null);
        } else {
          const [livestockR, taskStatsR, tasksR, attTrendsR, taskTrendsR] = await Promise.allSettled([
            isManager ? api.get('/livestock/stats') : Promise.resolve({ data: null }),
            api.get('/tasks/stats'),
            api.get('/tasks?limit=5'),
            api.get('/attendance/trends'),
            api.get('/tasks/trends'),
          ]);
          setStats({
            livestock: livestockR.status === 'fulfilled' ? livestockR.value.data : null,
            tasks: taskStatsR.status === 'fulfilled' ? taskStatsR.value.data : [],
          });
          setRecentTasks(
            tasksR.status === 'fulfilled' ? (tasksR.value.data || []).slice(0, 6) : []
          );
          setAttendanceTrends(attTrendsR.status === 'fulfilled' ? attTrendsR.value.data || [] : []);
          setTaskTrends(taskTrendsR.status === 'fulfilled' ? taskTrendsR.value.data || [] : []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authLoading, isManager, isWorker, user?.id]);

  const handleCheckIn = async () => {
    setAttendanceActionLoading(true);
    try {
      const { data } = await api.post('/attendance/checkin');
      setTodayAttendance(data);
      const { data: attData } = await api.get('/attendance');
      setWorkerAttendance(attData || []);
    } catch (err) { console.error(err); }
    finally { setAttendanceActionLoading(false); }
  };

  const handleCheckOut = async () => {
    setAttendanceActionLoading(true);
    try {
      const { data } = await api.put('/attendance/checkout');
      setTodayAttendance(data);
      const { data: attData } = await api.get('/attendance');
      setWorkerAttendance(attData || []);
    } catch (err) { console.error(err); }
    finally { setAttendanceActionLoading(false); }
  };

  const handleTaskStatusChange = async (task) => {
    const nextStatus = task.status === 'In Progress' ? 'Completed' : 'In Progress';
    setTaskActionLoadingId(task._id);
    try {
      const { data } = await api.put(`/tasks/${task._id}`, { status: nextStatus });
      setWorkerTasks((prev) => prev.map((t) => (t._id === task._id ? data : t)));
    } catch (err) { console.error(err); }
    finally { setTaskActionLoadingId(null); }
  };

  if (authLoading || loading) return <Spinner size="lg" />;

  // ── WORKER DASHBOARD ───────────────────────────────────────────────────────
  if (isWorker) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-left">
            <h1>Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
            <p>Here is your daily farm summary.</p>
          </div>
        </div>

        {/* Attendance card */}
        <Card className="worker-attendance-card" padding={false}>
          <CardHeader title="Today's Attendance" subtitle={formatFullDate(today)} />
          <div className="worker-attendance-body">
            {!todayAttendance?.checkIn && !todayAttendance?.checkOut ? (
              <>
                <p className="worker-attendance-help">Tap the button below to start your day.</p>
                <Button variant="success" size="lg" className="worker-checkin-button"
                  loading={attendanceActionLoading} onClick={handleCheckIn}>
                  Check In Now
                </Button>
              </>
            ) : todayAttendance?.checkIn && !todayAttendance?.checkOut ? (
              <>
                <div className="worker-attendance-times">
                  <p><strong>Checked in:</strong> {formatTime(todayAttendance.checkIn)}</p>
                  <span className="worker-status-badge">
                    <CheckCircle size={16} /> Checked In
                  </span>
                </div>
                <Button variant="secondary" size="lg" className="worker-checkout-button"
                  loading={attendanceActionLoading} onClick={handleCheckOut}>
                  Check Out
                </Button>
              </>
            ) : (
              <div className="worker-attendance-times">
                <p><strong>Checked in:</strong> {formatTime(todayAttendance?.checkIn)}</p>
                <p><strong>Checked out:</strong> {formatTime(todayAttendance?.checkOut)}</p>
                <p className="worker-success-message">Attendance recorded for today ✓</p>
              </div>
            )}
          </div>
        </Card>

        {/* Stat cards */}
        <div className="worker-stats-grid">
          <Card className="worker-stat-card worker-stat-card-green">
            <div className="worker-stat-icon"><ClipboardList size={24} /></div>
            <p className="worker-stat-label">My Tasks Today</p>
            <p className="worker-stat-value">{todayTasks.length}</p>
            <p className="worker-stat-caption">tasks due today</p>
          </Card>
          <Card className={`worker-stat-card worker-stat-card-${trustScoreVariant}`}>
            <div className="worker-stat-icon"><CheckCircle size={24} /></div>
            <p className="worker-stat-label">My Trust Score</p>
            <p className="worker-stat-value">
              {trustScoreValue === '—' ? '—' : `${trustScoreValue}%`}
            </p>
            <p className="worker-stat-caption">Based on recent attendance and task performance</p>
          </Card>
          <Card className="worker-stat-card worker-stat-card-primary">
            <div className="worker-stat-icon"><CalendarCheck size={24} /></div>
            <p className="worker-stat-label">This Month Attendance</p>
            <p className="worker-stat-value">{presentCount} Present</p>
            <p className="worker-stat-caption">{lateCount} Late • {absentCount} Absent</p>
          </Card>
          <Card className={`worker-stat-card ${
            leaveSummary?.remainingDays <= 5 ? 'worker-stat-card-danger'
            : leaveSummary?.remainingDays <= 10 ? 'worker-stat-card-warning'
            : 'worker-stat-card-success'}`}>
            <div className="worker-stat-icon"><CalendarOff size={24} /></div>
            <p className="worker-stat-label">Leave Remaining</p>
            <p className="worker-stat-value">{leaveSummary?.remainingDays ?? 0}</p>
            <p className="worker-stat-caption">annual leave days left</p>
          </Card>
          <Card className="worker-stat-card worker-stat-card-primary">
            <div className="worker-stat-icon"><Clock size={24} /></div>
            <p className="worker-stat-label">Hours This Week</p>
            <p className="worker-stat-value">{workHours?.thisWeek ?? 0}</p>
            <p className="worker-stat-caption">hours logged</p>
          </Card>
        </div>

        {/* Worker charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <Card>
            <CardHeader title="My Attendance — Last 7 Days" />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={workerAttTrends} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Present" fill="#16a34a" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Late" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Absent" fill="#dc2626" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <CardHeader title="My Tasks — Last 7 Days" />
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={workerTaskTrends} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Completed" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Pending" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Overdue" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Today's tasks */}
        <Card className="worker-task-section" style={{ marginTop: '1rem' }}>
          <CardHeader title="Today's Tasks" subtitle="Tasks that need your attention today" />
          {todayTasks.length === 0 ? (
            <p className="worker-empty-state">No tasks scheduled for today 🎉</p>
          ) : (
            <div className="worker-task-list">
              {todayTasks.map((task) => (
                <div key={task._id} className="worker-task-card">
                  <div className="worker-task-top">
                    <div>
                      <p className="worker-task-title">{task.title}</p>
                      <div className="worker-task-badges">
                        <Badge variant="default" size="sm">{task.category || 'Other'}</Badge>
                        {priorityBadge(task.priority)}
                        {statusBadge(task.status)}
                      </div>
                    </div>
                    {task.status !== 'Completed' && (
                      <Button
                        variant={task.status === 'In Progress' ? 'success' : 'secondary'}
                        size="sm"
                        loading={taskActionLoadingId === task._id}
                        onClick={() => handleTaskStatusChange(task)}
                      >
                        {task.status === 'In Progress' ? 'Mark Completed' : 'Mark In Progress'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent tasks */}
        <Card className="worker-task-section" style={{ marginTop: '1rem' }}>
          <CardHeader title="Recent Tasks" subtitle="Your latest task updates" />
          {recentTaskList.length === 0 ? (
            <p className="worker-empty-state">No recent tasks yet.</p>
          ) : (
            <div className="worker-task-list">
              {recentTaskList.map((task) => (
                <div key={task._id} className="worker-task-card">
                  <div className="worker-task-top">
                    <div>
                      <p className="worker-task-title">{task.title}</p>
                      <div className="worker-task-badges">
                        <Badge variant="default" size="sm">{task.category || 'Other'}</Badge>
                        {priorityBadge(task.priority)}
                        {statusBadge(task.status)}
                      </div>
                    </div>
                    {task.status !== 'Completed' && (
                      <Button
                        variant={task.status === 'In Progress' ? 'success' : 'secondary'}
                        size="sm"
                        loading={taskActionLoadingId === task._id}
                        onClick={() => handleTaskStatusChange(task)}
                      >
                        {task.status === 'In Progress' ? 'Mark Completed' : 'Mark In Progress'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  // ── MANAGER / ADMIN DASHBOARD ──────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p>Here's what's happening on the farm today.</p>
        </div>
      </div>

      {/* Stat cards */}
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

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
        <Card>
          <CardHeader
            title="Farm Attendance — Last 7 Days"
            subtitle="Present vs Late vs Absent across all workers"
          />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={attendanceTrends} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Present" fill="#16a34a" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Late" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Absent" fill="#dc2626" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader
            title="Task Activity — Last 7 Days"
            subtitle="Completed vs Overdue vs Pending per day"
          />
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={taskTrends} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Completed" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Pending" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Overdue" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent tasks table */}
      <Card style={{ marginTop: '1rem' }}>
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
          <p style={{
            color: 'var(--color-text-muted)', fontSize: '0.875rem',
            textAlign: 'center', padding: '2rem'
          }}>
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
                        <Badge
                          variant={t.riskFlag === 'High' ? 'danger'
                            : t.riskFlag === 'Medium' ? 'warning' : 'success'}
                          size="sm"
                        >
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

      {/* Risk dashboard and leaderboard */}
      {isManager && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <RiskDashboard />
          <TrustScoreLeaderboard />
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  const d1 = new Date(a), d2 = new Date(b);
  return d1.getFullYear() === d2.getFullYear()
    && d1.getMonth() === d2.getMonth()
    && d1.getDate() === d2.getDate();
}

function isSameMonth(a, b) {
  if (!a || !b) return false;
  const d1 = new Date(a), d2 = new Date(b);
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
}

function formatFullDate(date) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date(date));
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}