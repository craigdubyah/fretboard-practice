import { useEffect, useMemo, useRef, useState } from "react";
import { Key } from "tonal";
import { Fretboard } from "./fretboard/Fretboard";
import { buildChord } from "./theory/chords";
import { KEYS, KeyName } from "./progressions/progression";
import { ensureAudioReady, now, stopAll, strumChord, Instrument } from "./audio/player";
import { PercussionMode, schedulePercussion, beatTime } from "./audio/percussion";

const INSTRUMENTS: { id: Instrument; label: string }[] = [
  { id: "guitar",  label: "Guitar" },
  { id: "piano",   label: "Piano" },
  { id: "organ",   label: "Organ" },
  { id: "strings", label: "Strings" },
  { id: "horns",   label: "Horns" },
  { id: "sine",    label: "Simple Tone" },
];

const BEATS_PER_CHORD = 4;

const SELECT_STYLE: React.CSSProperties = {
  background: "#2a2a30", color: "#eaeaea", border: "1px solid #444",
  borderRadius: 6, padding: "6px 10px", fontSize: 14,
};

/**
 * Pick a random element from an array.
 */
function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Mystery Mode: a random major key is secretly chosen and all 7 diatonic 7th chords
 * are presented. The user listens and plays along to figure out the key by ear.
 * A Reveal button confirms their guess.
 */
export function MysteryMode() {
  const [hiddenKey, setHiddenKey] = useState<KeyName | null>(null);
  const [chordSymbols, setChordSymbols] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [bpm, setBpm] = useState(80);
  const [instrument, setInstrument] = useState<Instrument>("guitar");
  const [percussion, setPercussion] = useState<PercussionMode>("off");
  const [shuffle, setShuffle] = useState(false);
  const [measures, setMeasures] = useState(4);
  const timerRef = useRef<number | null>(null);
  const nextStartRef = useRef<number>(0);

  const chords = useMemo(
    () => chordSymbols.map((s) => buildChord(s)),
    [chordSymbols],
  );
  const current = chords[index] ?? chords[0];

  const secondsPerBeat = 60 / bpm;
  const secondsPerChord = secondsPerBeat * BEATS_PER_CHORD;

  /**
   * Pick a random major key, then randomly sample `measures` chords from its 7 diatonic
   * 7th chords with repetition allowed. Resets playback.
   */
  function handleRandomize() {
    stopAll();
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setPlaying(false);
    nextStartRef.current = 0;
    const key = pickRandom(KEYS);
    const k = Key.majorKey(key);
    const pool = [...k.triads, ...k.chords];
    const syms = Array.from({ length: measures }, () => pickRandom(pool));
    setHiddenKey(key);
    setChordSymbols(syms);
    setRevealed(false);
    setIndex(0);
  }

  useEffect(() => {
    if (!playing || !current) return;
    // Use the pre-calculated start time; fall back to now() + 50ms for the first beat
    const start = nextStartRef.current > now() ? nextStartRef.current : now() + 0.05;
    // Lock in the next measure's start time on the Web Audio clock
    nextStartRef.current = start + secondsPerChord;
    for (let b = 0; b < BEATS_PER_CHORD; b++) {
      const t = beatTime(start, b, secondsPerBeat, shuffle);
      strumChord(current.voicedMidi, t, {
        durationSec: secondsPerBeat * 1.1,
        instrument,
      });
    }
    schedulePercussion(percussion, start, secondsPerBeat, BEATS_PER_CHORD, shuffle);
    // Fire setTimeout slightly early so the effect runs before audio needs to play
    const msUntilNext = (nextStartRef.current - now()) * 1000 - 50;
    timerRef.current = window.setTimeout(() => {
      setIndex((i) => (i + 1) % chords.length);
    }, Math.max(0, msUntilNext));
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      stopAll();
    };
  }, [playing, index, chords, current, secondsPerBeat, secondsPerChord, instrument, percussion, shuffle]);

  /**
   * Start playback from the beginning of the current chord set.
   */
  async function handlePlay() {
    await ensureAudioReady();
    nextStartRef.current = 0;
    setIndex(0);
    setPlaying(true);
  }

  /**
   * Stop playback and cancel the advance timer.
   */
  function handleStop() {
    setPlaying(false);
    nextStartRef.current = 0;
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }

  const hasChords = chordSymbols.length > 0;

  return (
    <div>
      <p style={{ color: "#999", marginTop: 4 }}>
        Listen and figure out the key — then reveal it.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "12px 0", flexWrap: "wrap" }}>
        <label style={{ color: "#ccc", fontSize: 14 }}>Instrument</label>
        <select value={instrument} onChange={(e) => setInstrument(e.target.value as Instrument)} style={SELECT_STYLE}>
          {INSTRUMENTS.map((inst) => (
            <option key={inst.id} value={inst.id}>{inst.label}</option>
          ))}
        </select>

        <label style={{ color: "#ccc", fontSize: 14, marginLeft: 8 }}>Measures</label>
        <input
          type="number" min={2} max={16} value={measures}
          onChange={(e) => setMeasures(Math.max(2, Math.min(16, Number(e.target.value))))}
          style={{ ...SELECT_STYLE, width: 60 }}
        />

        <label style={{ color: "#ccc", fontSize: 14, marginLeft: 8 }}>Percussion</label>
        <select value={percussion} onChange={(e) => setPercussion(e.target.value as PercussionMode)} style={SELECT_STYLE}>
          <option value="off">Off</option>
          <option value="metronome">Metronome</option>
          <option value="simple-beat">Simple Beat</option>
        </select>

        <label style={{ color: "#ccc", fontSize: 14, marginLeft: 8 }}>Tempo</label>
        <input
          type="range" min={40} max={200} value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          style={{ width: 120 }}
        />
        <span style={{ color: "#eaeaea", fontSize: 14, minWidth: 48 }}>{bpm} BPM</span>

        <label style={{ color: "#ccc", fontSize: 14, marginLeft: 8 }}>
          <input
            type="checkbox"
            checked={shuffle}
            onChange={(e) => setShuffle(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          Swing beat
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <button onClick={handleRandomize}>Randomize</button>

        {hasChords && (
          <>
            {!playing ? (
              <button onClick={handlePlay}>Play</button>
            ) : (
              <button onClick={handleStop}>Stop</button>
            )}
            <button onClick={() => setRevealed((r) => !r)} style={{ marginLeft: 8 }}>
              {revealed ? "Hide key" : "Reveal"}
            </button>
          </>
        )}
      </div>

      {revealed && hiddenKey && (
        <div style={{
          display: "inline-block",
          padding: "6px 18px",
          marginBottom: 16,
          border: "1px solid #e8c93f",
          borderRadius: 8,
          color: "#e8c93f",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: 1,
        }}>
          Key: {hiddenKey} major
        </div>
      )}

      {!hasChords && (
        <p style={{ color: "#555", fontStyle: "italic" }}>
          Press Randomize to begin.
        </p>
      )}

      {hasChords && (
        <div className="chord-row">
          {chords.map((c, i) => (
            <div key={i} className={`chord-chip ${i === index ? "active" : ""}`}>
              {c.symbol}
            </div>
          ))}
        </div>
      )}

      {current && (
        <Fretboard
          highlightPcs={current.pitchClasses}
          rootPc={current.rootPc}
          thirdPc={current.thirdPc}
          seventhPc={current.seventhPc}
        />
      )}
    </div>
  );
}
