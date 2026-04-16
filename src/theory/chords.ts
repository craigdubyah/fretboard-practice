import { Chord, Note } from "tonal";

export type ChordVoicing = {
  symbol: string;
  pitchClasses: number[];
  rootPc: number;
  thirdPc: number;
  seventhPc?: number;
  voicedMidi: number[];
};

/**
 * Convert a note name to its pitch class number (0–11, where C=0).
 * @param name - Note name (e.g. "C", "F#", "Bb")
 * @returns Pitch class as an integer 0–11
 */
const PC = (name: string) => Note.chroma(name)!;

/**
 * Derive a major-6th chord symbol from any chord symbol (e.g. "Dm7" → "D6").
 * Used for blues shuffle where beats 2 & 4 alternate to the 6th chord.
 * @param symbol - Any chord symbol recognized by tonal
 * @returns The root note with "6" appended (e.g. "D6")
 */
export function sixthChordSymbol(symbol: string): string {
  return Chord.get(symbol).tonic + "6";
}

/**
 * Parse a chord symbol and build a voicing with pitch classes and MIDI notes.
 * Returns up to 5 MIDI notes stacked above the root; for triads, adds an octave-doubled root.
 * @param symbol - Chord symbol recognized by tonal (e.g. "Cmaj7", "Dm", "G7")
 * @param rootOctave - Octave for the root note (default 3)
 * @returns ChordVoicing with symbol, pitchClasses, rootPc, thirdPc, seventhPc, and voicedMidi
 * @throws Error if the symbol is unrecognized or has fewer than 3 notes
 */
export function buildChord(symbol: string, rootOctave = 3): ChordVoicing {
  const info = Chord.get(symbol);
  if (info.empty || info.notes.length < 3) {
    throw new Error(`Unknown chord: ${symbol}`);
  }
  const root = info.notes[0];
  const rootMidi = Note.midi(`${root}${rootOctave}`)!;
  const stacked = info.notes.map((n) => {
    let m = Note.midi(`${n}${rootOctave}`)!;
    while (m < rootMidi) m += 12;
    return m;
  });
  const voicedMidi =
    stacked.length >= 4 ? stacked.slice(0, 5) : [...stacked, rootMidi + 12];
  return {
    symbol,
    pitchClasses: info.notes.map(PC),
    rootPc: PC(root),
    thirdPc: PC(info.notes[1]),
    seventhPc: info.notes.length >= 4 ? PC(info.notes[3]) : undefined,
    voicedMidi,
  };
}
