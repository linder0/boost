'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function EventTabs() {
  const pathname = usePathname()
  const router = useRouter()

  // Extract event ID from pathname: /events/[id]/...
  const eventId = pathname.split('/')[2]

  // Determine active tab from pathname
  const getActiveTab = () => {
    if (pathname.endsWith('/vendors') || pathname.includes('/vendors/')) {
      return 'vendors'
    }
    if (pathname.endsWith('/log')) {
      return 'log'
    }
    if (pathname.endsWith('/chat')) {
      return 'chat'
    }
    return 'info'
  }

  const handleTabChange = (value: string) => {
    if (!eventId || eventId === 'undefined') return
    
    switch (value) {
      case 'info':
        router.push(`/events/${eventId}`)
        break
      case 'vendors':
        router.push(`/events/${eventId}/vendors`)
        break
      case 'log':
        router.push(`/events/${eventId}/log`)
        break
      case 'chat':
        router.push(`/events/${eventId}/chat`)
        break
    }
  }

  const tabClass = `
    relative px-1 pb-3 pt-1 
    rounded-none shadow-none bg-transparent 
    data-[state=active]:bg-transparent data-[state=active]:shadow-none 
    text-muted-foreground data-[state=active]:text-foreground
    cursor-pointer
    hover:text-foreground
    transition-colors duration-200
    after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px]
    after:bg-transparent after:transition-colors after:duration-200
    data-[state=active]:after:bg-foreground
    hover:after:bg-muted-foreground/50
    data-[state=active]:hover:after:bg-foreground
  `

  return (
    <Tabs value={getActiveTab()} onValueChange={handleTabChange}>
      <TabsList className="h-auto bg-transparent p-0 gap-8 -mb-[1px]">
        <TabsTrigger value="info" className={tabClass}>
          Event Information
        </TabsTrigger>
        <TabsTrigger value="chat" className={tabClass}>
          Chat
        </TabsTrigger>
        <TabsTrigger value="vendors" className={tabClass}>
          Vendors
        </TabsTrigger>
        <TabsTrigger value="log" className={tabClass}>
          Automation Log
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
