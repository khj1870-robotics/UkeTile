import { render } from '@testing-library/react-native';
import React from 'react';

import { ChordDiagram } from '@/components/ChordDiagram';
import { getChord } from '@/data/chords';

describe('ChordDiagram', () => {
  it('renders a diagram for a known chord', () => {
    const chord = getChord('C')!;
    const { getByTestId } = render(<ChordDiagram chord={chord} width={60} />);
    expect(getByTestId('chord-diagram-C')).toBeTruthy();
  });

  it('renders without crashing for every chord in the library', () => {
    const { CHORDS } = require('@/data/chords');
    for (const chord of CHORDS) {
      const { unmount } = render(<ChordDiagram chord={chord} width={60} />);
      unmount();
    }
  });
});
