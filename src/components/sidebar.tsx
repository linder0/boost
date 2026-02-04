'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { PanelLeft, PanelLeftClose, Search, Upload, List } from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()

  // Sidebar collapse state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(saved === 'true')
    }
  }, [])

  const toggleCollapsed = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('sidebar-collapsed', String(newState))
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(path)
  }

  // Link class - icons stay fixed, rounded highlights
  const linkClass = (path: string) =>
    `flex items-center gap-3 py-3 pl-3 pr-3 text-sm font-medium cursor-pointer overflow-hidden whitespace-nowrap rounded-lg transition-all duration-300 ${
      isActive(path)
        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
    }`

  return (
    <aside className={`flex h-screen flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-[68px]' : 'w-64'}`}>
      {/* Logo and Toggle */}
      <div className="relative flex items-center h-14 mt-4 px-3.5">
        {/* Logo - always visible, clickable to home when expanded, toggles sidebar when collapsed */}
        <Link
          href="/"
          className={`absolute left-[14px] top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-lg cursor-pointer ${isCollapsed ? 'pointer-events-none' : ''}`}
        >
          <Image src="/logo.svg" alt="Logo" width={32} height={32} className="h-8 w-8" />
        </Link>

        {/* Clickable overlay for collapsed state to expand sidebar */}
        <button
          onClick={toggleCollapsed}
          className={`group absolute left-[14px] top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent cursor-pointer transition-opacity duration-300 ${isCollapsed ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          title="Expand sidebar"
        >
          <span className="h-8 w-8 group-hover:opacity-0 transition-opacity" />
          <PanelLeft className="h-5 w-5 absolute opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Collapse toggle - right side when expanded */}
        <button
          onClick={toggleCollapsed}
          className={`absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer transition-opacity duration-300 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          title="Collapse sidebar"
        >
          <PanelLeftClose className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          <Link href="/" className={linkClass('/')} title={isCollapsed ? 'Vendors' : undefined}>
            <List className="h-5 w-5 flex-shrink-0" />
            <span className={`whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>Vendors</span>
          </Link>
          <Link href="/discover" className={linkClass('/discover')} title={isCollapsed ? 'Discover' : undefined}>
            <Search className="h-5 w-5 flex-shrink-0" />
            <span className={`whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>Discover</span>
          </Link>
          <Link href="/import" className={linkClass('/import')} title={isCollapsed ? 'Import' : undefined}>
            <Upload className="h-5 w-5 flex-shrink-0" />
            <span className={`whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>Import</span>
          </Link>
        </div>
      </nav>
    </aside>
  )
}
