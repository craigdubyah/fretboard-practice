import { Key } from "tonal";

export const KEYS = [
  "C", "Db", "D", "Eb", "E", "F",
  "F#", "G", "Ab", "A", "Bb", "B",
] as const;

export type KeyName = (typeof KEYS)[number];

export type Progression = {
  id: string;
  name: string;
  degrees: number[];
  shuffleSixth?: boolean;
};

export const PROGRESSIONS: Progression[] = [
  { id: "I-IV-V-I",    name: "I–IV–V–I",    degrees: [0, 3, 4, 0] },
  { id: "ii-V-I",      name: "ii–V–I",       degrees: [1, 4, 0] },
  { id: "I-V-vi-IV",   name: "I–V–vi–IV",    degrees: [0, 4, 5, 3] },
  { id: "12-bar-blues", name: "12-Bar Blues", degrees: [0,0,0,0, 3,3,0,0, 4,4,0,4], shuffleSixth: true },
];

const CHROMATIC_ROOTS = ["C","Db","D","Eb","E","F","F#","G","Ab","A","Bb","B"];
const STANDARD_QUALITIES = ["", "m", "7"];
const EXTENDED_QUALITIES = ["", "m", "7", "dim", "aug", "9", "m7", "maj7"];

/**
 * Pick a random element from an array.
 * @param arr - Non-empty array to pick from
 * @returns A randomly selected element
 */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a random chord progression using only diatonic chords from the given key.
 * All chords are randomly selected from the pool.
 * @param tonic - Key root (e.g. "C", "G")
 * @param useSevenths - If true, use 7th chord symbols; otherwise triads
 * @param measures - Number of chords to generate
 * @param allowNonStandard - If true, includes vii° (degree 6) in the chord pool
 * @returns Array of chord symbol strings
 */
export function randomDiatonic(
  tonic: KeyName,
  useSevenths: boolean,
  measures: number,
  allowNonStandard: boolean,
): string[] {
  const key = Key.majorKey(tonic);
  const source = useSevenths ? key.chords : key.triads;
  const pool = allowNonStandard ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5];
  return Array.from({ length: measures }, () => source[pick(pool)]);
}

/**
 * Generate a random chord progression using any chromatic root and random quality.
 * Not constrained to any key.
 * @param measures - Number of chords to generate
 * @param allowNonStandard - If true, adds dim/aug/9/m7/maj7 to the quality pool
 * @returns Array of chord symbol strings (e.g. ["Ebm", "F#7", "Bb"])
 */
export function randomChromatic(
  measures: number,
  allowNonStandard: boolean,
): string[] {
  const qualities = allowNonStandard ? EXTENDED_QUALITIES : STANDARD_QUALITIES;
  const result: string[] = [];
  for (let i = 0; i < measures; i++) {
    result.push(pick(CHROMATIC_ROOTS) + pick(qualities));
  }
  return result;
}

/**
 * Look up a preset progression by ID and resolve its scale degrees to chord symbols in the given key.
 * @param id - Progression ID (e.g. "I-IV-V-I", "12-bar-blues")
 * @param tonic - Key root (e.g. "C", "G")
 * @param useSevenths - If true, use 7th chord symbols; otherwise triads
 * @returns Array of chord symbol strings for the progression
 * @throws Error if the progression ID is not found
 */
export function getProgression(
  id: string,
  tonic: KeyName,
  useSevenths: boolean,
): string[] {
  const prog = PROGRESSIONS.find((p) => p.id === id);
  if (!prog) throw new Error(`Unknown progression: ${id}`);
  const key = Key.majorKey(tonic);
  const source = useSevenths ? key.chords : key.triads;
  return prog.degrees.map((d) => source[d]);
}
