import { Mode } from "tonal";
import { KeyName } from "../progressions/progression";

export type ModalMode = "dorian" | "mixolydian" | "lydian" | "phrygian" | "aeolian";

export type ModeConfig = {
  id: ModalMode;
  name: string;
  /** Each entry is a cadence pattern — an array of scale degrees (0-indexed). */
  cadenceDegrees: number[][];
};

export const MODE_CONFIGS: ModeConfig[] = [
  { id: "dorian",     name: "Dorian",     cadenceDegrees: [[3], [1]] },
  { id: "mixolydian", name: "Mixolydian", cadenceDegrees: [[6], [4]] },
  { id: "lydian",     name: "Lydian",     cadenceDegrees: [[1], [6]] },
  { id: "phrygian",   name: "Phrygian",   cadenceDegrees: [[1], [6]] },
  { id: "aeolian",    name: "Aeolian",    cadenceDegrees: [[5, 6], [4]] },
];

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Pick a chord symbol for the given scale degree, randomly choosing
 * between triad and 7th chord voicings.
 */
function chordForDegree(mode: ModalMode, root: string, degree: number): string {
  const triads = Mode.triads(mode, root);
  const sevenths = Mode.seventhChords(mode, root);
  return Math.random() < 0.5 ? triads[degree] : sevenths[degree];
}

/**
 * Generate a modal chord progression using 3-measure phrase groups:
 *   measure 1: tonic (degree 0)
 *   measure 2: free (any diatonic degree)
 *   measure 3: cadence chord (from the mode's cadence pool)
 *
 * Remainder measures (if total not divisible by 3) get: tonic + free chords.
 * For Aeolian's [5,6] cadence pattern, beats 2 and 3 become bVI then bVII.
 */
export function generateModalProgression(
  config: ModeConfig,
  root: KeyName,
  measures: number,
): string[] {
  const result: string[] = [];
  const allDegrees = [0, 1, 2, 3, 4, 5, 6];

  let i = 0;
  while (i < measures) {
    const remaining = measures - i;

    if (remaining >= 3) {
      // Full 3-measure phrase: tonic, free, cadence
      result.push(chordForDegree(config.id, root, 0));

      const cadencePattern = pickRandom(config.cadenceDegrees);

      if (cadencePattern.length === 2) {
        // Two-chord cadence (e.g. Aeolian bVI-bVII): fills beats 2 and 3
        result.push(chordForDegree(config.id, root, cadencePattern[0]));
        result.push(chordForDegree(config.id, root, cadencePattern[1]));
      } else {
        // Single cadence chord on beat 3, free chord on beat 2
        result.push(chordForDegree(config.id, root, pickRandom(allDegrees)));
        result.push(chordForDegree(config.id, root, cadencePattern[0]));
      }
      i += 3;
    } else {
      // Remainder: tonic + free chords
      result.push(chordForDegree(config.id, root, 0));
      i++;
      while (i < measures) {
        result.push(chordForDegree(config.id, root, pickRandom(allDegrees)));
        i++;
      }
    }
  }

  return result;
}
