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
import {
  HomeIcon,
  PlusIcon,
  DocumentIcon,
  CalendarIcon,
  MoreDotsIcon,
  EditIcon,
  TrashIcon,
  ChevronUpDownIcon,
  SignOutIcon,
} from './ui/icons'
import type { User } from '@supabase/supabase-js'

interface SidebarProps {
  user: User
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

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      await deleteEvent(eventId)
      router.refresh()
      if (pathname.startsWith(`/events/${eventId}`)) {
        router.push('/events')
      }
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
  // Use justify-center when collapsed to center icon, justify-start when expanded
  const linkClass = (path: string) =>
    `flex items-center gap-3 py-3 text-sm font-medium cursor-pointer overflow-hidden whitespace-nowrap rounded-lg transition-all duration-300 ${
      isCollapsed ? 'justify-center px-0' : 'justify-start px-3'
    } ${
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
      <div className="relative flex items-center h-14 mt-4 px-3.5">
        {/* Full VROOM logo - hidden when collapsed */}
        <Link
          href="/events"
          className={`flex items-center h-10 px-3 cursor-pointer whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <span className="text-xl text-sidebar-foreground" style={{ fontFamily: 'var(--font-brand)', fontWeight: 700, fontStyle: 'italic' }}>VROOM</span>
        </Link>

        {/* Small "V" logo button - shown when collapsed, fixed position to prevent sliding */}
        <button
          onClick={toggleCollapsed}
          className={`group absolute left-[14px] top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent cursor-pointer transition-opacity duration-300 ${isCollapsed ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
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
          className={`absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer transition-opacity duration-300 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          title="Collapse sidebar"
        >
          <PanelLeftClose className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          <Link href="/events" className={linkClass('/events')} title={isCollapsed ? 'Dashboard' : undefined}>
            <HomeIcon className="flex-shrink-0" />
            <span className={`whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>Dashboard</span>
          </Link>
          <button
            onClick={handleNewEvent}
            disabled={creatingEvent}
            className={`w-full ${linkClass('/events/new')}`}
            title={isCollapsed ? 'New Event' : undefined}
          >
            <PlusIcon className="flex-shrink-0" />
            <span className={`whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>{creatingEvent ? 'Creating...' : 'New Event'}</span>
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
                <EventListItem
                  key={event.id}
                  event={event}
                  isActive={isEventActive(event.id)}
                  isEditing={editingEventId === event.id}
                  editingName={editingName}
                  editInputRef={editInputRef}
                  onEditingNameChange={setEditingName}
                  onSave={() => saveEventName(event.id)}
                  onKeyDown={(e) => handleEditKeyDown(e, event.id)}
                  onStartEditing={() => startEditing(event)}
                  onDelete={() => handleDeleteEvent(event.id)}
                />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Personal Info and User section */}
      <div className="px-3 py-3 space-y-1">
        {/* Personal Info */}
        <Link href="/profile" className={linkClass('/profile')} title={isCollapsed ? 'Personal Info' : undefined}>
          <DocumentIcon className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>Personal Info</span>
        </Link>
        <UserMenu
          user={user}
          displayName={displayName}
          avatarError={avatarError}
          isCollapsed={isCollapsed}
          getInitials={getInitials}
          onAvatarError={() => setAvatarError(true)}
          onProfileClick={() => router.push('/profile')}
          onSignOut={handleSignOut}
        />
      </div>
    </aside>
  )
}

// ============================================================================
// Subcomponents
// ============================================================================

interface EventListItemProps {
  event: Pick<Event, 'id' | 'name'>
  isActive: boolean
  isEditing: boolean
  editingName: string
  editInputRef: React.RefObject<HTMLInputElement | null>
  onEditingNameChange: (name: string) => void
  onSave: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onStartEditing: () => void
  onDelete: () => void
}

function EventListItem({
  event,
  isActive,
  isEditing,
  editingName,
  editInputRef,
  onEditingNameChange,
  onSave,
  onKeyDown,
  onStartEditing,
  onDelete,
}: EventListItemProps) {
  return (
    <div
      className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      }`}
    >
      {isEditing ? (
        <div className="flex flex-1 items-center gap-3">
          <CalendarIcon className="flex-shrink-0" />
          <Input
            ref={editInputRef}
            value={editingName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            onBlur={onSave}
            onKeyDown={onKeyDown}
            className="h-6 py-0 px-1 text-sm bg-sidebar border-sidebar-ring"
          />
        </div>
      ) : (
        <Link
          href={`/events/${event.id}`}
          className="flex flex-1 items-center gap-3 cursor-pointer"
        >
          <CalendarIcon className="flex-shrink-0" />
          <span className="truncate">{event.name}</span>
        </Link>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 p-1 rounded hover:bg-sidebar-accent cursor-pointer">
          <MoreDotsIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="right" className="w-40">
          <DropdownMenuItem onClick={onStartEditing} className="cursor-pointer">
            <EditIcon className="mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onDelete}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <TrashIcon className="mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

interface UserMenuProps {
  user: User
  displayName: string
  avatarError: boolean
  isCollapsed: boolean
  getInitials: () => string
  onAvatarError: () => void
  onProfileClick: () => void
  onSignOut: () => void
}

function UserMenu({
  user,
  displayName,
  avatarError,
  isCollapsed,
  getInitials,
  onAvatarError,
  onProfileClick,
  onSignOut,
}: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`flex items-center rounded-lg hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent focus:outline-none cursor-pointer overflow-hidden ${isCollapsed ? 'p-1' : 'w-full gap-3 px-3 py-2'}`}
        title={isCollapsed ? displayName : undefined}
      >
        {user.user_metadata?.avatar_url && !avatarError ? (
          <img
            src={user.user_metadata.avatar_url}
            alt={displayName}
            className="h-9 w-9 min-h-9 min-w-9 rounded-full flex-shrink-0 object-cover"
            referrerPolicy="no-referrer"
            onError={onAvatarError}
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
            <ChevronUpDownIcon className="text-sidebar-foreground/60 flex-shrink-0" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" side="top" className="w-56">
        <DropdownMenuItem onClick={onProfileClick} className="cursor-pointer">
          <DocumentIcon className="mr-2 h-4 w-4" />
          Personal Info
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onSignOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <SignOutIcon className="mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
