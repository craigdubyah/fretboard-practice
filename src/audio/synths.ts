import { midiToFreq } from "./karplus";

/**
 * Synthesize a Hammond-style organ tone using additive synthesis.
 * Sums harmonics at fixed drawbar-like amplitudes with no decay (sustained).
 * A slow tremolo (~6 Hz) adds warmth.
 * @param ctx - Web Audio context
 * @param midi - MIDI note number
 * @param durationSec - Buffer length in seconds
 * @returns AudioBuffer with the sustained organ tone
 */
export function organBuffer(
  ctx: BaseAudioContext,
  midi: number,
  durationSec: number,
): AudioBuffer {
  const sr = ctx.sampleRate;
  const total = Math.max(1, Math.floor(sr * durationSec));
  const buf = ctx.createBuffer(1, total, sr);
  const out = buf.getChannelData(0);
  const freq = midiToFreq(midi);

  // Hammond drawbar registration (harmonic, amplitude)
  const drawbars = [
    { mult: 1, amp: 0.80 },
    { mult: 2, amp: 0.80 },
    { mult: 3, amp: 0.60 },
    { mult: 4, amp: 0.40 },
    { mult: 5, amp: 0.30 },
    { mult: 6, amp: 0.20 },
    { mult: 8, amp: 0.10 },
  ];
  const tremoloRate = 6.0;
  const tremoloDepth = 0.04;

  for (let i = 0; i < total; i++) {
    const t = i / sr;
    const tremolo = 1 + tremoloDepth * Math.sin(2 * Math.PI * tremoloRate * t);
    let sample = 0;
    for (const d of drawbars) {
      const f = freq * d.mult;
      if (f > sr / 2) continue;
      sample += Math.sin(2 * Math.PI * f * t) * d.amp;
    }
    out[i] = sample * tremolo;
  }

  // Normalize to prevent clipping
  const peak = drawbars.reduce((s, d) => s + d.amp, 0);
  for (let i = 0; i < total; i++) out[i] /= peak;

  // Short attack and tail fade
  const attack = Math.min(total, Math.floor(sr * 0.008));
  for (let i = 0; i < attack; i++) out[i] *= i / attack;
  const fade = Math.min(total, Math.floor(sr * 0.015));
  for (let i = 0; i < fade; i++) out[total - 1 - i] *= i / fade;

  return buf;
}

/**
 * Synthesize a strings ensemble tone using additive synthesis with a slow attack.
 * Two slightly detuned voices (+/- 3 cents) create an ensemble width effect.
 * @param ctx - Web Audio context
 * @param midi - MIDI note number
 * @param durationSec - Buffer length in seconds
 * @returns AudioBuffer with the string ensemble tone
 */
export function stringsBuffer(
  ctx: BaseAudioContext,
  midi: number,
  durationSec: number,
): AudioBuffer {
  const sr = ctx.sampleRate;
  const total = Math.max(1, Math.floor(sr * durationSec));
  const buf = ctx.createBuffer(1, total, sr);
  const out = buf.getChannelData(0);
  const freq = midiToFreq(midi);

  const harmonics = [
    { mult: 1, amp: 1.0 },
    { mult: 2, amp: 0.45 },
    { mult: 3, amp: 0.20 },
    { mult: 4, amp: 0.10 },
    { mult: 5, amp: 0.05 },
  ];

  // Two detuned voices for ensemble width (±3 cents)
  const detuneCents = 3;
  const detune = Math.pow(2, detuneCents / 1200);
  const attackSamples = Math.floor(sr * 0.08); // 80ms attack

  for (let i = 0; i < total; i++) {
    const t = i / sr;
    const envelope = i < attackSamples ? i / attackSamples : 1.0;
    let sample = 0;
    for (const h of harmonics) {
      const f1 = freq * h.mult * detune;
      const f2 = freq * h.mult / detune;
      if (f1 < sr / 2) sample += Math.sin(2 * Math.PI * f1 * t) * h.amp * 0.5;
      if (f2 < sr / 2) sample += Math.sin(2 * Math.PI * f2 * t) * h.amp * 0.5;
    }
    out[i] = sample * envelope;
  }

  // Normalize
  const peak = harmonics.reduce((s, h) => s + h.amp, 0);
  for (let i = 0; i < total; i++) out[i] /= peak;

  const fade = Math.min(total, Math.floor(sr * 0.02));
  for (let i = 0; i < fade; i++) out[total - 1 - i] *= i / fade;

  return buf;
}

