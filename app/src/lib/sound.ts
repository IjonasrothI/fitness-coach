// Kurzer Signalton am Pausenende. iOS erlaubt Audio nur nach einer Nutzeraktion → unlock() beim Tippen.
let ctx: AudioContext | null = null;

export function unlockAudio(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function beep(times = 2): void {
  try {
    if (!ctx) return;
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      const t = ctx.currentTime + i * 0.25;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.2);
    }
  } catch {
    /* kein Ton möglich */
  }
  navigator.vibrate?.(200);
}

/** Bildschirm während des Trainings anlassen, falls unterstützt. */
let lock: { release: () => Promise<void> } | null = null;
export async function keepAwake(on: boolean): Promise<void> {
  try {
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    if (on && wl && !lock) lock = await wl.request('screen');
    if (!on && lock) {
      await lock.release();
      lock = null;
    }
  } catch {
    lock = null;
  }
}

/** Kurzer, hoher Ton (Countdown 3-2-1). */
export function tick(high = false): void {
  try {
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = high ? 1320 : 660;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (high ? 0.35 : 0.12));
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.4);
  } catch {
    /* kein Ton möglich */
  }
}

const VOICE_KEY = 'coach:voice';
export function voiceOn(): boolean {
  try { return localStorage.getItem(VOICE_KEY) !== 'off'; } catch { return true; }
}
export function setVoice(on: boolean): void {
  try { localStorage.setItem(VOICE_KEY, on ? 'on' : 'off'); } catch { /* egal */ }
}

/** Sprachansage auf Deutsch (offline über die Systemstimme), falls eingeschaltet. */
export function say(text: string): void {
  try {
    if (!voiceOn() || !('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    u.rate = 1.05;
    const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith('de'));
    if (v) u.voice = v;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {
    /* keine Sprachausgabe */
  }
}
