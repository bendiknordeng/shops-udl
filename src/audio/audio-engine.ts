import { Howl, Howler } from 'howler'
import type { AudioMedia } from '../content/schemas'

export type AudioEngineStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error'

export type AudioEngineState = {
  status: AudioEngineStatus
  clueId: string | null
  error: string | null
}

type Listener = (state: AudioEngineState) => void

const POSITION_KEY_PREFIX = 'shops-quiz:media-pos:'

/**
 * Howler-basert motor for spørsmålslyd. Egen volumkanal for spørsmålsmedia,
 * separat fra lydeffektene (sfx.ts). Viser aldri metadata som kan røpe svar.
 */
class AudioEngine {
  private howl: Howl | null = null
  private media: AudioMedia | null = null
  private clueId: string | null = null
  private mediaVolume = 1
  private state: AudioEngineState = { status: 'idle', clueId: null, error: null }
  private listeners = new Set<Listener>()
  private watchInterval: number | null = null
  private analyser: AnalyserNode | null = null

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  getState(): AudioEngineState {
    return this.state
  }

  private setState(patch: Partial<AudioEngineState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((l) => l(this.state))
  }

  setMediaVolume(volume: number) {
    this.mediaVolume = volume
    if (this.howl && this.media) {
      this.howl.volume(this.effectiveVolume())
    }
  }

  private effectiveVolume(): number {
    return (this.media?.volume ?? 1) * this.mediaVolume
  }

  /** Laster lyd for en rute. Kalles i presenting-fasen. */
  load(clueId: string, media: AudioMedia) {
    this.unload()
    this.clueId = clueId
    this.media = media
    this.setState({ status: 'loading', clueId, error: null })
    this.howl = new Howl({
      src: [media.src],
      preload: true,
      html5: false,
      volume: this.effectiveVolume(),
      onload: () => {
        if (this.state.clueId !== clueId) return
        const resume = this.readStoredPosition(clueId)
        this.howl?.seek(resume ?? media.startAtSeconds)
        this.setState({ status: 'ready' })
      },
      onloaderror: (_id, err) => {
        if (this.state.clueId !== clueId) return
        this.setState({ status: 'error', error: `Lyd kunne ikke lastes (${String(err)})` })
      },
      onplayerror: (_id, err) => {
        if (this.state.clueId !== clueId) return
        this.setState({ status: 'error', error: `Avspilling feilet (${String(err)})` })
        this.howl?.once('unlock', () => this.play())
      },
      onend: () => {
        if (this.state.clueId !== clueId) return
        this.setState({ status: 'paused' })
      },
    })
  }

  retry() {
    if (this.clueId && this.media) this.load(this.clueId, this.media)
  }

  play() {
    if (!this.howl || !this.media) return
    if (this.state.status === 'playing') return
    if (this.state.status === 'loading' || this.state.status === 'error') return
    const fadeIn = this.media.fadeInMs
    this.howl.play()
    if (fadeIn > 0 && this.state.status === 'ready') {
      this.howl.fade(0, this.effectiveVolume(), fadeIn)
    } else {
      this.howl.volume(this.effectiveVolume())
    }
    this.setState({ status: 'playing' })
    this.startWatcher()
  }

  pause() {
    if (!this.howl || this.state.status !== 'playing') return
    this.howl.pause()
    this.setState({ status: 'paused' })
    this.storePosition()
    this.stopWatcher()
  }

  toggle() {
    if (this.state.status === 'playing') this.pause()
    else this.play()
  }

  /** Start klippet på nytt fra konfigurert startpunkt. */
  restart() {
    if (!this.howl || !this.media) return
    this.howl.stop()
    this.howl.seek(this.media.startAtSeconds)
    this.clearStoredPosition()
    this.howl.play()
    this.howl.volume(this.effectiveVolume())
    this.setState({ status: 'playing' })
    this.startWatcher()
  }

  /** Hopp bakover (aldri forbi startpunktet). */
  seekBy(deltaSeconds: number) {
    if (!this.howl || !this.media) return
    const current = Number(this.howl.seek()) || 0
    const target = Math.max(this.media.startAtSeconds, current + deltaSeconds)
    this.howl.seek(target)
  }

  /** Fade ut og stopp — brukes ved sceneskifte tilbake til brettet. */
  fadeOutAndStop(ms = 500) {
    const howl = this.howl
    if (!howl) return
    if (this.state.status === 'playing') {
      howl.fade(howl.volume(), 0, ms)
      window.setTimeout(() => {
        howl.stop()
      }, ms + 50)
    } else {
      howl.stop()
    }
    this.stopWatcher()
    this.setState({ status: this.state.status === 'error' ? 'error' : 'ready' })
  }

  unload() {
    this.stopWatcher()
    if (this.howl) {
      this.howl.unload()
      this.howl = null
    }
    this.media = null
    this.clueId = null
    this.setState({ status: 'idle', clueId: null, error: null })
  }

  /** Analyser-tap for dekorativ lydvisualisering. */
  getAnalyser(): AnalyserNode | null {
    try {
      const ctx: AudioContext | undefined = Howler.ctx
      const masterGain: GainNode | undefined = Howler.masterGain
      if (!ctx || !masterGain) return null
      if (!this.analyser) {
        this.analyser = ctx.createAnalyser()
        this.analyser.fftSize = 128
        this.analyser.smoothingTimeConstant = 0.82
        masterGain.connect(this.analyser)
      }
      return this.analyser
    } catch {
      return null
    }
  }

  private startWatcher() {
    this.stopWatcher()
    this.watchInterval = window.setInterval(() => {
      if (!this.howl || !this.media || this.state.status !== 'playing') return
      const pos = Number(this.howl.seek()) || 0
      // Konfigurert sluttpunkt: fade ut og stopp.
      if (this.media.endAtSeconds !== undefined && pos >= this.media.endAtSeconds) {
        const fadeOut = this.media.fadeOutMs
        if (fadeOut > 0) {
          this.howl.fade(this.howl.volume(), 0, fadeOut)
          window.setTimeout(() => {
            this.pause()
            this.howl?.volume(this.effectiveVolume())
          }, fadeOut)
        } else {
          this.pause()
        }
        this.stopWatcher()
        return
      }
      this.storePosition()
    }, 400)
  }

  private stopWatcher() {
    if (this.watchInterval !== null) {
      window.clearInterval(this.watchInterval)
      this.watchInterval = null
    }
  }

  // Medieposisjon overlever refresh via sessionStorage (GAME_SPEC §13).
  private storePosition() {
    if (!this.howl || !this.clueId) return
    try {
      const pos = Number(this.howl.seek()) || 0
      sessionStorage.setItem(POSITION_KEY_PREFIX + this.clueId, String(pos))
    } catch {
      // sessionStorage utilgjengelig — ufarlig.
    }
  }

  private readStoredPosition(clueId: string): number | null {
    try {
      const raw = sessionStorage.getItem(POSITION_KEY_PREFIX + clueId)
      if (raw === null) return null
      const value = Number(raw)
      return Number.isFinite(value) ? value : null
    } catch {
      return null
    }
  }

  private clearStoredPosition() {
    if (!this.clueId) return
    try {
      sessionStorage.removeItem(POSITION_KEY_PREFIX + this.clueId)
    } catch {
      // ignorer
    }
  }
}

export const audioEngine = new AudioEngine()
