import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/components/app-sidebar'
import { Header } from '@/components/header'

export function RootLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev)
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0f0f10] text-[#f4f4f5]">
      {/* Sidebar wraps the left side of the application */}
      <AppSidebar isOpen={isSidebarOpen} />

      {/* Main container with Top Header and Page Outlet */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden bg-[#0f0f10]">
        {/* Top Header with toggle, current page icon, title, and settings */}
        <Header
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
        />

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-auto bg-[#0f0f10]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
