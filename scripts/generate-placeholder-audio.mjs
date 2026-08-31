// Genererer plassholder-lydfiler (WAV) for spørsmålstypene 'song' og 'ai-song'.
// Kjør: node scripts/generate-placeholder-audio.mjs
// Filene sjekkes inn og byttes ut med ekte klipp før spillkvelden.
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'media', 'audio')
mkdirSync(outDir, { recursive: true })

const SAMPLE_RATE = 22050

function note(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

function renderMelody(steps, stepSeconds, totalSeconds) {
  const total = Math.floor(totalSeconds * SAMPLE_RATE)
  const samples = new Float32Array(total)
  const stepLen = Math.floor(stepSeconds * SAMPLE_RATE)
  for (let i = 0; i < total; i++) {
    const stepIndex = Math.floor(i / stepLen) % steps.length
    const midi = steps[stepIndex]
    if (midi == null) continue
    const t = i / SAMPLE_RATE
    const inStep = (i % stepLen) / stepLen
    const env = Math.min(1, inStep * 12) * Math.pow(1 - inStep, 1.4)
    const f = note(midi)
    const wave =
      0.55 * Math.sin(2 * Math.PI * f * t) +
      0.25 * Math.sin(2 * Math.PI * f * 2 * t) +
      0.12 * Math.sign(Math.sin(2 * Math.PI * (f / 2) * t))
    samples[i] = wave * env * 0.55
  }
  const fade = Math.floor(SAMPLE_RATE * 0.6)
  for (let i = 0; i < fade; i++) {
    samples[i] *= i / fade
    samples[total - 1 - i] *= i / fade
  }
  return samples
}

function toWav(samples) {
  const dataLen = samples.length * 2
  const buf = Buffer.alloc(44 + dataLen)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + dataLen, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(SAMPLE_RATE, 24)
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(dataLen, 40)
  for (let i = 0; i < samples.length; i++) {
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2)
  }
  return buf
}

// To ulike melodier så host hører forskjell på typene under test.
const songSteps = [60, 64, 67, 72, 67, 64, 62, 65, 69, 74, 69, 65]
const aiSongSteps = [57, 60, 64, 69, 64, 60, 59, 62, 66, 71, 66, 62, 60, 64, 67, 72]

writeFileSync(join(outDir, 'placeholder-song.wav'), toWav(renderMelody(songSteps, 0.32, 14)))
writeFileSync(join(outDir, 'placeholder-ai-song.wav'), toWav(renderMelody(aiSongSteps, 0.24, 14)))
console.log('Skrev placeholder-song.wav og placeholder-ai-song.wav til', outDir)
