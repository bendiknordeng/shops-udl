import { useEffect, useRef } from 'react'
import { audioEngine } from '../../audio/audio-engine'
import styles from './clue.module.css'

/**
 * Dekorativ lydvisualisering. Reagerer på faktisk lyddata via analyser-tap,
 * med rolig fallback-animasjon når data mangler. Viser ALDRI metadata,
 * varighet eller annet som kan hinte om svaret.
 */
export function Visualizer({ playing }: { playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const analyser = audioEngine.getAnalyser()
    const bins = analyser ? new Uint8Array(analyser.frequencyBinCount) : null
    let frame = 0
    let t = 0

    function draw() {
      if (!canvas || !ctx) return
      const dpr = window.devicePixelRatio || 1
      const { clientWidth: w, clientHeight: h } = canvas
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr
        canvas.height = h * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const BAR_COUNT = 48
      const gap = 3
      const barWidth = (w - gap * (BAR_COUNT - 1)) / BAR_COUNT
      t += 0.02

      if (analyser && bins) analyser.getByteFrequencyData(bins)

      // Har vi faktisk lyddata å reagere på? (unngår flate streker hvis
      // analyser-tappen mangler signal)
      let energy = 0
      if (analyser && bins && playing) {
        for (let i = 0; i < bins.length; i++) energy += bins[i]
      }
      const hasSignal = !!bins && energy > bins.length * 2

      for (let i = 0; i < BAR_COUNT; i++) {
        let level: number
        if (analyser && bins && playing && hasSignal) {
          const bin = Math.floor((i / BAR_COUNT) * bins.length * 0.75)
          level = bins[bin] / 255
        } else if (playing) {
          // Levende syntetisk bølge når lyddata mangler.
          const center = 1 - Math.abs(i / (BAR_COUNT - 1) - 0.5) * 2
          level =
            (0.28 + 0.72 * center) *
            (0.5 + 0.5 * Math.abs(Math.sin(t * 3 + i * 0.5) * Math.sin(t * 1.7 + i * 0.21)))
        } else {
          // Rolig, dekorativ puls når det ikke spilles.
          level = 0.08 + 0.05 * Math.sin(t * 1.6 + i * 0.45)
        }
        const barHeight = Math.max(3, level * h * 0.92)
        const x = i * (barWidth + gap)
        const y = (h - barHeight) / 2
        const hue = 38 - level * 24
        ctx.fillStyle = `hsl(${hue} 100% ${55 + level * 12}%)`
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2)
        ctx.fill()
      }
      frame = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(frame)
  }, [playing])

  return <canvas ref={canvasRef} className={styles.visualizer} aria-hidden />
}
