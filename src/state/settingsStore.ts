import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SettingsState {
  /** Mirrors chord diagrams horizontally (nut on the right) for left-handed players. */
  leftHanded: boolean;
  toggleLeftHanded: () => void;
  /** Whether tapping a tile plays its chord sound. */
  soundEnabled: boolean;
  toggleSound: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      leftHanded: false,
      toggleLeftHanded: () => set((state) => ({ leftHanded: !state.leftHanded })),
      soundEnabled: true,
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
    }),
    {
      name: 'uketile-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
