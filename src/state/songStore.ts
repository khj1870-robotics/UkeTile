import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ChordBlock, DEFAULT_BLOCK_LENGTH_SLOTS, DEFAULT_BPM, emptySong, Measure, Song } from '@/data/song';
import { DEFAULT_STROKE_ID, StrokeId, StrokePattern } from '@/data/strokePatterns';
import { clampResizeLength, firstFreeRange, nearestValidStart } from '@/lib/timingGrid';

interface SongState {
  songs: Song[];

  createSong: (title: string, bpm?: number, defaultStrokeId?: StrokeId) => string;
  deleteSong: (songId: string) => void;
  updateSongMeta: (
    songId: string,
    patch: Partial<Pick<Song, 'title' | 'bpm' | 'defaultStrokeId' | 'metronomeOn' | 'chordSoundOn'>>
  ) => void;

  addChordBlock: (songId: string, measureIndex: number, chordId: string, targetStartSlot: number) => void;
  moveChordBlock: (songId: string, blockId: string, toMeasureIndex: number, targetStartSlot: number) => void;
  resizeChordBlock: (songId: string, blockId: string, requestedLength: number) => void;
  setBlockStroke: (songId: string, blockId: string, strokeId: StrokeId | undefined, customPattern?: StrokePattern) => void;
  duplicateBlock: (songId: string, blockId: string) => void;
  deleteBlock: (songId: string, blockId: string) => void;
  addMeasure: (songId: string) => void;
}

let idCounter = 0;
function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

function findBlockMeasure(song: Song, blockId: string): { measureIndex: number; block: ChordBlock } | null {
  for (let i = 0; i < song.measures.length; i++) {
    const block = song.measures[i].blocks.find((b) => b.id === blockId);
    if (block) return { measureIndex: i, block };
  }
  return null;
}

function updateSong(songs: Song[], songId: string, update: (song: Song) => Song): Song[] {
  return songs.map((song) => (song.id === songId ? { ...update(song), updatedAt: Date.now() } : song));
}

function replaceMeasure(song: Song, measureIndex: number, measure: Measure): Song {
  const measures = [...song.measures];
  measures[measureIndex] = measure;
  return { ...song, measures };
}

