import { useEffect, useRef } from 'react'
import { audioEngine } from '../../audio/audio-engine'
import styles from './clue.module.css'

function formatTime(seconds: number) {
  const wholeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(wholeSeconds / 60)
  const remainder = String(wholeSeconds % 60).padStart(2, '0')
  return `${minutes}:${remainder}`
}

export function PlaybackProgress() {
  const fillRef = useRef<HTMLSpanElement>(null)
  const elapsedRef = useRef<HTMLSpanElement>(null)
  const durationRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let frame = 0

    function paint() {
      const progress = audioEngine.getPlaybackProgress()
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(${progress.fraction})`
      }
      if (elapsedRef.current) elapsedRef.current.textContent = formatTime(progress.elapsedSeconds)
      if (durationRef.current) durationRef.current.textContent = formatTime(progress.durationSeconds)
      frame = requestAnimationFrame(paint)
    }

    paint()
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className={styles.playbackProgress} aria-label="Avspillingsfremdrift">
      <div className={styles.playbackTrack}>
        <span ref={fillRef} className={styles.playbackFill} />
      </div>
      <div className={styles.playbackTimes}>
        <span ref={elapsedRef}>0:00</span>
        <span ref={durationRef} className={styles.playbackDuration} aria-hidden="true">
          0:00
        </span>
      </div>
    </div>
  )
}
