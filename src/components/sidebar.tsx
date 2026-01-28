'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { PanelLeft, PanelLeftClose } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Input } from './ui/input'
import { Event } from '@/types/database'
import { createEmptyEvent, deleteEvent, updateEventSettings } from '@/app/actions/events'

interface SidebarProps {
  user: any
  events?: Pick<Event, 'id' | 'name'>[]
}

export function Sidebar({ user, events = [] }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)
  
  // Sidebar collapse state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  // Avatar error state - fallback to initials if image fails to load
  const [avatarError, setAvatarError] = useState(false)
  
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

  // Focus input when editing starts
  useEffect(() => {
    if (editingEventId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingEventId])

  const startEditing = (event: Pick<Event, 'id' | 'name'>) => {
    setEditingEventId(event.id)
    setEditingName(event.name)
  }

  const cancelEditing = () => {
    setEditingEventId(null)
    setEditingName('')
  }

  const saveEventName = async (eventId: string) => {
    const trimmedName = editingName.trim()
    if (!trimmedName) {
      cancelEditing()
      return
    }
    
    try {
      await updateEventSettings(eventId, { name: trimmedName })
      router.refresh()
    } catch (error) {
      console.error('Failed to update event name:', error)
    } finally {
      cancelEditing()
    }
  }

  const handleEditKeyDown = (e: React.KeyboardEvent, eventId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEventName(eventId)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEditing()
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleNewEvent = async () => {
    if (creatingEvent) return
    setCreatingEvent(true)
    try {
      const event = await createEmptyEvent()
      router.push(`/events/${event.id}`)
      router.refresh()
    } catch (error) {
      console.error('Failed to create event:', error)
    } finally {
      setCreatingEvent(false)
    }
  }

  if (!user) return null

  const isActive = (path: string) => {
    if (path === '/events') {
      return pathname === '/events'
    }
    return pathname.startsWith(path)
  }

  const isEventActive = (eventId: string) => {
    return pathname.startsWith(`/events/${eventId}`)
  }

  // Link class - icons stay fixed, rounded highlights
  const linkClass = (path: string) =>
    `flex items-center gap-3 px-3 py-3 text-sm font-medium transition-colors cursor-pointer overflow-hidden whitespace-nowrap rounded-lg ${
      isActive(path)
        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
    }`

  // Get user initials for avatar
  const getInitials = () => {
    const name = user.user_metadata?.full_name || user.email || ''
    if (user.user_metadata?.full_name) {
      return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return name.slice(0, 2).toUpperCase()
  }

  // Get display name
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'

  return (
    <aside className={`flex h-screen flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-[68px]' : 'w-64'}`}>
      {/* Logo and Toggle */}
      <div className="relative flex items-center h-14 mt-4 px-3">
        {/* Full VROOM logo - fades out when collapsed */}
        <Link 
          href="/events" 
          className={`flex items-center h-10 px-3 cursor-pointer whitespace-nowrap transition-opacity duration-300 ${
            isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <span className="text-xl text-sidebar-foreground" style={{ fontFamily: 'var(--font-brand)', fontWeight: 700, fontStyle: 'italic' }}>VROOM</span>
        </Link>

        {/* Small "V" logo button - fades in when collapsed, fixed position */}
        <button
          onClick={toggleCollapsed}
          className={`group absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent cursor-pointer transition-opacity duration-300 ${
            isCollapsed ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          title="Expand sidebar"
        >
          {/* Small "V" logo - hidden on hover */}
          <span 
            className="text-lg font-bold italic group-hover:opacity-0 transition-opacity" 
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            V
          </span>
          {/* Expand icon - shown on hover */}
          <PanelLeft className="h-5 w-5 absolute opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Collapse toggle - right side when expanded */}
        <button
          onClick={toggleCollapsed}
          className={`absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer transition-opacity duration-300 ${
            isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          title="Collapse sidebar"
        >
          <PanelLeftClose className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          <Link href="/events" className={linkClass('/events')} title={isCollapsed ? 'Dashboard' : undefined}>
            <svg
              className="h-5 w-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className={`whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>Dashboard</span>
          </Link>
          <button
            onClick={handleNewEvent}
            disabled={creatingEvent}
            className={`w-full ${linkClass('/events/new')}`}
            title={isCollapsed ? 'New Event' : undefined}
          >
            <svg
              className="h-5 w-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className={`whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>{creatingEvent ? 'Creating...' : 'New Event'}</span>
          </button>
        </div>

        {/* Events list - fades in/out with the width animation */}
        {events.length > 0 && (
          <div 
            className={`mt-6 whitespace-nowrap transition-opacity duration-300 ${
              isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Your Events
            </h3>
            <div className="space-y-1">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isEventActive(event.id)
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  {editingEventId === event.id ? (
                    <div className="flex flex-1 items-center gap-3">
                      <svg
                        className="h-4 w-4 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <Input
                        ref={editInputRef}
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => saveEventName(event.id)}
                        onKeyDown={(e) => handleEditKeyDown(e, event.id)}
                        className="h-6 py-0 px-1 text-sm bg-sidebar border-sidebar-ring"
                      />
                    </div>
                  ) : (
                    <Link
                      href={`/events/${event.id}`}
                      className="flex flex-1 items-center gap-3 cursor-pointer"
                    >
                      <svg
                        className="h-4 w-4 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="truncate">{event.name}</span>
                    </Link>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 p-1 rounded hover:bg-sidebar-accent cursor-pointer">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                        />
                      </svg>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="right" className="w-40">
                      <DropdownMenuItem
                        onClick={() => startEditing(event)}
                        className="cursor-pointer"
                      >
                        <svg
                          className="mr-2 h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={async () => {
                          if (confirm('Are you sure you want to delete this event?')) {
                            await deleteEvent(event.id)
                            router.refresh()
                            if (pathname.startsWith(`/events/${event.id}`)) {
                              router.push('/events')
                            }
                          }
                        }}
                        className="cursor-pointer text-destructive focus:text-destructive"
                      >
                        <svg
                          className="mr-2 h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </div>
        )}

      </nav>

      {/* Personal Info and User section */}
      <div className="px-3 py-3 space-y-1">
        {/* Personal Info */}
        <Link href="/profile" className={linkClass('/profile')} title={isCollapsed ? 'Personal Info' : undefined}>
          <svg
            className="h-5 w-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span className={`whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>Personal Info</span>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger 
            className={`flex items-center rounded-lg hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent focus:outline-none cursor-pointer overflow-hidden transition-all duration-300 ${isCollapsed ? 'p-1' : 'w-full gap-3 px-3 py-2'}`}
            title={isCollapsed ? displayName : undefined}
          >
            {user.user_metadata?.avatar_url && !avatarError ? (
              <img
                src={user.user_metadata.avatar_url}
                alt={displayName}
                className="h-9 w-9 min-h-9 min-w-9 rounded-full flex-shrink-0 object-cover"
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-full bg-sidebar-foreground text-sm font-medium text-sidebar flex-shrink-0">
                {getInitials()}
              </div>
            )}
            {!isCollapsed && (
              <>
                <div className="flex flex-1 flex-col items-start text-left whitespace-nowrap">
                  <span className="text-sm font-medium text-sidebar-foreground">{displayName}</span>
                  <span className="text-xs text-sidebar-foreground/60 truncate max-w-[140px]">
                    {user.email}
                  </span>
                </div>
                <svg
                  className="h-4 w-4 text-sidebar-foreground/60 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 9l4-4 4 4m0 6l-4 4-4-4"
                  />
                </svg>
              </>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="w-56">
            <DropdownMenuItem
              onClick={() => router.push('/profile')}
              className="cursor-pointer"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Personal Info
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
