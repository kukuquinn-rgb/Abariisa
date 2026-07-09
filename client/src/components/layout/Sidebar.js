import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Beef, Users, ClipboardList,
  CalendarCheck, Bell, ChevronLeft, ChevronRight,
  ShieldCheck, UserCog, UserPlus, BarChart2, ChevronDown, ChevronRight as ChevronRightIcon, Eye, Syringe, CalendarOff, LayoutList
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ADMIN_NAV_ITEMS = [
  { to: '/admin', label: 'Admin Dashboard', icon: ShieldCheck, roles: ['admin'], end: true },
  { to: '/admin/users', label: 'User Management', icon: UserCog, roles: ['admin'] }
];

const OPERATOR_NAV_ITEMS = [
  { to: '/collaborators', label: 'Collaborators', icon: UserPlus, roles: ['manager', 'admin'] }
];

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['manager', 'worker', 'admin'] },
  { to: '/livestock', label: 'Livestock', icon: Beef, roles: ['manager', 'admin'] },
  { to: '/workers', label: 'Workers', icon: Users, roles: ['manager', 'admin'] },
  { to: '/tasks', label: 'Tasks', icon: ClipboardList, roles: ['manager', 'worker', 'admin'] },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck, roles: ['manager', 'worker', 'admin'] },
  { to: '/notifications', label: 'Notifications', icon: Bell, roles: ['manager', 'worker', 'admin'] },
  { to: '/reports', label: 'Reports', icon: BarChart2, roles: ['manager', 'admin'] }
];

const NAV_SECTIONS = [
  {
    key: 'operations',
    label: 'FARM OPERATIONS',
    defaultOpen: true,
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['manager', 'worker', 'admin'] },
      { to: '/livestock', label: 'Livestock', icon: Beef, roles: ['manager', 'admin'] },
      { to: '/workers', label: 'Workers', icon: Users, roles: ['manager', 'admin'] },
      { to: '/tasks', label: 'Tasks', icon: ClipboardList, roles: ['manager', 'worker', 'admin'] },
      { to: '/attendance', label: 'Attendance', icon: CalendarCheck, roles: ['manager', 'worker', 'admin'] },
      { to: '/reports', label: 'Reports', icon: BarChart2, roles: ['manager', 'admin'] },
      { to: '/treatments', label: 'Health Schedule', icon: Syringe, roles: ['manager', 'admin'] },
      { to: '/leave', label: 'Leave', icon: CalendarOff, roles: ['manager', 'worker', 'admin'] },
      { to: '/work-plan', label: 'Work Plan', icon: LayoutList, roles: ['manager', 'worker', 'admin'] }
    ]
  },
  {
    key: 'communication',
    label: 'COMMUNICATION',
    defaultOpen: false,
    items: [
      { to: '/notifications', label: 'Notifications', icon: Bell, roles: ['manager', 'worker', 'admin'] }
    ]
  },
  {
    key: 'administration',
    label: 'ADMINISTRATION',
    defaultOpen: false,
    items: [
      { to: '/admin', label: 'Admin Dashboard', icon: ShieldCheck, roles: ['admin'], end: true },
      { to: '/admin/users', label: 'User Management', icon: UserCog, roles: ['admin'] }
    ]
  }
];

export default function Sidebar({ open, onToggle }) {
  const { user, isAdmin, isViewOnly } = useAuth();
  const [operationsOpen, setOperationsOpen] = useState(true);
  const [communicationOpen, setCommunicationOpen] = useState(false);
  const [administrationOpen, setAdministrationOpen] = useState(false);

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !user || item.roles.includes(user.role))
  })).filter((section) => section.items.length > 0);

  const communicationItems = visibleSections.find((section) => section.key === 'communication')?.items || [];
  const administrationItems = visibleSections.find((section) => section.key === 'administration')?.items || [];
  const operationsItems = visibleSections.find((section) => section.key === 'operations')?.items || [];

  const collaboratorItems = OPERATOR_NAV_ITEMS.filter((item) => user && item.roles.includes(user.role) && !isViewOnly);

  const renderNavItems = (items, isCollapsed = false) =>
    items.map(({ to, label, icon: Icon, end }) => (
      <li key={to} className="sidebar-nav-item">
        <NavLink
          to={to}
          end={end}
          className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''} ${isCollapsed ? 'collapsed-link' : ''}`}
          title={isCollapsed ? label : undefined}
        >
          <Icon aria-hidden="true" />
          {!isCollapsed && <span className="sidebar-nav-label">{label}</span>}
        </NavLink>
      </li>
    ));

  const renderSection = (section) => {
    const isOpen = section.key === 'operations'
      ? operationsOpen
      : section.key === 'communication'
        ? communicationOpen
        : administrationOpen;

    const toggleOpen = () => {
      if (section.key === 'operations') setOperationsOpen((value) => !value);
      if (section.key === 'communication') setCommunicationOpen((value) => !value);
      if (section.key === 'administration') setAdministrationOpen((value) => !value);
    };

    return (
      <div key={section.key} className="sidebar-section">
        <div className="sidebar-section-header" onClick={toggleOpen} role="button" tabIndex={0} onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleOpen();
          }
        }}>
          <span>{section.label}</span>
          {isOpen ? <ChevronDown size={14} /> : <ChevronRightIcon size={14} />}
        </div>
        <div className={`sidebar-section-items ${isOpen ? 'open' : 'closed'}`}>
          <ul className="sidebar-section-list" role="list">
            {renderNavItems(section.items)}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <aside className={`sidebar ${open ? '' : 'collapsed'}`} aria-label="Main navigation">
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

      <nav className="sidebar-nav-wrapper">
        {open ? (
          <div className="sidebar-nav" role="list">
            {renderSection({ key: 'operations', label: 'FARM OPERATIONS', items: operationsItems, defaultOpen: true })}
            {communicationItems.length > 0 && renderSection({ key: 'communication', label: 'COMMUNICATION', items: communicationItems, defaultOpen: false })}
            {administrationItems.length > 0 && renderSection({ key: 'administration', label: 'ADMINISTRATION', items: administrationItems, defaultOpen: false })}
            {collaboratorItems.length > 0 && (
              <div className="sidebar-section">
                <div className="sidebar-section-header" style={{ pointerEvents: 'none' }} />
                <div className="sidebar-section-items open">
                  <ul className="sidebar-section-list" role="list">
                    {renderNavItems(collaboratorItems)}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          <ul className="sidebar-nav sidebar-nav-collapsed" role="list">
            {renderNavItems([...operationsItems, ...communicationItems, ...administrationItems, ...collaboratorItems], true)}
          </ul>
        )}
      </nav>

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
