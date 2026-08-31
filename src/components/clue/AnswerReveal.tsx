import type { Clue } from '../../content/schemas'
import styles from './clue.module.css'

/**
 * Fasitpanel — mountes KUN etter at verten avslører. Svaret ligger aldri i
 * DOM før dette (GAME_SPEC §9.3).
 */
export function AnswerReveal({ clue }: { clue: Clue }) {
  return (
    <div className={styles.reveal} data-anim="reveal">
      <span className={styles.revealAnswer}>{clue.answer}</span>
      {clue.acceptedAnswers.length > 0 && (
        <span className={styles.revealAliases}>Godtas også: {clue.acceptedAnswers.join(', ')}</span>
      )}
      {clue.explanation && <span className={styles.revealMeta}>{clue.explanation}</span>}
      {(clue.revealTitle || clue.revealArtist) && (
        <span className={styles.revealMeta}>
          {[clue.revealTitle, clue.revealArtist].filter(Boolean).join(' — ')}
        </span>
      )}
      {clue.language && <span className={styles.revealMeta}>Språk: {clue.language}</span>}
      {clue.bonusInfo && <span className={styles.revealMeta}>{clue.bonusInfo}</span>}
    </div>
  )
}
