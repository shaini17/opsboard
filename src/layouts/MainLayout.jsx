
import { useState } from "react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function MainLayout({
  activePage,
  onNavigate,
  children,
  user,
  onLogout,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="flex min-h-screen bg-[#F5F7FB]">

      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        user={user}
      />

      <div className="flex min-w-0 flex-1 flex-col">

        <Header
          user={user}
          onLogout={onLogout}
          onNavigate={onNavigate}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 md:p-8">

          <div className="mx-auto w-full max-w-[1600px]">
            {children}
          </div>

        </main>

      </div>
    </div>
  );
}
