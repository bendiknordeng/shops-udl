import { useEffect, useRef, useState } from 'react'
import { useGame } from './GameProvider'
import { audioEngine } from '../audio/audio-engine'
import { sceneBus } from './scene-bus'
import { HOST_CHANNEL, type ChannelMessage, type RemoteCommand } from './host-remote'

const STALE_MS = 4000

/**
 * Kjøres i HOVEDVINDUET: kringkaster spilltilstand til vertsvinduet og
 * utfører kommandoene derfra. Returnerer om et vertsvindu er tilkoblet
 * (siste ping < 4 s), slik at docken kan gjemme seg fra delt skjerm.
 */
export function useHostRemoteServer(): boolean {
  const game = useGame()
  const [remoteConnected, setRemoteConnected] = useState(false)
  const lastPingRef = useRef(0)

  // Ferske verdier uten å resette kanalen på hver render.
  const gameRef = useRef(game)
  gameRef.current = game
  const broadcastRef = useRef<() => void>(() => {})

  const { actorRef } = game

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel(HOST_CHANNEL)

    const broadcast = () => {
      const { pack, canUndo, persistenceWarning, settings } = gameRef.current
      void pack
      const snap = actorRef.getSnapshot()
      const message: ChannelMessage = {
        type: 'state',
        state: {
          stateValue: snap.value,
          context: snap.context,
          audio: audioEngine.getState(),
          canUndo,
          persistenceWarning,
          settings,
        },
      }
      try {
        channel.postMessage(message)
      } catch {
        // Kanal lukket under teardown — ufarlig.
      }
    }
    broadcastRef.current = broadcast

    function handleCommand(command: RemoteCommand) {
      const g = gameRef.current
      switch (command.kind) {
        case 'send': {
          if (command.event.type === 'OPEN_CLUE') {
            // Gi ekspansjons-animasjonen riktig utgangspunkt når ruten
            // åpnes fra vertsvinduet; ellers faller scenen tilbake til fade.
            const tile = document.querySelector(`[data-clue-id="${command.event.clueId}"]`)
            sceneBus.lastTileRect = tile ? tile.getBoundingClientRect() : null
          }
          g.send(command.event)
          break
        }
        case 'audio':
          if (command.action === 'toggle') audioEngine.toggle()
          else if (command.action === 'restart') audioEngine.restart()
          else if (command.action === 'seek-back') audioEngine.seekBy(-5)
          else if (command.action === 'retry') {
            g.send({ type: 'RETRY_MEDIA' })
            audioEngine.retry()
          }
          break
        case 'undo':
          g.undo()
          break
        case 'reset':
          g.resetGame()
          break
        case 'skip':
          sceneBus.skipAll()
          break
        case 'settings':
          g.updateSettings(command.patch)
          break
      }
      broadcast()
    }

    channel.onmessage = (e: MessageEvent<ChannelMessage>) => {
      const msg = e.data
      if (!msg || typeof msg !== 'object') return
      if (msg.type === 'ping') {
        lastPingRef.current = Date.now()
        setRemoteConnected(true)
        broadcast()
      } else if (msg.type === 'command') {
        lastPingRef.current = Date.now()
        handleCommand(msg.command)
      }
    }

    broadcast()
    const sub = actorRef.subscribe(broadcast)
    const unsubAudio = audioEngine.subscribe(broadcast)
    const staleCheck = window.setInterval(() => {
      if (Date.now() - lastPingRef.current > STALE_MS) setRemoteConnected(false)
    }, 1000)

    return () => {
      sub.unsubscribe()
      unsubAudio()
      window.clearInterval(staleCheck)
      channel.close()
      broadcastRef.current = () => {}
    }
  }, [actorRef])

  // Innstillinger/undo-status endres uten maskin-transisjon — kringkast også da.
  const { canUndo, settings, persistenceWarning } = game
  useEffect(() => {
    broadcastRef.current()
  }, [canUndo, settings, persistenceWarning])

  return remoteConnected
}
