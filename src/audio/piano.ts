import { midiToFreq } from "./karplus";

/**
 * Synthesise a single piano-like tone using additive synthesis:
 * fundamental + a few harmonics with fast attack and exponential decay.
 * @param ctx - Web Audio context (provides sample rate)
 * @param midi - MIDI note number to synthesize
 * @param durationSec - Length of the resulting buffer in seconds
 * @returns AudioBuffer containing the synthesized waveform
 */
export function pianoBuffer(
  ctx: BaseAudioContext,
  midi: number,
  durationSec: number,
): AudioBuffer {
  const sr = ctx.sampleRate;
  const total = Math.max(1, Math.floor(sr * durationSec));
  const buf = ctx.createBuffer(1, total, sr);
  const out = buf.getChannelData(0);
  const freq = midiToFreq(midi);

  // Harmonics with relative amplitudes (piano-ish spectrum)
  const harmonics = [
    { mult: 1, amp: 1.0 },
    { mult: 2, amp: 0.5 },
    { mult: 3, amp: 0.15 },
    { mult: 4, amp: 0.08 },
    { mult: 5, amp: 0.04 },
  ];

  // Higher notes decay faster
  const decayRate = 3.0 + (midi - 60) * 0.04;

  for (let i = 0; i < total; i++) {
    const t = i / sr;
    const envelope = Math.exp(-decayRate * t);
    let sample = 0;
    for (const h of harmonics) {
      const f = freq * h.mult;
      if (f > sr / 2) continue; // skip above Nyquist
      sample += Math.sin(2 * Math.PI * f * t) * h.amp;
    }
    out[i] = sample * envelope;
  }

  // Quick attack ramp (2ms) to avoid click
  const attackSamples = Math.min(total, Math.floor(sr * 0.002));
  for (let i = 0; i < attackSamples; i++) out[i] *= i / attackSamples;

  // Fade out tail
  const fade = Math.min(total, Math.floor(sr * 0.01));
  for (let i = 0; i < fade; i++) out[total - 1 - i] *= i / fade;

  return buf;
}
