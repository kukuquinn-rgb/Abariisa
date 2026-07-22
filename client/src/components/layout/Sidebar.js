import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Beef, Users, ClipboardList,
  CalendarCheck, Bell, ChevronLeft, ChevronRight,
  ShieldCheck, UserCog, UserPlus, BarChart2,
  ChevronDown, ChevronRight as ChevronRightIcon,
  Syringe, CalendarOff, LayoutList, Briefcase
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_STRUCTURE = [
  {
    key: 'dashboard',
    type: 'link',
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['manager', 'worker', 'admin'],
    end: true,
  },
  {
    key: 'livestock',
    type: 'group',
    label: 'LIVESTOCK',
    icon: Beef,
    roles: ['manager', 'admin'],
    defaultOpen: false,
    items: [
      { to: '/livestock',   label: 'All Animals',     icon: Beef,    roles: ['manager', 'admin'] },
      { to: '/treatments',  label: 'Health Schedule', icon: Syringe, roles: ['manager', 'admin'] },
    ]
  },
  {
    key: 'workforce',
    type: 'group',
    label: 'WORKFORCE',
    icon: Users,
    roles: ['manager', 'admin'],
    defaultOpen: false,
    items: [
      { to: '/workers',    label: 'Workers',    icon: Users,        roles: ['manager', 'admin'] },
      { to: '/attendance', label: 'Attendance', icon: CalendarCheck,roles: ['manager', 'admin'] },
      { to: '/leave',      label: 'Leave',      icon: CalendarOff,  roles: ['manager', 'admin'] },
    ]
  },
  {
    key: 'worker-tools',
    type: 'group',
    label: 'MY WORK',
    icon: Briefcase,
    roles: ['worker'],
    defaultOpen: true,
    items: [
      { to: '/tasks',      label: 'My Tasks',    icon: ClipboardList, roles: ['worker'] },
      { to: '/attendance', label: 'Attendance',  icon: CalendarCheck, roles: ['worker'] },
      { to: '/leave',      label: 'Leave',       icon: CalendarOff,   roles: ['worker'] },
      { to: '/work-plan',  label: 'Work Plan',   icon: LayoutList,    roles: ['worker'] },
    ]
  },
  {
    key: 'tasks',
    type: 'group',
    label: 'TASKS',
    icon: ClipboardList,
    roles: ['manager', 'admin'],
    defaultOpen: false,
    items: [
      { to: '/tasks',     label: 'All Tasks',  icon: ClipboardList, roles: ['manager', 'admin'] },
      { to: '/work-plan', label: 'Work Plan',  icon: LayoutList,    roles: ['manager', 'admin'] },
    ]
  },
  {
    key: 'reports',
    type: 'link',
    to: '/reports',
    label: 'Reports',
    icon: BarChart2,
    roles: ['manager', 'admin'],
  },
  {
    key: 'notifications',
    type: 'link',
    to: '/notifications',
    label: 'Notifications',
    icon: Bell,
    roles: ['manager', 'worker', 'admin'],
  },
  {
    key: 'collaborators',
    type: 'link',
    to: '/collaborators',
    label: 'Collaborators',
    icon: UserPlus,
    roles: ['manager', 'admin'],
    viewOnlyHidden: true,
  },
  {
    key: 'administration',
    type: 'group',
    label: 'ADMINISTRATION',
    icon: ShieldCheck,
    roles: ['admin'],
    defaultOpen: false,
    items: [
      { to: '/admin',       label: 'Admin Dashboard', icon: ShieldCheck, roles: ['admin'], end: true },
      { to: '/admin/users', label: 'User Management', icon: UserCog,     roles: ['admin'] },
    ]
  },
];

