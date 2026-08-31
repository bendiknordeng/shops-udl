import type { TimerState } from './types'

export const idleTimer: TimerState = {
  status: 'idle',
  deadline: null,
  remainingMs: null,
  durationMs: null,
}

export function startTimer(seconds: number, now = Date.now()): TimerState {
  const durationMs = seconds * 1000
  return { status: 'running', deadline: now + durationMs, remainingMs: null, durationMs }
}

export function pauseTimer(timer: TimerState, now = Date.now()): TimerState {
  if (timer.status !== 'running' || timer.deadline === null) return timer
  return { ...timer, status: 'paused', deadline: null, remainingMs: Math.max(0, timer.deadline - now) }
}

export function resumeTimer(timer: TimerState, now = Date.now()): TimerState {
  if (timer.status !== 'paused' || timer.remainingMs === null) return timer
  return { ...timer, status: 'running', deadline: now + timer.remainingMs, remainingMs: null }
}

/** Verten avslutter aktiv svarfase manuelt — frys gjenstående tid. */
export function stopTimer(timer: TimerState, now = Date.now()): TimerState {
  if (timer.status === 'running' && timer.deadline !== null) {
    return { ...timer, status: 'stopped', deadline: null, remainingMs: Math.max(0, timer.deadline - now) }
  }
  if (timer.status === 'paused') {
    return { ...timer, status: 'stopped', deadline: null }
  }
  return timer
}

export function expireTimer(timer: TimerState): TimerState {
  return { ...timer, status: 'expired', deadline: null, remainingMs: 0 }
}

/** Gjenstående ms beregnet fra absolutt deadline (aldri frame-tellere). */
export function remainingMs(timer: TimerState, now = Date.now()): number {
  if (timer.status === 'running' && timer.deadline !== null) return Math.max(0, timer.deadline - now)
  if (timer.remainingMs !== null) return timer.remainingMs
  return timer.durationMs ?? 0
}