/**
 * Synthesize a brass/horn tone with a bright, buzzy attack.
 * Uses odd-heavy harmonics and a fast attack envelope.
 * @param ctx - Web Audio context
 * @param midi - MIDI note number
 * @param durationSec - Buffer length in seconds
 * @returns AudioBuffer with the horn tone
 */
export function hornsBuffer(
  ctx: BaseAudioContext,
  midi: number,
  durationSec: number,
): AudioBuffer {
  const sr = ctx.sampleRate;
  const total = Math.max(1, Math.floor(sr * durationSec));
  const buf = ctx.createBuffer(1, total, sr);
  const out = buf.getChannelData(0);
  const freq = midiToFreq(midi);

  // Brass spectrum: strong odd harmonics, some even
  const harmonics = [
    { mult: 1, amp: 1.0 },
    { mult: 2, amp: 0.50 },
    { mult: 3, amp: 0.70 },
    { mult: 4, amp: 0.30 },
    { mult: 5, amp: 0.40 },
    { mult: 6, amp: 0.10 },
    { mult: 7, amp: 0.20 },
    { mult: 8, amp: 0.08 },
  ];

  // Decay rate: slight fall from attack peak to sustain level
  const attackSamples = Math.floor(sr * 0.012); // 12ms attack
  const decaySamples = Math.floor(sr * 0.06);   // 60ms decay to sustain
  const sustainLevel = 0.75;

  for (let i = 0; i < total; i++) {
    const t = i / sr;
    let envelope: number;
    if (i < attackSamples) {
      envelope = i / attackSamples;
    } else if (i < attackSamples + decaySamples) {
      const decayPos = (i - attackSamples) / decaySamples;
      envelope = 1.0 - (1.0 - sustainLevel) * decayPos;
    } else {
      envelope = sustainLevel;
    }
    let sample = 0;
    for (const h of harmonics) {
      const f = freq * h.mult;
      if (f > sr / 2) continue;
      sample += Math.sin(2 * Math.PI * f * t) * h.amp;
    }
    out[i] = sample * envelope;
  }

  // Normalize
  const peak = harmonics.reduce((s, h) => s + h.amp, 0);
  for (let i = 0; i < total; i++) out[i] /= peak;

  const fade = Math.min(total, Math.floor(sr * 0.015));
  for (let i = 0; i < fade; i++) out[total - 1 - i] *= i / fade;

  return buf;
}

/**
 * Synthesize a pure sine wave tone with a simple attack and linear decay.
 * @param ctx - Web Audio context
 * @param midi - MIDI note number
 * @param durationSec - Buffer length in seconds
 * @returns AudioBuffer with the sine tone
 */
export function sineBuffer(
  ctx: BaseAudioContext,
  midi: number,
  durationSec: number,
): AudioBuffer {
  const sr = ctx.sampleRate;
  const total = Math.max(1, Math.floor(sr * durationSec));
  const buf = ctx.createBuffer(1, total, sr);
  const out = buf.getChannelData(0);
  const freq = midiToFreq(midi);

  const attackSamples = Math.min(total, Math.floor(sr * 0.005)); // 5ms
  const decayRate = 1.5;

  for (let i = 0; i < total; i++) {
    const t = i / sr;
    const attack = i < attackSamples ? i / attackSamples : 1.0;
    const decay = Math.exp(-decayRate * t);
    out[i] = Math.sin(2 * Math.PI * freq * t) * attack * decay;
  }

  const fade = Math.min(total, Math.floor(sr * 0.01));
  for (let i = 0; i < fade; i++) out[total - 1 - i] *= i / fade;

  return buf;
}
