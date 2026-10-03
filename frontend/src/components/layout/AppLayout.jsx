import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ComposeModal from '../email/ComposeModal';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#1E1E1C] flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Topbar
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onOpenCompose={() => setComposeOpen(true)}
          onRefreshData={handleRefresh}
        />
        <main className="flex-1 flex flex-col min-w-0">
          <Outlet context={{ refreshKey, onRefresh: handleRefresh }} />
        </main>
      </div>

      {/* Compose Email Modal */}
      <ComposeModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onCreated={handleRefresh}
      />
    </div>
  );
}
