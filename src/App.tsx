import { useState } from "react";
import { stopAll } from "./audio/player";
import { PracticeMode } from "./PracticeMode";
import { MysteryMode } from "./MysteryMode";
import { ModalImprov } from "./ModalImprov";
import { ChooseChords } from "./ChooseChords";

type Mode = "practice" | "mystery" | "modal" | "choose";

const TAB_STYLE = (active: boolean): React.CSSProperties => ({
  padding: "8px 20px",
  fontSize: 15,
  fontWeight: active ? 700 : 400,
  color: active ? "#eaeaea" : "#777",
  background: active ? "#2a2a30" : "transparent",
  border: "1px solid",
  borderColor: active ? "#555" : "transparent",
  borderRadius: "6px 6px 0 0",
  cursor: active ? "default" : "pointer",
  borderBottom: active ? "1px solid #1a1a20" : "1px solid #333",
  marginBottom: -1,
});

/**
 * Root application shell. Renders a tab bar to switch between Practice Mode
 * and Mystery Mode. Stops all audio when switching tabs.
 */
export function App() {
  const [mode, setMode] = useState<Mode>("practice");

  function switchMode(next: Mode) {
    if (next === mode) return;
    stopAll();
    setMode(next);
  }

  return (
    <div>
      <h1 style={{ margin: "0 0 12px 0" }}>Fretboard Practice</h1>

      <div style={{ display: "flex", borderBottom: "1px solid #333", marginBottom: 16 }}>
        <button style={TAB_STYLE(mode === "practice")} onClick={() => switchMode("practice")}>
          Practice
        </button>
        <button style={TAB_STYLE(mode === "mystery")} onClick={() => switchMode("mystery")}>
          Mystery Key
        </button>
        <button style={TAB_STYLE(mode === "modal")} onClick={() => switchMode("modal")}>
          Modal Improv
        </button>
        <button style={TAB_STYLE(mode === "choose")} onClick={() => switchMode("choose")}>
          Choose Chords
        </button>
      </div>

      {mode === "practice" && <PracticeMode />}
      {mode === "mystery" && <MysteryMode />}
      {mode === "modal" && <ModalImprov />}
      {mode === "choose" && <ChooseChords />}
    </div>
  );
}
