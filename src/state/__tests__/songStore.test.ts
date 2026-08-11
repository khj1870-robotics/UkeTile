import { act } from '@testing-library/react-native';

import { SLOTS_PER_MEASURE } from '@/data/song';
import { useSongStore } from '@/state/songStore';

function firstSong() {
  return useSongStore.getState().songs[0];
}

beforeEach(() => {
  useSongStore.setState({ songs: [] });
});

describe('songStore', () => {
  it('createSong starts with 4 empty measures and the requested bpm/stroke', () => {
    let songId = '';
    act(() => {
      songId = useSongStore.getState().createSong('내 노래', 100, 'pop');
    });
    const song = firstSong();
    expect(song.id).toBe(songId);
    expect(song.title).toBe('내 노래');
    expect(song.bpm).toBe(100);
    expect(song.defaultStrokeId).toBe('pop');
    expect(song.measures).toHaveLength(4);
    expect(song.measures.every((m) => m.blocks.length === 0)).toBe(true);
  });

  it('addChordBlock places a block at the requested slot with the default 1-beat length', () => {
    act(() => {
      useSongStore.getState().createSong('곡');
    });
    const songId = firstSong().id;
    act(() => useSongStore.getState().addChordBlock(songId, 0, 'C-maj', 0));

    const blocks = firstSong().measures[0].blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ chordId: 'C-maj', startSlot: 0, lengthSlots: 2 });
  });

  it('addChordBlock snaps to the nearest free slot when the target overlaps', () => {
    act(() => {
      useSongStore.getState().createSong('곡');
    });
    const songId = firstSong().id;
    act(() => {
      useSongStore.getState().addChordBlock(songId, 0, 'C-maj', 0);
      useSongStore.getState().addChordBlock(songId, 0, 'G-maj', 0);
    });
    const blocks = firstSong().measures[0].blocks;
    expect(blocks).toHaveLength(2);
    expect(blocks[0].startSlot).not.toBe(blocks[1].startSlot);
  });

  it('addChordBlock does not auto-divide the measure between multiple chords (§6/§39)', () => {
    act(() => {
      useSongStore.getState().createSong('곡');
    });
    const songId = firstSong().id;
    act(() => {
      useSongStore.getState().addChordBlock(songId, 0, 'C-maj', 0);
      useSongStore.getState().addChordBlock(songId, 0, 'G-maj', 2);
      useSongStore.getState().addChordBlock(songId, 0, 'A-min', 4);
    });
    const blocks = firstSong().measures[0].blocks;
    expect(blocks.every((b) => b.lengthSlots === 2)).toBe(true);
  });

  it('resizeChordBlock changes length and clamps to available room', () => {
    act(() => {
      useSongStore.getState().createSong('곡');
    });
    const songId = firstSong().id;
    act(() => useSongStore.getState().addChordBlock(songId, 0, 'C-maj', 0));
    const blockId = firstSong().measures[0].blocks[0].id;

    act(() => useSongStore.getState().resizeChordBlock(songId, blockId, 6));
    expect(firstSong().measures[0].blocks[0].lengthSlots).toBe(6);

    act(() => useSongStore.getState().resizeChordBlock(songId, blockId, 999));
    expect(firstSong().measures[0].blocks[0].lengthSlots).toBe(SLOTS_PER_MEASURE);
  });

  it('moveChordBlock moves a block within the same measure', () => {
    act(() => {
      useSongStore.getState().createSong('곡');
    });
    const songId = firstSong().id;
    act(() => useSongStore.getState().addChordBlock(songId, 0, 'C-maj', 0));
    const blockId = firstSong().measures[0].blocks[0].id;

    act(() => useSongStore.getState().moveChordBlock(songId, blockId, 0, 4));
    expect(firstSong().measures[0].blocks[0].startSlot).toBe(4);
  });

  it('moveChordBlock moves a block to a different measure', () => {
    act(() => {
      useSongStore.getState().createSong('곡');
    });
    const songId = firstSong().id;
    act(() => useSongStore.getState().addChordBlock(songId, 0, 'C-maj', 0));
    const blockId = firstSong().measures[0].blocks[0].id;

    act(() => useSongStore.getState().moveChordBlock(songId, blockId, 1, 0));
    const song = firstSong();
    expect(song.measures[0].blocks).toHaveLength(0);
    expect(song.measures[1].blocks).toHaveLength(1);
    expect(song.measures[1].blocks[0].id).toBe(blockId);
  });

  it('moveChordBlock rejects a drop that would overlap another block (§7)', () => {
    act(() => {
      useSongStore.getState().createSong('곡');
    });
    const songId = firstSong().id;
    act(() => {
      useSongStore.getState().addChordBlock(songId, 0, 'C-maj', 0);
      useSongStore.getState().addChordBlock(songId, 0, 'G-maj', 6);
    });
    const movingId = firstSong().measures[0].blocks[0].id;

    // Target 6 is fully occupied by the G block (6-7); with nowhere adjacent
    // free in an otherwise packed measure it should still land somewhere
    // legal, never overlapping.
    act(() => useSongStore.getState().moveChordBlock(songId, movingId, 0, 6));
    const blocks = firstSong().measures[0].blocks;
    const [a, b] = blocks;
    const overlap = a.startSlot < b.startSlot + b.lengthSlots && b.startSlot < a.startSlot + a.lengthSlots;
    expect(overlap).toBe(false);
  });

  it('duplicateBlock places a copy right after the original', () => {
    act(() => {
      useSongStore.getState().createSong('곡');
    });
    const songId = firstSong().id;
    act(() => useSongStore.getState().addChordBlock(songId, 0, 'C-maj', 0));
    const blockId = firstSong().measures[0].blocks[0].id;

    act(() => useSongStore.getState().duplicateBlock(songId, blockId));
    const blocks = firstSong().measures[0].blocks;
    expect(blocks).toHaveLength(2);
    expect(blocks[1].chordId).toBe('C-maj');
    expect(blocks[1].startSlot).toBe(2);
  });

  it('deleteBlock removes only the targeted block', () => {
    act(() => {
      useSongStore.getState().createSong('곡');
    });
    const songId = firstSong().id;
    act(() => {
      useSongStore.getState().addChordBlock(songId, 0, 'C-maj', 0);
      useSongStore.getState().addChordBlock(songId, 0, 'G-maj', 2);
    });
    const [first, second] = firstSong().measures[0].blocks;

    act(() => useSongStore.getState().deleteBlock(songId, first.id));
    const blocks = firstSong().measures[0].blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0].id).toBe(second.id);
  });

  it('addMeasure appends an empty measure', () => {
    act(() => {
      useSongStore.getState().createSong('곡');
    });
    const songId = firstSong().id;
    act(() => useSongStore.getState().addMeasure(songId));
    expect(firstSong().measures).toHaveLength(5);
  });

  it('updateSongMeta patches fields independently (metronome/chord-sound toggles, §23)', () => {
    act(() => {
      useSongStore.getState().createSong('곡');
    });
    const songId = firstSong().id;
    act(() => useSongStore.getState().updateSongMeta(songId, { metronomeOn: false }));
    expect(firstSong().metronomeOn).toBe(false);
    expect(firstSong().chordSoundOn).toBe(true);
  });

  it('deleteSong removes it from the list', () => {
    let songId = '';
    act(() => {
      songId = useSongStore.getState().createSong('곡');
    });
    act(() => useSongStore.getState().deleteSong(songId));
    expect(useSongStore.getState().songs).toHaveLength(0);
  });
});
