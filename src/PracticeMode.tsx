import { useEffect, useMemo, useRef, useState } from "react";
import { Fretboard } from "./fretboard/Fretboard";
import { buildChord, sixthChordSymbol, toShellVoicing } from "./theory/chords";
import {
  KEYS, KeyName, PROGRESSIONS, getProgression,
  randomDiatonic, randomChromatic,
} from "./progressions/progression";
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
 * Practice Mode: play preset or random chord progressions in a selected key.
 * Manages playback state, progression selection, instrument/percussion/tempo controls,
 * and renders the fretboard visualization.
 */
export function PracticeMode() {
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [bpm, setBpm] = useState(80);
  const [instrument, setInstrument] = useState<Instrument>("guitar");
  const [percussion, setPercussion] = useState<PercussionMode>("off");
  const [shuffle, setShuffle] = useState(false);
  const [keyName, setKeyName] = useState<KeyName>("C");
  const [progressionId, setProgressionId] = useState(PROGRESSIONS[0].id);
  const [useSevenths, setUseSevenths] = useState(false);
  const [shellVoicing, setShellVoicing] = useState(false);
  const [measures, setMeasures] = useState(4);
  const [allowNonStandard, setAllowNonStandard] = useState(false);
  const [randomChords, setRandomChords] = useState<string[] | null>(null);
  const timerRef = useRef<number | null>(null);
  const nextStartRef = useRef<number>(0);

  const isRandom = progressionId === "random-diatonic" || progressionId === "random-chromatic";
  const selectedProg = PROGRESSIONS.find((p) => p.id === progressionId);
  const progressionName = selectedProg?.name
    ?? (progressionId === "random-diatonic" ? "Random Diatonic" : "Random Chromatic");

  /**
   * Generate a new random chord progression based on current settings and reset playback to the start.
   */
  function generateRandom() {
    const syms = progressionId === "random-diatonic"
      ? randomDiatonic(keyName, useSevenths, measures, allowNonStandard)
      : randomChromatic(measures, allowNonStandard);
    setRandomChords(syms);
    setIndex(0);
  }

  // Auto-generate when switching to random or changing settings
  useEffect(() => {
    if (isRandom) {
      const syms = progressionId === "random-diatonic"
        ? randomDiatonic(keyName, useSevenths, measures, allowNonStandard)
        : randomChromatic(measures, allowNonStandard);
      setRandomChords(syms);
      setIndex(0);
    }
  }, [isRandom, progressionId, keyName, useSevenths, measures, allowNonStandard]);

  const chordSymbols = isRandom && randomChords
    ? randomChords
    : isRandom
      ? [] // brief empty state before effect runs
      : getProgression(progressionId, keyName, useSevenths);

  const chords = useMemo(
    () => chordSymbols.map((s) => {
      const c = buildChord(s);
      return shellVoicing ? toShellVoicing(c) : c;
    }),
    [chordSymbols, shellVoicing],
  );
  const current = chords[index] ?? chords[0];

  const sixthMidi = useMemo(() => {
    if (!selectedProg?.shuffleSixth || !current) return null;
    const sixth = buildChord(sixthChordSymbol(current.symbol));
    return shellVoicing ? toShellVoicing(sixth).voicedMidi : sixth.voicedMidi;
  }, [selectedProg?.shuffleSixth, current?.symbol, shellVoicing]);

  const secondsPerBeat = 60 / bpm;
  const secondsPerChord = secondsPerBeat * BEATS_PER_CHORD;

  useEffect(() => {
    if (!playing || !current) return;
    // Use the pre-calculated start time; fall back to now() + 50ms for the first beat
    const start = nextStartRef.current > now() ? nextStartRef.current : now() + 0.05;
    // Lock in the next measure's start time on the Web Audio clock
    nextStartRef.current = start + secondsPerChord;
    for (let b = 0; b < BEATS_PER_CHORD; b++) {
      const useSixth = sixthMidi && (b === 2 || b === 3);
      const t = beatTime(start, b, secondsPerBeat, shuffle);
      strumChord(useSixth ? sixthMidi : current.voicedMidi, t, {
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
   * Start playback from the beginning of the current progression.
   * Resumes the AudioContext if suspended (browser autoplay policy).
   */
  async function handlePlay() {
    await ensureAudioReady();
    nextStartRef.current = 0; // reset so first beat uses now() + 0.05
    setIndex(0);
    setPlaying(true);
  }

  /**
   * Stop playback and cancel any pending chord advance timer.
   */
  function handleStop() {
    setPlaying(false);
    nextStartRef.current = 0;
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }

  return (
    <div>
      <p style={{ color: "#999", marginTop: 4 }}>
        {progressionName} · {bpm} BPM · {instrument}
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "12px 0", flexWrap: "wrap" }}>
        <label style={{ color: "#ccc", fontSize: 14 }}>Progression</label>
        <select
          value={progressionId}
          onChange={(e) => { setProgressionId(e.target.value); setIndex(0); setPlaying(false); }}
          style={SELECT_STYLE}
        >
          {PROGRESSIONS.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
          <option disabled>──────────</option>
          <option value="random-diatonic">Random Diatonic</option>
          <option value="random-chromatic">Random Chromatic</option>
        </select>

        <label style={{ color: "#ccc", fontSize: 14, marginLeft: 8 }}>Key</label>
        <select
          value={keyName}
          onChange={(e) => { setKeyName(e.target.value as KeyName); setIndex(0); }}
          style={SELECT_STYLE}
        >
          {KEYS.map((k) => (
            <option key={k} value={k}>{k} major</option>
          ))}
        </select>

        <label style={{ color: "#ccc", fontSize: 14, marginLeft: 8 }}>Instrument</label>
        <select value={instrument} onChange={(e) => setInstrument(e.target.value as Instrument)} style={SELECT_STYLE}>
          {INSTRUMENTS.map((inst) => (
            <option key={inst.id} value={inst.id}>{inst.label}</option>
          ))}
        </select>

        <label style={{ color: "#ccc", fontSize: 14, marginLeft: 8 }}>Percussion</label>
        <select value={percussion} onChange={(e) => setPercussion(e.target.value as PercussionMode)} style={SELECT_STYLE}>
          <option value="off">Off</option>
          <option value="metronome">Metronome</option>
          <option value="simple-beat">Simple Beat</option>
        </select>

        <label style={{ color: "#ccc", fontSize: 14, marginLeft: 8 }}>
          <input
            type="checkbox"
            checked={useSevenths}
            onChange={(e) => { setUseSevenths(e.target.checked); setIndex(0); }}
            style={{ marginRight: 6 }}
          />
          7th chords
        </label>

        <label style={{ color: "#ccc", fontSize: 14, marginLeft: 8 }}>
          <input
            type="checkbox"
            checked={shellVoicing}
            onChange={(e) => setShellVoicing(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          Shell chords
        </label>

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

      {isRandom && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "12px 0" }}>
          <label style={{ color: "#ccc", fontSize: 14 }}>Measures</label>
          <input
            type="number" min={2} max={16} value={measures}
            onChange={(e) => setMeasures(Math.max(2, Math.min(16, Number(e.target.value))))}
            style={{ ...SELECT_STYLE, width: 60 }}
          />
          <label style={{ color: "#ccc", fontSize: 14, marginLeft: 8 }}>
            <input
              type="checkbox"
              checked={allowNonStandard}
              onChange={(e) => setAllowNonStandard(e.target.checked)}
              style={{ marginRight: 6 }}
            />
            Non-standard chords
          </label>
          <button onClick={generateRandom} style={{ marginLeft: 8 }}>New chords</button>
        </div>
      )}

      <div className="chord-row">
        {chords.map((c, i) => (
          <div key={i} className={`chord-chip ${i === index ? "active" : ""}`}>
            {c.symbol}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {!playing ? (
          <button onClick={handlePlay}>Play</button>
        ) : (
          <button onClick={handleStop}>Stop</button>
        )}
      </div>

      {current && (
        <Fretboard
          highlightPcs={current.pitchClasses}
          rootPc={current.rootPc}
          thirdPc={current.thirdPc}
          seventhPc={current.seventhPc}
          pcNames={current.pcNames}
        />
      )}
    </div>
  );
}
