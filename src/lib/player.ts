import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { Chord } from '@/data/chords';
import { chordMidiNotes } from '@/lib/chordNotes';
import { NOTE_SAMPLES } from '@/data/sampleMap';
import { useSettingsStore } from '@/state/settingsStore';

/** Delay between successive strings when strumming, in ms. */
const STRUM_INTERVAL_MS = 45;
/** Players per note so the same pitch can ring twice in one strum (e.g. E major). */
const POOL_SIZE = 2;

const pools = new Map<number, AudioPlayer[]>();
const nextIndex = new Map<number, number>();
let audioModeReady = false;

function ensureAudioMode() {
  if (audioModeReady) return;
  audioModeReady = true;
  // Chord previews should be audible even with the iOS silent switch on.
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => {
    audioModeReady = false;
  });
}

function acquirePlayer(midi: number): AudioPlayer | null {
  const source = NOTE_SAMPLES[midi];
  if (source === undefined) return null;
  let pool = pools.get(midi);
  if (!pool) {
    pool = Array.from({ length: POOL_SIZE }, () => createAudioPlayer(source));
    pools.set(midi, pool);
  }
  const index = nextIndex.get(midi) ?? 0;
  nextIndex.set(midi, (index + 1) % POOL_SIZE);
  return pool[index];
}

function playNote(midi: number) {
  const player = acquirePlayer(midi);
  if (!player) return;
  player.seekTo(0);
  player.play();
}

/** Strum the chord from the G string down to the A string. No-op while muted. */
export function playChord(chord: Chord) {
  if (!useSettingsStore.getState().soundEnabled) return;
  ensureAudioMode();
  const notes = chordMidiNotes(chord);
  notes.forEach((midi, string) => {
    if (string === 0) {
      playNote(midi);
    } else {
      setTimeout(() => playNote(midi), string * STRUM_INTERVAL_MS);
    }
  });
}

/** Release all cached players (e.g. when the app goes to background). */
export function releasePlayers() {
  for (const pool of pools.values()) {
    for (const player of pool) player.release();
  }
  pools.clear();
  nextIndex.clear();
}