export default function Sidebar({ open, onToggle, mobileOpen, onMobileClose }) {
  const { user, isViewOnly } = useAuth();

  // Track open state for each group
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {};
    NAV_STRUCTURE.forEach((item) => {
      if (item.type === 'group') {
        initial[item.key] = item.defaultOpen ?? false;
      }
    });
    return initial;
  });

  const toggleGroup = (key) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter nav structure by role
  const visibleNav = NAV_STRUCTURE
    .filter((item) => {
      if (!user) return false;
      if (!item.roles.includes(user.role)) return false;
      if (item.viewOnlyHidden && isViewOnly) return false;
      return true;
    })
    .map((item) => {
      if (item.type === 'group') {
        return {
          ...item,
          items: item.items.filter((sub) => !user || sub.roles.includes(user.role))
        };
      }
      return item;
    })
    .filter((item) => item.type !== 'group' || item.items.length > 0);

  // All flat items for collapsed icon-only view
  const allFlatItems = visibleNav.flatMap((item) =>
    item.type === 'link' ? [item] : item.items.map((sub) => ({ ...sub }))
  );

  const renderLink = (item, isCollapsed = false) => (
    <li key={item.to} className="sidebar-nav-item">
      <NavLink
        to={item.to}
        end={item.end}
        onClick={onMobileClose}
        className={({ isActive }) =>
          `sidebar-nav-link ${isActive ? 'active' : ''} ${isCollapsed ? 'collapsed-link' : ''}`
        }
        title={isCollapsed ? item.label : undefined}
      >
        <item.icon aria-hidden="true" />
        {!isCollapsed && <span className="sidebar-nav-label">{item.label}</span>}
      </NavLink>
    </li>
  );

  const renderGroup = (item) => {
    const isOpen = openGroups[item.key];
    return (
      <div key={item.key} className="sidebar-section">
        <div
          className="sidebar-section-header"
          onClick={() => toggleGroup(item.key)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleGroup(item.key);
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <item.icon size={13} aria-hidden="true" />
            <span>{item.label}</span>
          </div>
          {isOpen
            ? <ChevronDown size={13} />
            : <ChevronRightIcon size={13} />}
        </div>
        <div className={`sidebar-section-items ${isOpen ? 'open' : 'closed'}`}>
          <ul className="sidebar-section-list" role="list">
            {item.items.map((sub) => renderLink(sub))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <aside
      className={`sidebar ${open ? '' : 'collapsed'} ${mobileOpen ? 'mobile-open' : ''}`}
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="14" cy="16" rx="9" ry="7" fill="#fff" stroke="#78350f" strokeWidth="1.5" />
            <ellipse cx="14" cy="9" rx="6" ry="5" fill="#fff" stroke="#78350f" strokeWidth="1.5" />
            <ellipse cx="8.5" cy="7" rx="2" ry="1.5" fill="#fff" stroke="#78350f" strokeWidth="1.5" />
            <ellipse cx="19.5" cy="7" rx="2" ry="1.5" fill="#fff" stroke="#78350f" strokeWidth="1.5" />
            <ellipse cx="11" cy="15" rx="2.5" ry="2" fill="#78350f" opacity="0.3" />
            <ellipse cx="17" cy="17" rx="2" ry="1.5" fill="#78350f" opacity="0.3" />
            <circle cx="11.5" cy="8.5" r="1" fill="#78350f" />
            <circle cx="16.5" cy="8.5" r="1" fill="#78350f" />
            <ellipse cx="14" cy="11.5" rx="2.5" ry="1.5" fill="#fca5a5" stroke="#78350f" strokeWidth="1" />
            <circle cx="13" cy="11.5" r="0.5" fill="#78350f" />
            <circle cx="15" cy="11.5" r="0.5" fill="#78350f" />
            <path d="M3 26 Q5 22 7 26" stroke="#16a34a" strokeWidth="1.5" fill="none" />
            <path d="M6 26 Q8 21 10 26" stroke="#16a34a" strokeWidth="1.5" fill="none" />
            <path d="M18 26 Q20 21 22 26" stroke="#16a34a" strokeWidth="1.5" fill="none" />
            <path d="M21 26 Q23 22 25 26" stroke="#16a34a" strokeWidth="1.5" fill="none" />
            <circle cx="4" cy="22" r="2" fill="#d97706" />
            <circle cx="4" cy="19.5" r="1.5" fill="#d97706" />
            <path d="M3 19 L2 17.5 L4 18.5" fill="#d97706" />
            <circle cx="4.5" cy="19" r="0.4" fill="#451a03" />
            <circle cx="24" cy="22" r="2" fill="#d97706" />
            <circle cx="24" cy="19.5" r="1.5" fill="#d97706" />
            <path d="M25 19 L26 17.5 L24 18.5" fill="#d97706" />
            <circle cx="23.5" cy="19" r="0.4" fill="#451a03" />
          </svg>
        </div>
        <div className="sidebar-brand-content">
          <span className="sidebar-brand-text">Abariisa</span>
          {isViewOnly && open && <span className="sidebar-view-only">View only</span>}
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav-wrapper">
        {open ? (
          <div className="sidebar-nav" role="list">
            {visibleNav.map((item) =>
              item.type === 'link'
                ? <ul key={item.key} className="sidebar-section-list" role="list" style={{ marginBottom: 2 }}>
                    {renderLink(item)}
                  </ul>
                : renderGroup(item)
            )}
          </div>
        ) : (
          <ul className="sidebar-nav sidebar-nav-collapsed" role="list">
            {allFlatItems.map((item) => renderLink(item, true))}
          </ul>
        )}
      </nav>

      {/* Toggle button */}
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