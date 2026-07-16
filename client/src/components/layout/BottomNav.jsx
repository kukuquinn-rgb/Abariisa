import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Beef,
  ClipboardList,
  CalendarCheck,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BOTTOM_ITEMS = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Home'       },
  { to: '/livestock',     icon: Beef,            label: 'Livestock'  },
  { to: '/tasks',         icon: ClipboardList,   label: 'Tasks'      },
  { to: '/attendance',    icon: CalendarCheck,   label: 'Attendance' },
  { to: '/notifications', icon: Bell,            label: 'Alerts'     },
];

export default function BottomNav() {
  const { user } = useAuth();

  const visible = BOTTOM_ITEMS.filter((item) => {
    // Workers cannot see Livestock
    if (item.to === '/livestock' && user?.role === 'worker') return false;
    return true;
  });

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {visible.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `bottom-nav-item ${isActive ? 'active' : ''}`
          }
        >
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}