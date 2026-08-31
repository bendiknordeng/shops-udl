import Dexie, { type EntityTable } from 'dexie'

export type SessionRow = {
  id: string
  packId: string
  packVersion: string
  status: 'setup' | 'active' | 'finished'
  snapshot: unknown
  updatedAt: number
}

export type HistoryRow = {
  id?: number
  createdAt: number
  label: string
  snapshot: unknown
}

export type SettingsRow = {
  key: string
  value: unknown
}

export const SESSION_ID = 'current'

export const db = new Dexie('shops-udl-quiz') as Dexie & {
  sessions: EntityTable<SessionRow, 'id'>
  history: EntityTable<HistoryRow, 'id'>
  settings: EntityTable<SettingsRow, 'key'>
}

db.version(1).stores({
  sessions: 'id',
  history: '++id, createdAt',
  settings: 'key',
})
