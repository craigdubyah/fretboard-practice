import { getAudioContext, trackSource } from "./player";

/**
 * Generate a buffer of white noise.
 * @param c - AudioContext
 * @param duration - Length in seconds
 * @returns AudioBuffer filled with random samples in [-1, 1]
 */
function noiseBuffer(c: AudioContext, duration: number): AudioBuffer {
  const sr = c.sampleRate;
  const len = Math.floor(sr * duration);
  const buf = c.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/**
 * Play a short metronome click using a sine oscillator with rapid decay.
 * @param when - AudioContext time to play the click
 * @param freq - Oscillator frequency in Hz (higher = accented beat)
 * @param gain - Volume level (0–1)
 */
function playClick(when: number, freq: number, gain: number) {
  const c = getAudioContext();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.05);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(when);
  osc.stop(when + 0.05);
  trackSource(osc);
}

/**
 * Play a synthesized bass drum hit using a sine oscillator with downward pitch sweep.
 * @param when - AudioContext time to play the kick
 */
function playKick(when: number) {
  const c = getAudioContext();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.frequency.setValueAtTime(150, when);
  osc.frequency.exponentialRampToValueAtTime(40, when + 0.12);
  g.gain.setValueAtTime(0.7, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.3);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(when);
  osc.stop(when + 0.3);
  trackSource(osc);
}

/**
 * Play a synthesized snare hit using high-pass filtered noise + a short sine tone.
 * @param when - AudioContext time to play the snare
 */
function playSnare(when: number) {
  const c = getAudioContext();
  // Noise component
  const noiseSrc = c.createBufferSource();
  noiseSrc.buffer = noiseBuffer(c, 0.15);
  const noiseFilter = c.createBiquadFilter();
  noiseFilter.type = "highpass";
  noiseFilter.frequency.value = 1000;
  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(0.4, when);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, when + 0.15);
  noiseSrc.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(c.destination);
  noiseSrc.start(when);
  noiseSrc.stop(when + 0.15);
  trackSource(noiseSrc);
  // Tone component
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.frequency.value = 180;
  g.gain.setValueAtTime(0.3, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.08);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(when);
  osc.stop(when + 0.08);
  trackSource(osc);
}

/**
 * Play a synthesized closed hi-hat using high-pass filtered noise with fast decay.
 * @param when - AudioContext time to play the hi-hat
 */
function playHiHat(when: number) {
  const c = getAudioContext();
  const noiseSrc = c.createBufferSource();
  noiseSrc.buffer = noiseBuffer(c, 0.08);
  const filter = c.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 7000;
  const g = c.createGain();
  g.gain.setValueAtTime(0.2, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.06);
  noiseSrc.connect(filter);
  filter.connect(g);
  g.connect(c.destination);
  noiseSrc.start(when);
  noiseSrc.stop(when + 0.08);
  trackSource(noiseSrc);
}

export type PercussionMode = "off" | "metronome" | "simple-beat";

/**
 * Returns the start time of beat `b` within a measure.
 * With shuffle, odd beats are delayed to create a triplet swing feel
 * (2/3 + 1/3 subdivision instead of even 1/2 + 1/2).
 */
export function beatTime(when: number, b: number, secondsPerBeat: number, shuffle: boolean): number {
  if (!shuffle) return when + b * secondsPerBeat;
  const pair = Math.floor(b / 2);
  const off = b % 2;
  return when + pair * 2 * secondsPerBeat + (off === 0 ? 0 : secondsPerBeat * (4 / 3));
}

/**
 * Schedule a full measure of percussion hits for the given mode.
 * Metronome: accented click on beat 1, softer clicks on other beats.
 * Simple beat: kick on 1&3, snare on 2&4, hi-hat on every eighth note.
 * @param mode - "off" | "metronome" | "simple-beat"
 * @param when - AudioContext time for beat 1
 * @param secondsPerBeat - Duration of one beat in seconds
 * @param beatsPerChord - Number of beats per measure
 * @param shuffle - If true, apply triplet swing timing to beat positions
 */
export function schedulePercussion(
  mode: PercussionMode,
  when: number,
  secondsPerBeat: number,
  beatsPerChord: number,
  shuffle: boolean,
) {
  if (mode === "off") return;

  for (let b = 0; b < beatsPerChord; b++) {
    const t = beatTime(when, b, secondsPerBeat, shuffle);
    if (mode === "metronome") {
      playClick(t, b === 0 ? 1200 : 800, b === 0 ? 0.5 : 0.3);
    } else {
      // Simple beat: kick on 1&3, snare on 2&4, hi-hat on every eighth note
      const eighthDur = secondsPerBeat / 2;
      playHiHat(t);
      playHiHat(shuffle
        ? beatTime(when, b * 2 + 1, eighthDur, true)
        : t + eighthDur);
      if (b === 0 || b === 2) {
        playKick(t);
      } else {
        playSnare(t);
      }
    }
  }
}
