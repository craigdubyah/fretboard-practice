import { Chord, Interval, Note } from "tonal";

export type ChordVoicing = {
  symbol: string;
  pitchClasses: number[];
  rootPc: number;
  thirdPc: number;
  seventhPc?: number;
  voicedMidi: number[];
  pcNames: Record<number, string>;
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
 * Return a copy of a ChordVoicing with the perfect 5th removed (shell voicing).
 * Only drops the note whose interval is "5P"; altered 5ths (dim, aug) are kept.
 * If the chord has no perfect 5th, returns the original voicing unchanged.
 */
export function toShellVoicing(v: ChordVoicing): ChordVoicing {
  const info = Chord.get(v.symbol);
  const fifthIdx = info.intervals.indexOf("5P");
  if (fifthIdx === -1) return v;
  const fifthPc = PC(info.notes[fifthIdx]);
  const fifthSemis = Interval.semitones("5P")!;
  const rootMidi = v.voicedMidi[0];
  let fifthMidi = rootMidi + fifthSemis;
  while (fifthMidi < rootMidi) fifthMidi += 12;
  const pcNames = { ...v.pcNames };
  delete pcNames[fifthPc];
  return {
    ...v,
    pitchClasses: v.pitchClasses.filter((pc) => pc !== fifthPc),
    voicedMidi: v.voicedMidi.filter((m) => m !== fifthMidi),
    pcNames,
  };
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
  const pcNames: Record<number, string> = {};
  for (const n of info.notes) {
    pcNames[PC(n)] = Note.pitchClass(n);
  }
  return {
    symbol,
    pitchClasses: info.notes.map(PC),
    rootPc: PC(root),
    thirdPc: PC(info.notes[1]),
    seventhPc: info.notes.length >= 4 ? PC(info.notes[3]) : undefined,
    voicedMidi,
    pcNames,
  };
}
