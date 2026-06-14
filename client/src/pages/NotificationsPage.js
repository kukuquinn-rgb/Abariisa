import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, AlertTriangle, ClipboardCheck, CalendarX, TrendingUp, Beef, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { Button, Card, CardHeader, Badge, EmptyState, Spinner } from '../components/dashboard/UI';

const TYPE_ICONS = {
  task_assigned: <ClipboardCheck size={18} />,
  task_updated: <ClipboardCheck size={18} />,
  task_overdue: <CalendarX size={18} />,
  attendance_irregularity: <CalendarX size={18} />,
  trust_score_change: <TrendingUp size={18} />,
  risk_alert: <AlertTriangle size={18} />,
  livestock_alert: <Beef size={18} />,
  general: <Info size={18} />
};

const TYPE_COLORS = {
  task_assigned: 'info',
  task_updated: 'info',
  task_overdue: 'danger',
  attendance_irregularity: 'warning',
  trust_score_change: 'primary',
  risk_alert: 'danger',
  livestock_alert: 'warning',
  general: 'default'
};

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data);
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((p) => p.map((n) => n._id === id ? { ...n, isRead: true } : n));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((p) => p.map((n) => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch { toast.error('Failed to update notifications'); }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Notifications</h1>
          <p>{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'You\'re all caught up'}</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" icon={<CheckCheck size={16} />} onClick={markAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      <Card>
        <CardHeader title="All Notifications" />
        {loading ? <Spinner /> : notifications.length === 0 ? (
          <EmptyState icon={<Bell size={48} />} title="No notifications yet"
            message="You'll be notified here about task assignments, risk alerts, and trust score updates." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {notifications.map((n) => (
              <button
                key={n._id}
                onClick={() => !n.isRead && markRead(n._id)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
                  padding: '0.875rem', borderRadius: 'var(--radius)',
                  border: '1px solid var(--color-border)',
                  background: n.isRead ? 'var(--color-surface)' : 'var(--color-primary-bg)',
                  cursor: n.isRead ? 'default' : 'pointer',
                  textAlign: 'left', width: '100%',
                  transition: 'background var(--transition)'
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)'
                }} aria-hidden="true">
                  {TYPE_ICONS[n.type] || <Info size={18} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{n.title}</span>
                    <Badge variant={TYPE_COLORS[n.type] || 'default'} size="sm">
                      {n.type.replace(/_/g, ' ')}
                    </Badge>
                    {!n.isRead && (
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: 'var(--color-primary-light)'
                      }} aria-label="Unread" />
                    )}
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{n.message}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