export const useSongStore = create<SongState>()(
  persist(
    (set) => ({
      songs: [],

      createSong: (title, bpm = DEFAULT_BPM, defaultStrokeId = DEFAULT_STROKE_ID) => {
        const song = emptySong(title, bpm, () => newId('song'));
        song.defaultStrokeId = defaultStrokeId;
        set((state) => ({ songs: [...state.songs, song] }));
        return song.id;
      },

      deleteSong: (songId) => set((state) => ({ songs: state.songs.filter((s) => s.id !== songId) })),

      updateSongMeta: (songId, patch) =>
        set((state) => ({ songs: updateSong(state.songs, songId, (song) => ({ ...song, ...patch })) })),

      addChordBlock: (songId, measureIndex, chordId, targetStartSlot) =>
        set((state) => ({
          songs: updateSong(state.songs, songId, (song) => {
            const measure = song.measures[measureIndex];
            if (!measure) return song;
            const start = nearestValidStart(measure.blocks, DEFAULT_BLOCK_LENGTH_SLOTS, targetStartSlot);
            if (start === null) return song;
            const block: ChordBlock = {
              id: newId('block'),
              chordId,
              startSlot: start,
              lengthSlots: DEFAULT_BLOCK_LENGTH_SLOTS,
            };
            return replaceMeasure(song, measureIndex, { ...measure, blocks: [...measure.blocks, block] });
          }),
        })),

      moveChordBlock: (songId, blockId, toMeasureIndex, targetStartSlot) =>
        set((state) => ({
          songs: updateSong(state.songs, songId, (song) => {
            const found = findBlockMeasure(song, blockId);
            const destMeasure = song.measures[toMeasureIndex];
            if (!found || !destMeasure) return song;
            const { measureIndex: fromMeasureIndex, block } = found;
            const excludeId = fromMeasureIndex === toMeasureIndex ? blockId : undefined;
            const start = nearestValidStart(destMeasure.blocks, block.lengthSlots, targetStartSlot, excludeId);
            if (start === null) return song;

            let next = song;
            if (fromMeasureIndex === toMeasureIndex) {
              const others = destMeasure.blocks.filter((b) => b.id !== blockId);
              next = replaceMeasure(next, toMeasureIndex, {
                ...destMeasure,
                blocks: [...others, { ...block, startSlot: start }],
              });
            } else {
              const sourceMeasure = next.measures[fromMeasureIndex];
              next = replaceMeasure(next, fromMeasureIndex, {
                ...sourceMeasure,
                blocks: sourceMeasure.blocks.filter((b) => b.id !== blockId),
              });
              const dest = next.measures[toMeasureIndex];
              next = replaceMeasure(next, toMeasureIndex, {
                ...dest,
                blocks: [...dest.blocks, { ...block, startSlot: start }],
              });
            }
            return next;
          }),
        })),

      resizeChordBlock: (songId, blockId, requestedLength) =>
        set((state) => ({
          songs: updateSong(state.songs, songId, (song) => {
            const found = findBlockMeasure(song, blockId);
            if (!found) return song;
            const { measureIndex, block } = found;
            const measure = song.measures[measureIndex];
            const length = clampResizeLength(measure.blocks, blockId, requestedLength);
            return replaceMeasure(song, measureIndex, {
              ...measure,
              blocks: measure.blocks.map((b) => (b.id === blockId ? { ...b, lengthSlots: length } : b)),
            });
          }),
        })),

      setBlockStroke: (songId, blockId, strokeId, customPattern) =>
        set((state) => ({
          songs: updateSong(state.songs, songId, (song) => {
            const found = findBlockMeasure(song, blockId);
            if (!found) return song;
            const { measureIndex } = found;
            const measure = song.measures[measureIndex];
            return replaceMeasure(song, measureIndex, {
              ...measure,
              blocks: measure.blocks.map((b) =>
                b.id === blockId ? { ...b, strokeId, customPattern: strokeId === 'custom' ? customPattern : undefined } : b
              ),
            });
          }),
        })),

      duplicateBlock: (songId, blockId) =>
        set((state) => ({
          songs: updateSong(state.songs, songId, (song) => {
            const found = findBlockMeasure(song, blockId);
            if (!found) return song;
            const { measureIndex, block } = found;

            for (let i = measureIndex; i < song.measures.length; i++) {
              const measure = song.measures[i];
              const from = i === measureIndex ? block.startSlot + block.lengthSlots : 0;
              const range = firstFreeRange(measure.blocks, block.lengthSlots, from);
              if (range) {
                const copy: ChordBlock = { ...block, id: newId('block'), startSlot: range.start };
                return replaceMeasure(song, i, { ...measure, blocks: [...measure.blocks, copy] });
              }
            }
            return song;
          }),
        })),

      deleteBlock: (songId, blockId) =>
        set((state) => ({
          songs: updateSong(state.songs, songId, (song) => {
            const found = findBlockMeasure(song, blockId);
            if (!found) return song;
            const { measureIndex } = found;
            const measure = song.measures[measureIndex];
            return replaceMeasure(song, measureIndex, {
              ...measure,
              blocks: measure.blocks.filter((b) => b.id !== blockId),
            });
          }),
        })),

      addMeasure: (songId) =>
        set((state) => ({
          songs: updateSong(state.songs, songId, (song) => ({
            ...song,
            measures: [...song.measures, { id: newId('measure'), blocks: [] }],
          })),
        })),
    }),
    {
      name: 'uketile-songs',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ songs: state.songs }),
    }
  )
);

export function useSong(songId: string): Song | undefined {
  return useSongStore((state) => state.songs.find((s) => s.id === songId));
}
