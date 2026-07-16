import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ChatBot from '../dashboard/ChatBot';
import BottomNav from './BottomNav';
import './Layout.css';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isMobile = () => window.innerWidth < 768;

  useEffect(() => {
    if (isMobile()) setSidebarOpen(false);
    const handler = () => {
      if (isMobile()) setSidebarOpen(false);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <div className="app-layout">

      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        open={sidebarOpen}
        mobileOpen={mobileOpen}
        onToggle={() => setSidebarOpen((p) => !p)}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className={`main-area ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
        <Topbar
          onMenuClick={() => {
            if (isMobile()) setMobileOpen((p) => !p);
            else setSidebarOpen((p) => !p);
          }}
        />
        <main className="page-content">
          <Outlet />
          <ChatBot />
        </main>
      </div>

      <BottomNav />

    </div>
  );
}