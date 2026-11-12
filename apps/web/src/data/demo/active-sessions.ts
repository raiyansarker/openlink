export type DeviceKind = 'all-in-one' | 'laptop' | 'smartphone'

export type ActiveSession = {
  id: string
  kind: DeviceKind
  name: string
  location: string
  lastActive: string
  isCurrent: boolean
}

export const DEMO_ACTIVE_SESSIONS: ActiveSession[] = [
  {
    id: 'current',
    kind: 'all-in-one',
    name: 'This Mac',
    location: 'Safari · San Francisco, US',
    lastActive: 'Active now',
    isCurrent: true,
  },
  {
    id: 'laptop',
    kind: 'laptop',
    name: 'MacBook Pro',
    location: 'Chrome · Dhaka, BD',
    lastActive: '2 hours ago',
    isCurrent: false,
  },
  {
    id: 'phone',
    kind: 'smartphone',
    name: 'iPhone 15 Pro',
    location: 'OpenLink iOS · Dhaka, BD',
    lastActive: 'Yesterday',
    isCurrent: false,
  },
]
