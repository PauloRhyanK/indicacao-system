export type SaleSoundPreset = "festa" | "fanfare" | "chime" | "cash" | "triumph";

export const SALE_SOUND_PRESETS: { id: SaleSoundPreset; label: string; icon: string }[] = [
  { id: "festa", label: "Festa", icon: "🎉" },
  { id: "fanfare", label: "Fanfarra", icon: "🎺" },
  { id: "chime", label: "Sino", icon: "🔔" },
  { id: "cash", label: "Caixa", icon: "💰" },
  { id: "triumph", label: "Vitória", icon: "🏆" },
];

const STORAGE_KEY = "cais-tv-sound";

let audioCtx: AudioContext | null = null;
let unlocked = false;
let lastPlayTime = 0;

const MIN_PLAY_INTERVAL_MS = 5000;

function getContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

/** Necessário uma vez — browsers bloqueiam áudio até interação do usuário. */
export async function unlockSaleSound(): Promise<boolean> {
  try {
    const ctx = getContext();
    if (ctx.state === "suspended") await ctx.resume();
    unlocked = ctx.state === "running";
    return unlocked;
  } catch {
    return false;
  }
}

export function isSaleSoundUnlocked(): boolean {
  return unlocked && audioCtx?.state === "running";
}

function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.12,
) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.025);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.08);
}

function playPreset(ctx: AudioContext, preset: SaleSoundPreset, t: number) {
  switch (preset) {
    case "festa": {
      const melody = [
        { f: 523.25, at: 0, dur: 0.4 },
        { f: 659.25, at: 0.2, dur: 0.4 },
        { f: 783.99, at: 0.4, dur: 0.45 },
        { f: 1046.5, at: 0.62, dur: 0.55 },
        { f: 1318.51, at: 0.82, dur: 0.65 },
      ];
      melody.forEach(({ f, at, dur }) => {
        tone(ctx, f, t + at, dur, "sine", 0.09);
        tone(ctx, f * 0.5, t + at, dur * 1.05, "triangle", 0.022);
      });
      [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f) => {
        tone(ctx, f, t + 1.15, 1.4, "sine", 0.045);
      });
      [1567.98, 2093, 2637].forEach((f, i) => {
        tone(ctx, f, t + 1.2 + i * 0.06, 0.55, "sine", 0.02);
      });
      break;
    }
    case "fanfare":
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(ctx, f, t + i * 0.11, 0.45, "triangle", 0.1),
      );
      break;
    case "chime":
      tone(ctx, 880, t, 0.9, "sine", 0.14);
      tone(ctx, 1174.66, t + 0.04, 0.7, "sine", 0.07);
      tone(ctx, 1318.51, t + 0.08, 0.5, "sine", 0.05);
      break;
    case "cash":
      tone(ctx, 1800, t, 0.08, "square", 0.05);
      tone(ctx, 2200, t + 0.07, 0.12, "square", 0.07);
      tone(ctx, 2600, t + 0.14, 0.18, "sine", 0.09);
      break;
    case "triumph":
      [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(ctx, f, t + i * 0.07, 0.32, "sawtooth", 0.045),
      );
      tone(ctx, 1046.5, t + 0.45, 0.6, "triangle", 0.08);
      break;
  }
}

export function getSaleSoundPreset(): SaleSoundPreset {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY) as SaleSoundPreset | null;
    if (stored && SALE_SOUND_PRESETS.some((p) => p.id === stored)) return stored;
  }
  const env = import.meta.env.VITE_TV_SOUND as SaleSoundPreset | undefined;
  if (env && SALE_SOUND_PRESETS.some((p) => p.id === env)) return env;
  return "festa";
}

export function setSaleSoundPreset(preset: SaleSoundPreset): void {
  localStorage.setItem(STORAGE_KEY, preset);
}

export function playSaleSound(
  preset: SaleSoundPreset = getSaleSoundPreset(),
  options?: { preview?: boolean },
): void {
  try {
    const now = Date.now();
    if (!options?.preview && now - lastPlayTime < MIN_PLAY_INTERVAL_MS) return;

    const ctx = getContext();
    if (ctx.state !== "running") return;

    if (!options?.preview) lastPlayTime = now;
    playPreset(ctx, preset, ctx.currentTime);
  } catch {
    // áudio indisponível
  }
}

export function previewSaleSound(preset: SaleSoundPreset): void {
  void unlockSaleSound().then(() => playSaleSound(preset, { preview: true }));
}
