import { act } from '@testing-library/react-native';

import { useSettingsStore } from '@/state/settingsStore';

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({ leftHanded: false });
  });

  it('defaults to right-handed', () => {
    expect(useSettingsStore.getState().leftHanded).toBe(false);
  });

  it('toggles left-handed mode on and off', () => {
    act(() => useSettingsStore.getState().toggleLeftHanded());
    expect(useSettingsStore.getState().leftHanded).toBe(true);
    act(() => useSettingsStore.getState().toggleLeftHanded());
    expect(useSettingsStore.getState().leftHanded).toBe(false);
  });
});
