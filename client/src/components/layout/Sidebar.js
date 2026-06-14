import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Beef, Users, ClipboardList,
  CalendarCheck, Bell, ChevronLeft, ChevronRight, Leaf,
  ShieldCheck, UserCog, UserPlus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ADMIN_NAV_ITEMS = [
  { to: '/admin', label: 'Admin Dashboard', icon: ShieldCheck, roles: ['admin'], end: true },
  { to: '/admin/users', label: 'User Management', icon: UserCog, roles: ['admin'] }
];

const OPERATOR_NAV_ITEMS = [
  { to: '/collaborators', label: 'Collaborators', icon: UserPlus, roles: ['manager','admin'] }
];

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['manager', 'worker', 'admin'] },
  { to: '/livestock', label: 'Livestock', icon: Beef, roles: ['manager', 'admin'] },
  { to: '/workers', label: 'Workers', icon: Users, roles: ['manager', 'admin'] },
  { to: '/tasks', label: 'Tasks', icon: ClipboardList, roles: ['manager', 'worker', 'admin'] },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck, roles: ['manager', 'worker', 'admin'] },
  { to: '/notifications', label: 'Notifications', icon: Bell, roles: ['manager', 'worker', 'admin'] },
];

export default function Sidebar({ open, onToggle }) {
  const { user } = useAuth();

  const { isAdmin, isViewOnly } = useAuth();
  const visibleItems = NAV_ITEMS.filter((item) => !user || item.roles.includes(user.role));
  const adminItems = ADMIN_NAV_ITEMS.filter((item) => isAdmin);
  const operatorItems = OPERATOR_NAV_ITEMS.filter((item) => user && item.roles.includes(user.role) && !isViewOnly);

  return (
    <aside className={`sidebar ${open ? '' : 'collapsed'}`} aria-label="Main navigation">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon" aria-hidden="true">
          <Leaf size={20} color="#14532d" />
        </div>
        <span className="sidebar-brand-text">Abariisa</span>
      </div>

      {/* Nav */}
      <nav>
        <ul className="sidebar-nav" role="list">
          {adminItems.length > 0 && (
            <>
              {adminItems.map(({ to, label, icon: Icon, end }) => (
                <li key={to} className="sidebar-nav-item">
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
                    title={!open ? label : undefined}
                  >
                    <Icon aria-hidden="true" />
                    <span className="sidebar-nav-label">{label}</span>
                  </NavLink>
                </li>
              ))}
              <li className="sidebar-nav-divider" aria-hidden="true" />
            </>
          )}

          {operatorItems.length > 0 && (
            <>
              {operatorItems.map(({ to, label, icon: Icon }) => (
                <li key={to} className="sidebar-nav-item">
                  <NavLink
                    to={to}
                    className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
                    title={!open ? label : undefined}
                  >
                    <Icon aria-hidden="true" />
                    <span className="sidebar-nav-label">{label}</span>
                  </NavLink>
                </li>
              ))}
              <li className="sidebar-nav-divider" aria-hidden="true" />
            </>
          )}

          {visibleItems.map(({ to, label, icon: Icon }) => (
            <li key={to} className="sidebar-nav-item">
              <NavLink
                to={to}
                className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
                title={!open ? label : undefined}
              >
                <Icon aria-hidden="true" />
                <span className="sidebar-nav-label">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <div className="sidebar-toggle">
        <button
          className="sidebar-toggle-btn"
          onClick={onToggle}
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {open ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>
    </aside>
  );
}
