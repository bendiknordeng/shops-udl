/**
 * Syntetiske lydeffekter (Web Audio) — egen volumkanal adskilt fra
 * spørsmålsmedia. Ingen filer, ingen metadata som kan røpe noe.
 */

let ctx: AudioContext | null = null
let sfxGain: GainNode | null = null
let volume = 0.5

function ensureContext(): AudioContext | null {
  try {
    if (!ctx) {
      ctx = new AudioContext()
      sfxGain = ctx.createGain()
      sfxGain.gain.value = volume
      sfxGain.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

export function setSfxVolume(v: number) {
  volume = v
  if (sfxGain) sfxGain.gain.value = v
}

function blip(freq: number, durationMs: number, type: OscillatorType = 'sine', gain = 0.5, delayMs = 0) {
  const audio = ensureContext()
  if (!audio || !sfxGain) return
  const t0 = audio.currentTime + delayMs / 1000
  const osc = audio.createOscillator()
  const env = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  env.gain.setValueAtTime(0, t0)
  env.gain.linearRampToValueAtTime(gain, t0 + 0.01)
  env.gain.exponentialRampToValueAtTime(0.001, t0 + durationMs / 1000)
  osc.connect(env)
  env.connect(sfxGain)
  osc.start(t0)
  osc.stop(t0 + durationMs / 1000 + 0.05)
}

/** Tikk i nedtellingens siste sekunder. */
export function tick(urgent: boolean) {
  blip(urgent ? 1180 : 880, 70, 'square', urgent ? 0.22 : 0.14)
}

/** Tiden er ute. */
export function timeUp() {
  blip(220, 350, 'sawtooth', 0.3)
  blip(165, 500, 'sawtooth', 0.28, 120)
}

/** Rute åpnes. */
export function whoosh() {
  const audio = ensureContext()
  if (!audio || !sfxGain) return
  const t0 = audio.currentTime
  const osc = audio.createOscillator()
  const env = audio.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(180, t0)
  osc.frequency.exponentialRampToValueAtTime(720, t0 + 0.35)
  env.gain.setValueAtTime(0.18, t0)
  env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4)
  osc.connect(env)
  env.connect(sfxGain)
  osc.start(t0)
  osc.stop(t0 + 0.5)
}

/** Poeng tildeles. */
export function award() {
  blip(523, 140, 'triangle', 0.3)
  blip(659, 140, 'triangle', 0.3, 110)
  blip(784, 260, 'triangle', 0.32, 220)
}

/** Vinnerfanfare. */
export function fanfare() {
  const notes = [523, 659, 784, 1047]
  notes.forEach((f, i) => blip(f, 300, 'triangle', 0.32, i * 160))
  blip(1319, 600, 'triangle', 0.3, notes.length * 160)
}
