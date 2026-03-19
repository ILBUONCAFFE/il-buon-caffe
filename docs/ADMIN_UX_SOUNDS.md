# Admin UX Sounds — Il Buon Caffè

Panel admina to narzędzie pracy — dźwięki mają być **subtelne, szybkie, niedramatyczne**.  
Styl: clean Apple comfort — glassy sine tones, soft attack, zero roughness, jak macOS Sonoma / iOS notification palette.

---

## Kiedy dźwięki mają sens?

| # | Zdarzenie | Uzasadnienie |
|---|-----------|-------------|
| ✅ | Zmiana statusu zamówienia | Operacja nieodwracalna → potrzebne potwierdzenie |
| ✅ | Nowe zamówienie (polling/push) | Operator może nie patrzeć w ekran |
| ✅ | Sukces zapisu (produkt, promocja) | Długa operacja → jasny koniec |
| ✅ | Błąd krytyczny / API error | Wymaga natychmiastowej uwagi |
| ✅ | Drag & drop w kanbanie (upust) | Haptyczne potwierdzenie akcji |
| ✅ | Otwarcie modala z detalami | Orientacja w przestrzeni UI |
| ⚠️ | Kliknięcie zwykłego przycisku | Tylko primary CTA, nie każdy click |
| ❌ | Hover, scroll, filtrowanie | Zbyt częste → drażniące |
| ❌ | Zamknięcie modala (Escape/X) | Zbędne |

---

## Specyfikacja dźwięków

### 1. `order-status-changed`
**Zdarzenie:** zmiana statusu zamówienia (dropdown lub drag-and-drop kanban)  
**Opis:** dwa czyste tony w interwale kwinty — jak iOS haptic confirm  
**Charakter:** szklisty, czysty, zero szumu, lekki tail  
**Synthesizer:**
```
oscillator: sine
frequency: note 1 = 1047 Hz (C6), note 2 = 1319 Hz (E6)
timing: note 1 @ 0ms, note 2 @ 60ms
attack: 2 ms
decay: 90 ms
sustain: 0
release: 40 ms
short room reverb: pre-delay 0ms, decay 80ms, mix 8%
```
**Długość:** `180 ms`  
**optimizer.xyz prompt:** `"two clean glassy sine tones C6 then E6, 60ms apart, pure sine, soft attack 2ms, 180ms total, tiny room reverb 8%, bright and clear, Apple UI style, -12dB"`

---

### 2. `new-order`
**Zdarzenie:** nowe zamówienie pojawiło się w systemie (polling wykrywa nowy rekord)  
**Opis:** dwa czyste wznoszące się tony — jak macOS notification chime  
**Charakter:** jasny, przyjazny, wyróżniający się bez alarmu  
**Synthesizer:**
```
oscillator: sine
frequency: 784 Hz (G5) → 1047 Hz (C6), staccato 2 nuty, przerwa 90 ms
attack: 5 ms
decay: 250 ms
sustain: 0
release: 150 ms
room reverb: pre-delay 5ms, decay 200ms, mix 12%
```
**Długość:** `500 ms`  
**optimizer.xyz prompt:** `"two ascending pure sine chime tones G5 then C6, 90ms apart, clean glassy character, soft attack 5ms, natural decay 250ms, subtle room reverb 12%, Apple notification style, bright and friendly, -10dB"`

---

### 3. `save-success`
**Zdarzenie:** zapis produktu / promocji / ustawień zakończony sukcesem  
**Opis:** delikatny pojedynczy ton z płynnym fade — jak macOS "sent"  
**Charakter:** ciepły, pewny, clean  
**Synthesizer:**
```
oscillator: sine
frequency: 1047 Hz (C6)
attack: 3 ms
decay: 180 ms
sustain: 0
release: 80 ms
room reverb: pre-delay 2ms, decay 120ms, mix 10%
```
**Długość:** `280 ms`  
**optimizer.xyz prompt:** `"single pure sine tone C6 1047 Hz, clean glass bell character, soft attack 3ms, smooth decay 180ms, subtle room reverb 10%, warm and reassuring, Apple macOS confirm style, -11dB"`

---

