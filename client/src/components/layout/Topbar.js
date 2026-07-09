import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Bell, LogOut, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../dashboard/UI';
import api from '../../utils/api';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/admin': 'Admin Dashboard',
  '/admin/users': 'User Management',
  '/livestock': 'Livestock Management',
  '/workers': 'Workers',
  '/collaborators': 'Collaborators',
  '/tasks': 'Tasks',
  '/attendance': 'Attendance',
  '/notifications': 'Notifications',
  '/reports': 'Reports & Analytics',
  '/treatments': 'Health Schedule',
  '/leave': 'Leave Management',
  '/work-plan': 'Work Plan',
};

export default function Topbar({ onMenuClick }) {
  const { user, logout, isViewOnly } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  const title = PAGE_TITLES[location.pathname] || 'Abariisa';
  const initials = user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { data } = await api.get('/notifications/unread-count');
        setUnread(data.count);
      } catch { /* silent */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="topbar" role="banner">
      <div className="topbar-left">
        <button className="topbar-menu-btn" onClick={onMenuClick} aria-label="Toggle sidebar">
          <Menu size={20} />
        </button>
        <h1 className="topbar-title">{title}</h1>
        {isViewOnly && <Badge variant="info"><Eye size={12} /> View-only</Badge>}
      </div>

      <div className="topbar-right">
        {/* Notification bell */}
        <button
          className="notif-btn"
          onClick={() => navigate('/notifications')}
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        >
          <Bell size={20} />
          {unread > 0 && (
            <span className="notif-badge" aria-hidden="true">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {/* User info */}
        <div className="topbar-user">
          <div className="topbar-user-avatar" aria-hidden="true">{initials}</div>
          <div className="topbar-user-info">
            <span className="topbar-user-name">{user?.name}</span>
            <span className="topbar-user-role">{user?.role}</span>
          </div>
        </div>

        <button className="topbar-logout-btn" onClick={handleLogout} aria-label="Log out">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
