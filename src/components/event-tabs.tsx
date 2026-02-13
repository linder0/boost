'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { LayoutDashboard, ChefHat, Flower2, Clapperboard, Users, MessageCircle } from 'lucide-react'
import { TabOverview } from '@/components/tab-overview'
import { TabChef } from '@/components/tab-chef'
import { TabDecor } from '@/components/tab-decor'
import { TabProduction } from '@/components/tab-production'
import { TabGuests } from '@/components/tab-guests'
import { TabChat } from '@/components/tab-chat'
import type { Event } from '@/app/actions/events'
import type { EntityWithEventStatus } from '@/app/actions/entities'

interface EventTabsProps {
  event: Event
  entities: EntityWithEventStatus[]
}

const TAB_CONFIG = [
  { value: 'overview', label: 'Overview', icon: LayoutDashboard },
  { value: 'chef', label: 'Chef', icon: ChefHat },
  { value: 'decor', label: 'Decor', icon: Flower2 },
  { value: 'production', label: 'Production', icon: Clapperboard },
  { value: 'guests', label: 'Guests', icon: Users },
  { value: 'chat', label: 'Chat', icon: MessageCircle },
] as const

export function EventTabs({ event, entities }: EventTabsProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const currentTab = searchParams.get('tab') || 'overview'

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'overview') {
      params.delete('tab')
    } else {
      params.set('tab', value)
    }
    const queryString = params.toString()
    router.push(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false })
  }

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
      <div className="border-b px-6">
        <TabsList className="h-11 bg-transparent p-0 gap-1">
          {TAB_CONFIG.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="relative h-11 rounded-none border-b-2 border-transparent px-4 pb-3 pt-3 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <div className="flex-1 overflow-auto">
        <TabsContent value="overview" className="mt-0 p-6">
          <TabOverview event={event} entities={entities} />
        </TabsContent>
        <TabsContent value="chef" className="mt-0 p-6">
          <TabChef event={event} entities={entities} />
        </TabsContent>
        <TabsContent value="decor" className="mt-0 p-6">
          <TabDecor event={event} entities={entities} />
        </TabsContent>
        <TabsContent value="production" className="mt-0 p-6">
          <TabProduction event={event} entities={entities} />
        </TabsContent>
        <TabsContent value="guests" className="mt-0 p-6">
          <TabGuests event={event} entities={entities} />
        </TabsContent>
        <TabsContent value="chat" className="mt-0 p-6">
          <TabChat event={event} />
        </TabsContent>
      </div>
    </Tabs>
  )
}
