import { Note } from "tonal";

const TUNING_MIDI = [40, 45, 50, 55, 59, 64];
const STRING_LABELS = ["E", "A", "D", "G", "B", "e"];
const FRET_COUNT = 22;

type Props = {
  highlightPcs: number[];
  rootPc?: number;
  thirdPc?: number;
  seventhPc?: number;
  pcNames?: Record<number, string>;
};

/**
 * Render an SVG guitar fretboard with highlighted chord tones.
 * Displays all 22 frets in standard tuning with color-coded dots:
 * root (red), third (green), seventh (yellow), other chord tones (blue).
 * @param highlightPcs - Pitch classes (0–11) to highlight on the neck
 * @param rootPc - Pitch class of the root note (colored red)
 * @param thirdPc - Pitch class of the third (colored green)
 * @param seventhPc - Pitch class of the seventh if present (colored yellow)
 */
export function Fretboard({ highlightPcs, rootPc, thirdPc, seventhPc, pcNames }: Props) {
  const width = 1100;
  const height = 220;
  const padL = 40;
  const padR = 20;
  const padT = 20;
  const padB = 20;
  const boardW = width - padL - padR;
  const boardH = height - padT - padB;
  const stringGap = boardH / 5;

  const maxPos = 1 - Math.pow(2, -FRET_COUNT / 12);
  const fretX = (n: number) =>
    padL + (boardW * (1 - Math.pow(2, -n / 12))) / maxPos;
  const dotX = (n: number) =>
    n === 0 ? padL - 22 : (fretX(n - 1) + fretX(n)) / 2;
  const highlight = new Set(highlightPcs);
  const markerFrets = [3, 5, 7, 9, 15, 17, 19, 21];
  const doubleMarkerFrets = [12];

  return (
    <svg width={width} height={height} style={{ background: "#2a1f14", borderRadius: 8 }}>
      {Array.from({ length: FRET_COUNT + 1 }, (_, f) => {
        const x = fretX(f);
        const isNut = f === 0;
        return (
          <line
            key={`f${f}`}
            x1={x}
            y1={padT}
            x2={x}
            y2={padT + boardH}
            stroke={isNut ? "#f5e7c7" : "#aaa"}
            strokeWidth={isNut ? 4 : 1.5}
          />
        );
      })}

      {markerFrets.map((f) => (
        <circle
          key={`m${f}`}
          cx={dotX(f)}
          cy={padT + boardH / 2}
          r={5}
          fill="#6a4a2a"
        />
      ))}
      {doubleMarkerFrets.map((f) => (
        <g key={`dm${f}`}>
          <circle cx={dotX(f)} cy={padT + boardH * 0.25} r={5} fill="#6a4a2a" />
          <circle cx={dotX(f)} cy={padT + boardH * 0.75} r={5} fill="#6a4a2a" />
        </g>
      ))}

      {TUNING_MIDI.slice().reverse().map((_, displayIdx) => {
        const y = padT + displayIdx * stringGap;
        return (
          <line
            key={`s${displayIdx}`}
            x1={padL}
            y1={y}
            x2={padL + boardW}
            y2={y}
            stroke="#d9c9a3"
            strokeWidth={1 + displayIdx * 0.3}
          />
        );
      })}

      {TUNING_MIDI.slice().reverse().map((_, displayIdx) => {
        const y = padT + displayIdx * stringGap;
        return (
          <text
            key={`lbl${displayIdx}`}
            x={padL - 18}
            y={y + 4}
            fill="#d9c9a3"
            fontSize={12}
            fontWeight={600}
          >
            {STRING_LABELS[TUNING_MIDI.length - 1 - displayIdx]}
          </text>
        );
      })}

      {TUNING_MIDI.slice().reverse().flatMap((openMidi, displayIdx) => {
        const y = padT + displayIdx * stringGap;
        const dots = [];
        for (let fret = 0; fret <= FRET_COUNT; fret++) {
          const midi = openMidi + fret;
          const pc = midi % 12;
          if (!highlight.has(pc)) continue;
          const x = dotX(fret);
          const isRoot = pc === rootPc;
          const isThird = pc === thirdPc;
          const isSeventh = pc === seventhPc;
          const fill = isRoot
            ? "#e84d4d"
            : isThird
            ? "#3fbf5f"
            : isSeventh
            ? "#e8c93f"
            : "#2d6cdf";
          const name = pcNames?.[pc] ?? Note.pitchClass(Note.fromMidi(midi));
          dots.push(
            <g key={`${displayIdx}-${fret}`}>
              <circle
                cx={x}
                cy={y}
                r={11}
                fill={fill}
                stroke="#fff"
                strokeWidth={1.5}
              />
              <text
                x={x}
                y={y + 4}
                fill="#fff"
                fontSize={11}
                fontWeight={700}
                textAnchor="middle"
              >
                {name}
              </text>
            </g>,
          );
        }
        return dots;
      })}
    </svg>
  );
}
