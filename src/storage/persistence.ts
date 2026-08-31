import { db, SESSION_ID, type SessionRow } from './database'

export type PersistenceStatus = 'ok' | 'failed'

type StatusListener = (status: PersistenceStatus, message?: string) => void

let queue: Promise<unknown> = Promise.resolve()
let statusListener: StatusListener | null = null

export function onPersistenceStatus(listener: StatusListener) {
  statusListener = listener
}

/** Serialiserte skriv — en eldre snapshot kan aldri overskrive en nyere. */
function enqueue<T>(work: () => Promise<T>): Promise<T | null> {
  const next = queue.then(work).catch((err) => {
    // Persistens feiler → spillet fortsetter i minnet, verten varsles (GAME_SPEC §16).
    console.error('Persistering feilet:', err)
    statusListener?.('failed', err instanceof Error ? err.message : String(err))
    return null
  })
  queue = next
  return next
}

export function deriveStatus(stateValue: unknown, teamsDrawn: boolean): SessionRow['status'] {
  if (stateValue === 'setup' && !teamsDrawn) return 'setup'
  return 'active'
}

export function saveSnapshot(params: {
  packId: string
  packVersion: string
  snapshot: unknown
  status: SessionRow['status']
}) {
  return enqueue(async () => {
    await db.sessions.put({
      id: SESSION_ID,
      packId: params.packId,
      packVersion: params.packVersion,
      status: params.status,
      snapshot: JSON.parse(JSON.stringify(params.snapshot)),
      updatedAt: Date.now(),
    })
    statusListener?.('ok')
  })
}

export async function loadSession(): Promise<SessionRow | null> {
  try {
    return (await db.sessions.get(SESSION_ID)) ?? null
  } catch (err) {
    console.error('Kunne ikke lese lagret spilløkt:', err)
    return null
  }
}

export function finishSession() {
  return enqueue(async () => {
    const row = await db.sessions.get(SESSION_ID)
    if (row) await db.sessions.put({ ...row, status: 'finished', updatedAt: Date.now() })
  })
}

export function clearSession() {
  return enqueue(async () => {
    await db.sessions.delete(SESSION_ID)
    await db.history.clear()
  })
}

/** Undo-historikk: bounded snapshot-stack (nyeste sist). */
export function saveUndoStack(snapshots: unknown[]) {
  return enqueue(async () => {
    await db.history.clear()
    if (snapshots.length > 0) {
      await db.history.bulkAdd(
        snapshots.map((s, i) => ({
          createdAt: Date.now() + i,
          label: 'undo',
          snapshot: JSON.parse(JSON.stringify(s)),
        })),
      )
    }
  })
}

export async function loadUndoStack(): Promise<unknown[]> {
  try {
    const rows = await db.history.orderBy('createdAt').toArray()
    return rows.map((r) => r.snapshot)
  } catch {
    return []
  }
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const row = await db.settings.get(key)
    return row ? (row.value as T) : fallback
  } catch {
    return fallback
  }
}

export function setSetting(key: string, value: unknown) {
  return enqueue(async () => {
    await db.settings.put({ key, value })
  })
}
