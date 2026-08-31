/**
 * Lett kanal mellom scener og GSAP-tidslinjer:
 *  - posisjonen til ruten som ble klikket (for brett→spørsmål-ekspansjon)
 *  - registrering av pågående, hoppbare animasjoner (Esc = hopp til slutt)
 *
 * Gameplaytilstand ligger ALDRI her — kun visuell koreografi.
 */

type SkipHandler = () => void

const skipHandlers = new Set<SkipHandler>()

export const sceneBus = {
  lastTileRect: null as DOMRect | null,

  registerSkippable(handler: SkipHandler): () => void {
    skipHandlers.add(handler)
    return () => skipHandlers.delete(handler)
  },

  /** Fullfør alle pågående tidslinjer umiddelbart (samme sluttilstand som naturlig slutt). */
  skipAll(): boolean {
    if (skipHandlers.size === 0) return false
    const handlers = [...skipHandlers]
    skipHandlers.clear()
    handlers.forEach((h) => h())
    return true
  },

  hasSkippable(): boolean {
    return skipHandlers.size > 0
  },
}
