import { isReducedMotion } from '../app/motion'

/**
 * Konfetti-regn via PixiJS (lazy-lastet). Ren pynt for finalescenen —
 * feiler den, fortsetter spillet uten effekter (STACK.md: PixiJS er et
 * forsterkningslag, aldri kritisk).
 */
export async function launchConfetti(container: HTMLElement): Promise<() => void> {
  if (isReducedMotion()) return () => {}
  try {
    const { Application, Graphics } = await import('pixi.js')
    const app = new Application()
    await app.init({ resizeTo: container, backgroundAlpha: 0, antialias: false })
    app.canvas.style.position = 'absolute'
    app.canvas.style.inset = '0'
    app.canvas.style.pointerEvents = 'none'
    container.appendChild(app.canvas)

    const COLORS = [0xffb628, 0xff3d81, 0x35e0ff, 0x9dff5c, 0xf6edff]
    const COUNT = 160

    type Particle = {
      g: InstanceType<typeof Graphics>
      vx: number
      vy: number
      vr: number
      sway: number
    }

    const particles: Particle[] = []

    function spawn(p?: Particle): Particle {
      const g = p?.g ?? new Graphics()
      g.clear()
      const w = 6 + Math.random() * 8
      const h = 4 + Math.random() * 6
      g.rect(-w / 2, -h / 2, w, h).fill(COLORS[Math.floor(Math.random() * COLORS.length)])
      g.x = Math.random() * app.screen.width
      g.y = -20 - Math.random() * app.screen.height
      g.rotation = Math.random() * Math.PI * 2
      const particle: Particle = {
        g,
        vx: (Math.random() - 0.5) * 1.6,
        vy: 1.6 + Math.random() * 2.6,
        vr: (Math.random() - 0.5) * 0.2,
        sway: Math.random() * Math.PI * 2,
      }
      if (!p) app.stage.addChild(g)
      return particle
    }

    for (let i = 0; i < COUNT; i++) particles.push(spawn())

    app.ticker.add((ticker) => {
      const dt = ticker.deltaTime
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.sway += 0.03 * dt
        p.g.x += (p.vx + Math.sin(p.sway) * 0.9) * dt
        p.g.y += p.vy * dt
        p.g.rotation += p.vr * dt
        if (p.g.y > app.screen.height + 30) {
          particles[i] = spawn(p)
          particles[i].g.y = -20
        }
      }
    })

    // Pause når fanen er skjult.
    const onVisibility = () => {
      if (document.hidden) app.ticker.stop()
      else app.ticker.start()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      try {
        app.destroy(true, { children: true, texture: true })
      } catch {
        // allerede fjernet
      }
    }
  } catch (err) {
    console.warn('Konfetti utilgjengelig (fortsetter uten):', err)
    return () => {}
  }
}
