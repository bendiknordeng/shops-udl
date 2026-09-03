import { useState } from 'react'
import { useSelector } from '@xstate/react'
import { useGame } from '../../app/GameProvider'
import { HOTKEY_HELP } from '../../app/useHotkeys'
import {
  DEFAULT_ANSWER_WINDOW_SECONDS,
  MAX_ANSWER_WINDOW_SECONDS,
  MIN_ANSWER_WINDOW_SECONDS,
} from '../../game/game-machine'
import { boardColumns } from '../../game/selectors'
import styles from './host.module.css'

/**
 * Lyd-, tids- og poenginnstillinger for verten. Manuell poengjustering ligger
 * her — utenfor normal spillflyt (GAME_SPEC §10).
 */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { pack, actorRef, send, settings, updateSettings, resetGame } = useGame()
  const context = useSelector(actorRef, (s) => s.context)
  const answerWindowSeconds = context.answerWindowSeconds ?? DEFAULT_ANSWER_WINDOW_SECONDS
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <div className={styles.panel}>
      <div className={styles.panelSection}>
        <span className={styles.panelHeading}>Spørsmålstid (fra neste spørsmål)</span>
        <div className={styles.sliderRow}>
          <input
            type="range"
            min={pack.presentation.minAnswerSeconds}
            max={pack.presentation.maxAnswerSeconds}
            step={pack.presentation.answerSecondsStep}
            value={context.answerSeconds}
            onChange={(e) => send({ type: 'SET_ANSWER_SECONDS', seconds: Number(e.target.value) })}
          />
          <span className={styles.sliderValue}>{context.answerSeconds} s</span>
        </div>
        <div className={styles.sliderRow}>
          Avgi svar
          <input
            type="range"
            min={MIN_ANSWER_WINDOW_SECONDS}
            max={MAX_ANSWER_WINDOW_SECONDS}
            step={1}
            value={answerWindowSeconds}
            onChange={(e) =>
              send({ type: 'SET_ANSWER_WINDOW_SECONDS', seconds: Number(e.target.value) })
            }
          />
          <span className={styles.sliderValue}>{answerWindowSeconds} s</span>
        </div>
      </div>

      <div className={styles.panelSection}>
        <span className={styles.panelHeading}>Lyd</span>
        <div className={styles.sliderRow}>
          Musikk
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.mediaVolume}
            onChange={(e) => updateSettings({ mediaVolume: Number(e.target.value) })}
          />
          <span className={styles.sliderValue}>{Math.round(settings.mediaVolume * 100)}%</span>
        </div>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={settings.reducedEffects}
            onChange={(e) => updateSettings({ reducedEffects: e.target.checked })}
          />
          Reduserte effekter (svakere maskinvare / mindre bevegelse)
        </label>
      </div>

      {context.teams.length > 0 && (
        <div className={styles.panelSection}>
          <span className={styles.panelHeading}>Manuell poengjustering</span>
          {context.teams.map((team) => (
            <div key={team.id} className={styles.scoreAdjustRow}>
              <span className={styles.scoreAdjustName}>{team.name}</span>
              <button
                type="button"
                className={styles.hostButton}
                onClick={() => send({ type: 'ADJUST_SCORE', teamId: team.id, delta: -100 })}
              >
                −100
              </button>
              <span className={styles.scoreAdjustScore}>{team.score}</span>
              <button
                type="button"
                className={styles.hostButton}
                onClick={() => send({ type: 'ADJUST_SCORE', teamId: team.id, delta: 100 })}
              >
                +100
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.panelSection}>
        <span className={styles.panelHeading}>Rekonstruer brett</span>
        <span className={styles.reconstructHint}>
          Marker ruter brukt/ubrukt manuelt — f.eks. for å gjenskape tilstanden fra et
          tidligere spill. Kombiner med poengjusteringen over. Kan angres.
        </span>
        {boardColumns(pack, context.usedClueIds).map(({ category, cells }) => (
          <div key={category.id} className={styles.reconstructRow}>
            <span className={styles.reconstructCategory}>{category.title}</span>
            {cells.map(({ value, clue, used }) => (
              <button
                key={value}
                type="button"
                className={`${styles.reconstructCell} ${used ? styles.reconstructCellUsed : ''}`}
                disabled={!clue || clue.id === context.activeClueId}
                title={used ? 'Marker som ubrukt' : 'Marker som brukt'}
                onClick={() => clue && send({ type: 'SET_CLUE_USED', clueId: clue.id, used: !used })}
              >
                {value}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className={styles.panelSection}>
        <span className={styles.panelHeading}>Tastatursnarveier</span>
        <div className={styles.hotkeyList}>
          {HOTKEY_HELP.map((h) => (
            <span key={h.key} style={{ display: 'contents' }}>
              <span className={styles.hotkeyKey}>{h.key}</span>
              <span>{h.label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className={styles.panelSection}>
        <span className={styles.panelHeading}>Fare-sone</span>
        {confirmReset ? (
          <div className={styles.confirmBox}>
            <span className={styles.confirmLabel}>Slette alt og starte helt på nytt?</span>
            <button
              type="button"
              className={`${styles.hostButton} ${styles.hostButtonDanger}`}
              onClick={() => {
                resetGame()
                onClose()
              }}
            >
              Ja, start på nytt
            </button>
            <button type="button" className={styles.hostButton} onClick={() => setConfirmReset(false)}>
              Avbryt
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={`${styles.hostButton} ${styles.hostButtonDanger}`}
            onClick={() => setConfirmReset(true)}
          >
            Start spillet helt på nytt …
          </button>
        )}
      </div>

      <button type="button" className={styles.hostButton} onClick={onClose}>
        Lukk
      </button>
    </div>
  )
}
