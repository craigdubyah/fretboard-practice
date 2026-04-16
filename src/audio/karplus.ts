/**
 * Generate a plucked-string audio buffer using the Karplus-Strong algorithm.
 * @param ctx - Web Audio context (provides sample rate)
 * @param freq - Fundamental frequency in Hz
 * @param durationSec - Length of the resulting buffer in seconds
 * @param decay - Feedback decay factor (0–1); higher = longer sustain
 * @returns AudioBuffer containing the synthesized waveform
 */
export function karplusStrongBuffer(
  ctx: BaseAudioContext,
  freq: number,
  durationSec: number,
  decay = 0.996,
): AudioBuffer {
  const sr = ctx.sampleRate;
  const total = Math.max(1, Math.floor(sr * durationSec));
  const N = Math.max(2, Math.floor(sr / freq));
  const buf = ctx.createBuffer(1, total, sr);
  const out = buf.getChannelData(0);
  const delay = new Float32Array(N);
  for (let i = 0; i < N; i++) delay[i] = Math.random() * 2 - 1;
  let idx = 0;
  for (let i = 0; i < total; i++) {
    const cur = delay[idx];
    const next = delay[(idx + 1) % N];
    const avg = 0.5 * (cur + next) * decay;
    out[i] = cur;
    delay[idx] = avg;
    idx = (idx + 1) % N;
  }
  const fade = Math.min(total, Math.floor(sr * 0.01));
  for (let i = 0; i < fade; i++) out[total - 1 - i] *= i / fade;
  return buf;
}

/**
 * Convert a MIDI note number to frequency in Hz.
 * @param midi - MIDI note number (e.g. 69 = A4)
 * @returns Frequency in Hz
 */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
