import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Beef, ClipboardList, AlertTriangle, CheckCircle, Clock, CalendarCheck, CalendarOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatCard, Card, CardHeader, Badge, Spinner, Button } from '../components/dashboard/UI';
import RiskDashboard from '../components/dashboard/RiskDashboard';
import TrustScoreLeaderboard from '../components/dashboard/TrustScoreLeaderboard';
import api from '../utils/api';
import '../components/dashboard/UI.css';

export default function DashboardPage() {
  const { user, isManager, isWorker, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workerTasks, setWorkerTasks] = useState([]);
  const [workerAttendance, setWorkerAttendance] = useState([]);
  const [trustScore, setTrustScore] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [leaveSummary, setLeaveSummary] = useState(null);
  const [workHours, setWorkHours] = useState(null);
  const [attendanceActionLoading, setAttendanceActionLoading] = useState(false);
  const [taskActionLoadingId, setTaskActionLoadingId] = useState(null);

  const today = new Date();
  const todayTasks = workerTasks.filter((task) => isSameDay(task.dueDate, today));
  const recentTaskList = [...workerTasks]
    .sort((a, b) => new Date(b.createdAt || b.dueDate) - new Date(a.createdAt || a.dueDate))
    .slice(0, 5);
  const thisMonthAttendance = workerAttendance.filter((record) => isSameMonth(record.date, today));
  const presentCount = thisMonthAttendance.filter((record) => record.status === 'Present').length;
  const lateCount = thisMonthAttendance.filter((record) => record.status === 'Late').length;
  const absentCount = thisMonthAttendance.filter((record) => record.status === 'Absent').length;
  const trustScoreValue = trustScore?.overallScore ?? '—';
  const trustScoreVariant = trustScoreValue === '—'
    ? 'default'
    : trustScoreValue >= 80
      ? 'success'
      : trustScoreValue >= 60
        ? 'warning'
        : 'danger';
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

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return;

      try {
        if (isWorker) {
          if (!user?.id) {
            setLoading(false);
            return;
          }

          const [tasksResult, attendanceResult, trustResult, leaveResult, workHoursResult] = await Promise.allSettled([
            api.get('/tasks'),
            api.get('/attendance'),
            api.get(`/trust-scores/${user.id}`),
            api.get('/leave/my'),
            api.get('/attendance/work-hours')
          ]);

          const taskList = tasksResult.status === 'fulfilled' ? tasksResult.value.data || [] : [];
          const attendanceList = attendanceResult.status === 'fulfilled' ? attendanceResult.value.data || [] : [];
          const trustData = trustResult.status === 'fulfilled' ? trustResult.value.data || null : null;
          const leaveData = leaveResult.status === 'fulfilled' ? leaveResult.value.data || null : null;
          const hoursData = workHoursResult.status === 'fulfilled' ? workHoursResult.value.data || null : null;

          setWorkerTasks(taskList);
          setWorkerAttendance(attendanceList);
          setTrustScore(trustData);
          setLeaveSummary(leaveData);
          setWorkHours(hoursData);
          setTodayAttendance(attendanceList.find((record) => isSameDay(record.date, new Date())) || null);
        } else {
          const [livestockStats, taskStats, tasks] = await Promise.all([
            isManager ? api.get('/livestock/stats') : Promise.resolve({ data: null }),
            api.get('/tasks/stats'),
            api.get('/tasks?limit=5')
          ]);

          if (isManager) {
            await api.get('/users/workers');
          }

          setStats({
            livestock: livestockStats.data,
            tasks: taskStats.data
          });
          setRecentTasks(tasks.data.slice(0, 6));
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
      const { data: attendanceData } = await api.get('/attendance');
      setWorkerAttendance(attendanceData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAttendanceActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setAttendanceActionLoading(true);
    try {
      const { data } = await api.put('/attendance/checkout');
      setTodayAttendance(data);
      const { data: attendanceData } = await api.get('/attendance');
      setWorkerAttendance(attendanceData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAttendanceActionLoading(false);
    }
  };

  const handleTaskStatusChange = async (task) => {
    const nextStatus = task.status === 'In Progress' ? 'Completed' : 'In Progress';
    setTaskActionLoadingId(task._id);

    try {
      const { data } = await api.put(`/tasks/${task._id}`, { status: nextStatus });
      setWorkerTasks((prev) => prev.map((item) => (item._id === task._id ? data : item)));
    } catch (err) {
      console.error(err);
    } finally {
      setTaskActionLoadingId(null);
    }
  };

  if (authLoading || loading) return <Spinner size="lg" />;

  if (isWorker) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-left">
            <h1>Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
            <p>Here is your daily farm summary.</p>
          </div>
        </div>

        <Card className="worker-attendance-card" padding={false}>
          <CardHeader title="Today's Attendance" subtitle={formatFullDate(today)} />
          <div className="worker-attendance-body">
            {!todayAttendance?.checkIn && !todayAttendance?.checkOut ? (
              <>
                <p className="worker-attendance-help">Tap the button below to start your day.</p>
                <Button
                  variant="success"
                  size="lg"
                  className="worker-checkin-button"
                  loading={attendanceActionLoading}
                  onClick={handleCheckIn}
                >
                  Check In Now
                </Button>
              </>
            ) : todayAttendance?.checkIn && !todayAttendance?.checkOut ? (
              <>
                <div className="worker-attendance-times">
                  <p><strong>Checked in:</strong> {formatTime(todayAttendance.checkIn)}</p>
                  <span className="worker-status-badge"><CheckCircle size={16} /> Checked In</span>
                </div>
                <Button variant="secondary" size="lg" className="worker-checkout-button" loading={attendanceActionLoading} onClick={handleCheckOut}>
                  Check Out
                </Button>
              </>
            ) : (
              <>
                <div className="worker-attendance-times">
                  <p><strong>Checked in:</strong> {formatTime(todayAttendance?.checkIn)}</p>
                  <p><strong>Checked out:</strong> {formatTime(todayAttendance?.checkOut)}</p>
                </div>
                <p className="worker-success-message">Attendance recorded for today ✓</p>
              </>
            )}
          </div>
        </Card>

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
            <p className="worker-stat-value">{trustScoreValue === '—' ? '—' : `${trustScoreValue}%`}</p>
            <p className="worker-stat-caption">Based on recent attendance and task performance</p>
          </Card>

          <Card className="worker-stat-card worker-stat-card-primary">
            <div className="worker-stat-icon"><CalendarCheck size={24} /></div>
            <p className="worker-stat-label">This Month Attendance</p>
            <p className="worker-stat-value">{presentCount} Present</p>
            <p className="worker-stat-caption">{lateCount} Late • {absentCount} Absent</p>
          </Card>

          <Card className={`worker-stat-card ${leaveSummary?.remainingDays <= 5 ? 'worker-stat-card-danger' : leaveSummary?.remainingDays <= 10 ? 'worker-stat-card-warning' : 'worker-stat-card-success'}`}>
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

        <Card className="worker-task-section">
          <CardHeader title="Today's Tasks" subtitle="Tasks that need your attention today" />
          {todayTasks.length === 0 ? (
            <p className="worker-empty-state">No tasks scheduled for today 🎉</p>
          ) : (
            <div className="worker-task-list">
              {todayTasks.map((task) => {
                const nextStatus = task.status === 'In Progress' ? 'Completed' : 'In Progress';
                return (
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
                );
              })}
            </div>
          )}
        </Card>

        <Card className="worker-task-section">
          <CardHeader title="Recent Tasks" subtitle="Your latest task updates" />
          {recentTaskList.length === 0 ? (
            <p className="worker-empty-state">No recent tasks yet.</p>
          ) : (
            <div className="worker-task-list">
              {recentTaskList.map((task) => {
                const nextStatus = task.status === 'In Progress' ? 'Completed' : 'In Progress';
                return (
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
                );
              })}
            </div>
          )}
        </Card>
      </div>
    );
  }

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

      {isManager && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <RiskDashboard />
          <TrustScoreLeaderboard />
        </div>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  const first = new Date(a);
  const second = new Date(b);
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}

function isSameMonth(a, b) {
  if (!a || !b) return false;
  const first = new Date(a);
  const second = new Date(b);
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth();
}

function formatFullDate(date) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(date));
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

