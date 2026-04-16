import { karplusStrongBuffer, midiToFreq } from "./karplus";
import { pianoBuffer } from "./piano";
import { organBuffer, stringsBuffer, hornsBuffer, sineBuffer } from "./synths";

export type Instrument = "guitar" | "piano" | "organ" | "strings" | "horns" | "sine";

let ctx: AudioContext | null = null;
const activeSources: AudioScheduledSourceNode[] = [];

/**
 * Get or create the singleton AudioContext shared by all audio modules.
 * @returns The global AudioContext instance
 */
export function getAudioContext(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

/**
 * Resume the AudioContext if suspended (required after user gesture on first interaction).
 */
export async function ensureAudioReady(): Promise<void> {
  const c = getAudioContext();
  if (c.state === "suspended") await c.resume();
}

/**
 * Create an audio buffer for a single note using the selected instrument's synthesis.
 * @param c - AudioContext
 * @param midi - MIDI note number
 * @param duration - Duration in seconds
 * @param instrument - Which synthesis engine to use
 * @returns AudioBuffer with the synthesized tone
 */
function makeBuffer(c: AudioContext, midi: number, duration: number, instrument: Instrument): AudioBuffer {
  switch (instrument) {
    case "piano":   return pianoBuffer(c, midi, duration);
    case "organ":   return organBuffer(c, midi, duration);
    case "strings": return stringsBuffer(c, midi, duration);
    case "horns":   return hornsBuffer(c, midi, duration);
    case "sine":    return sineBuffer(c, midi, duration);
    default:        return karplusStrongBuffer(c, midiToFreq(midi), duration);
  }
}

/**
 * Schedule playback of a chord (multiple MIDI notes) at a given time.
 * Guitar uses a strum stagger (~15ms between notes); piano plays all notes simultaneously.
 * Each source node is tracked for cleanup via stopAll().
 * @param midiNotes - Array of MIDI note numbers to play
 * @param when - AudioContext time to start playback
 * @param opts - Optional: strumMs, durationSec, gain, instrument
 */
export function strumChord(
  midiNotes: number[],
  when: number,
  opts: { strumMs?: number; durationSec?: number; gain?: number; instrument?: Instrument } = {},
): void {
  const c = getAudioContext();
  const instrument = opts.instrument ?? "guitar";
  const strumMs = instrument === "guitar" ? (opts.strumMs ?? 15) : 0;
  const duration = opts.durationSec ?? 2.5;
  const gain = opts.gain ?? 0.35;
  const master = c.createGain();
  master.gain.value = gain;
  master.connect(c.destination);
  midiNotes.forEach((midi, i) => {
    const buffer = makeBuffer(c, midi, duration, instrument);
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(master);
    src.start(when + (i * strumMs) / 1000);
    trackSource(src);
  });
}

/**
 * Register an audio source node for cleanup. Automatically removes itself when playback ends.
 * @param src - Any AudioScheduledSourceNode (BufferSource, Oscillator, etc.)
 */
export function trackSource(src: AudioScheduledSourceNode): void {
  activeSources.push(src);
  src.onended = () => {
    const idx = activeSources.indexOf(src);
    if (idx !== -1) activeSources.splice(idx, 1);
  };
}

/**
 * Immediately stop all tracked audio sources (instruments and percussion).
 * Clears the active sources list.
 */
export function stopAll(): void {
  activeSources.forEach((src) => {
    try { src.stop(); } catch { /* already stopped */ }
  });
  activeSources.length = 0;
}

/**
 * Get the current AudioContext time in seconds (used for scheduling).
 * @returns Current time from the AudioContext clock
 */
export function now(): number {
  return getAudioContext().currentTime;
}
