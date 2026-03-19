'use client'

import { useCallback, useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type AC = AudioContext
type SoundFn = (ac: AC, vm: number) => void

// ── Audio primitives ──────────────────────────────────────────────────────────

function ding(ac: AC, freq: number, delay: number, atk: number, dec: number, vol: number, wave: OscillatorType = 'sine') {
  const osc  = ac.createOscillator()
  const gain = ac.createGain()
  osc.connect(gain); gain.connect(ac.destination)
  osc.type = wave
  const t = ac.currentTime + delay
  osc.frequency.setValueAtTime(freq, t)
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(vol, t + atk)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + atk + dec)
  osc.start(t); osc.stop(t + atk + dec + 0.05)
}

function shimmer(ac: AC, delay: number, vol: number) {
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.15), ac.sampleRate)
  const d   = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const src  = ac.createBufferSource()
  src.buffer = buf
  const flt  = ac.createBiquadFilter()
  flt.type = 'bandpass'; flt.frequency.value = 8000; flt.Q.value = 0.5
  const gain = ac.createGain()
  src.connect(flt); flt.connect(gain); gain.connect(ac.destination)
  const t = ac.currentTime + delay
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
  src.start(t); src.stop(t + 0.2)
}

function thud(ac: AC, delay: number, dec: number, vol: number) {
  const osc  = ac.createOscillator()
  const gain = ac.createGain()
  osc.connect(gain); gain.connect(ac.destination)
  osc.type = 'sine'
  const t = ac.currentTime + delay
  osc.frequency.setValueAtTime(180, t)
  osc.frequency.exponentialRampToValueAtTime(55, t + dec)
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dec)
  osc.start(t); osc.stop(t + dec + 0.05)
}

function sweep(ac: AC, f1: number, f2: number, dur: number, vol: number) {
  const osc  = ac.createOscillator()
  const gain = ac.createGain()
  osc.connect(gain); gain.connect(ac.destination)
  osc.type = 'sine'
  const t = ac.currentTime
  osc.frequency.setValueAtTime(f1, t)
  osc.frequency.exponentialRampToValueAtTime(f2, t + dur)
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(vol, t + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.start(t); osc.stop(t + dur + 0.05)
}

// ── Sound definitions ─────────────────────────────────────────────────────────

const SOUNDS: Record<string, SoundFn> = {

  // G5 → A5 → C6 — ascending chime (3 nuty)
  'new-order': (ac, vm) => {
    ding(ac, 784.00, 0,    0.009, 0.10, 0.22 * vm)
    ding(ac, 880.00, 0.13, 0.009, 0.10, 0.26 * vm)
    ding(ac, 1046.5, 0.26, 0.009, 0.10, 0.30 * vm)
  },

  // F5 → A5 → C#6 — F-aug arpeggio (zmiana statusu)
  'order-status-changed': (ac, vm) => {
    ding(ac, 698.46, 0,    0.008, 0.10, 0.28 * vm)
    ding(ac, 880.00, 0.08, 0.008, 0.24, 0.28 * vm)
    ding(ac, 1108.7, 0.16, 0.008, 0.14, 0.20 * vm)
  },

  // E5 + C6 + high shimmer — resolved chord
  'save-success': (ac, vm) => {
    ding(ac, 659.25, 0,    0.006, 0.08, 0.22 * vm)
    ding(ac, 1046.5, 0.07, 0.006, 0.18, 0.26 * vm)
    shimmer(ac, 0.09, 0.12 * vm)
  },

  // Eb4 → C#4 triangle + sub thud — miękki ale wyraźny błąd
  'error': (ac, vm) => {
    ding(ac, 311.13, 0,    0.010, 0.22, 0.26 * vm, 'triangle')
    ding(ac, 277.18, 0.14, 0.008, 0.26, 0.22 * vm, 'triangle')
    thud(ac, 0, 0.12, 0.14 * vm)
  },

  // sub thud + D6 + F#6 snap — taktylny upust
  'kanban-drop': (ac, vm) => {
    thud(ac,   0,    0.06, 0.18 * vm)
    ding(ac, 1174.7, 0.04, 0.005, 0.06, 0.16 * vm)
    ding(ac, 1480.0, 0.09, 0.005, 0.05, 0.12 * vm)
  },

  // sweep 600→900 + 900 Hz cue — airowe otwarcie modala
  'modal-open': (ac, vm) => {
    sweep(ac, 600, 900, 0.18, 0.16 * vm)
    ding(ac, 900, 0.1, 0.006, 0.06, 0.14 * vm)
  },
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export type UxSoundName = keyof typeof SOUNDS

export function useUxSound() {
  const ctxRef = useRef<AudioContext | null>(null)

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext()
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume()
    }
    return ctxRef.current
  }, [])

  const play = useCallback((name: UxSoundName) => {
    if (typeof window !== 'undefined' && localStorage.getItem('ux-sounds') === 'off') return

    const fn = SOUNDS[name]
    if (!fn) return

    const raw = typeof window !== 'undefined' ? localStorage.getItem('ux-sounds-volume') : null
    const vm = raw !== null ? Number(raw) : 0.7

    try {
      fn(getCtx(), vm)
    } catch {
      // AudioContext unavailable (SSR or blocked) — fail silently
    }
  }, [getCtx])

  return { play }
}