### 4. `error`
**Zdarzenie:** błąd API, niepowodzenie synchronizacji, validation error  
**Opis:** dwa zstępujące tony w sekundzie małej — jak iOS error shake  
**Charakter:** poważny ale nie alarmowy, czysty, bez szumu  
**Synthesizer:**
```
oscillator: sine
frequency: note 1 = 440 Hz (A4), note 2 = 392 Hz (G4)
timing: note 1 @ 0ms, note 2 @ 70ms
attack: 3 ms
decay: 160 ms
sustain: 0
release: 60 ms
room reverb: mix 5% (minimalny)
```
**Długość:** `280 ms`  
**optimizer.xyz prompt:** `"two descending pure sine tones A4 then G4, 70ms apart, clean glass character, soft attack 3ms, 280ms total, minimal reverb 5%, calm but noticeable error feel, Apple UI style, -10dB"`

---

### 5. `kanban-drop`
**Zdarzenie:** upuszczenie karty zamówienia na nową kolumnę w kanbanie  
**Opis:** krótki czysty "click" + mały rezonans — jak iPad drag snap  
**Charakter:** precyzyjny, taktylny, bez brudu  
**Synthesizer:**
```
oscillator: sine
frequency: 600 Hz → 400 Hz (pitch drop, 30 ms)
attack: 1 ms
decay: 100 ms
sustain: 0
release: 40 ms
room reverb: pre-delay 0ms, decay 60ms, mix 6%
```
**Długość:** `160 ms`  
**optimizer.xyz prompt:** `"short clean sine snap 600→400 Hz pitch drop over 30ms, glassy click feel, 160ms total, tiny reverb tail 6%, crisp and satisfying, Apple iPadOS drag-and-drop style, -11dB"`

---

### 6. `modal-open`
**Zdarzenie:** otwarcie modala ze szczegółami zamówienia  
**Opis:** delikatny wysoki ton z szybkim fade-in — jak macOS sheet open  
**Charakter:** airowy, lekki, prawie niezauważalny ale obecny  
**Synthesizer:**
```
oscillator: sine
frequency: 1319 Hz (E6)
attack: 8 ms
decay: 120 ms
sustain: 0
release: 50 ms
room reverb: pre-delay 3ms, decay 150ms, mix 14%
```
**Długość:** `200 ms`  
**optimizer.xyz prompt:** `"single airy high sine tone E6 1319 Hz, gentle attack 8ms, smooth fast decay 120ms, open reverb tail 14%, light and clean, macOS sheet presentation style, barely-there but elegant, -14dB"`

---

## Implementacja (Web Audio API)

```typescript
// hooks/useUxSound.ts
export function useUxSound() {
  const play = useCallback((name: keyof typeof SOUNDS) => {
    const ctx = new AudioContext()
    const cfg = SOUNDS[name]
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(cfg.freqStart, ctx.currentTime)
    if (cfg.freqEnd) osc.frequency.linearRampToValueAtTime(cfg.freqEnd, ctx.currentTime + cfg.duration / 1000)
    gain.gain.setValueAtTime(0.001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(cfg.volume, ctx.currentTime + 0.002)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + cfg.duration / 1000)
    osc.start()
    osc.stop(ctx.currentTime + cfg.duration / 1000 + 0.05)
  }, [])
  return { play }
}

const SOUNDS = {
  'order-status-changed': { freqStart: 1047, freqEnd: 1319, duration: 180, volume: 0.13 },
  'new-order':            { freqStart: 784,  freqEnd: 1047, duration: 500, volume: 0.18 },
  'save-success':         { freqStart: 1047, freqEnd: 1047, duration: 280, volume: 0.13 },
  'error':                { freqStart: 440,  freqEnd: 392,  duration: 280, volume: 0.13 },
  'kanban-drop':          { freqStart: 600,  freqEnd: 400,  duration: 160, volume: 0.14 },
  'modal-open':           { freqStart: 1319, freqEnd: 1319, duration: 200, volume: 0.08 },
}
```

> **Uwaga:** Web Audio API nie wymaga żadnych zewnętrznych plików `.mp3` — dźwięki są generowane in-browser. Użytkownik może wyłączyć je w ustawieniach (zapis w `localStorage`).

---

## Priorytety wdrożenia

1. **`new-order`** — największa wartość biznesowa, operator nie musi ciągle patrzeć  
2. **`order-status-changed`** — najczęstsza operacja, potwierdzenie krytycznej akcji  
3. **`error`** — wyłapuje ciche failures (np. timeout Allegro sync)  
4. **`kanban-drop`** — polepsza feel drag & drop  
5. **`save-success` + `modal-open`** — nice-to-have  
