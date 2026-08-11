import { AudioPlayer, createAudioPlayer } from 'expo-audio';

import { CLICK_SAMPLES } from '@/data/clickSamples';

const POOL_SIZE = 2;
const pools = new Map<'hi' | 'lo', AudioPlayer[]>();
const nextIndex = new Map<'hi' | 'lo', number>();

function pool(kind: 'hi' | 'lo'): AudioPlayer[] {
  let p = pools.get(kind);
  if (!p) {
    p = Array.from({ length: POOL_SIZE }, () => createAudioPlayer(CLICK_SAMPLES[kind]));
    pools.set(kind, p);
  }
  return p;
}

/** Plays a metronome click. `accent` is the downbeat (slot 0 of a measure). */
export function playClick(accent: boolean) {
  const kind = accent ? 'hi' : 'lo';
  const players = pool(kind);
  const index = nextIndex.get(kind) ?? 0;
  nextIndex.set(kind, (index + 1) % POOL_SIZE);
  const player = players[index];
  player.seekTo(0);
  player.play();
}

export function releaseClickPlayers() {
  for (const players of pools.values()) {
    for (const player of players) player.release();
  }
  pools.clear();
  nextIndex.clear();
}
