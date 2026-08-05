import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SettingsState {
  /** Mirrors chord diagrams horizontally (nut on the right) for left-handed players. */
  leftHanded: boolean;
  toggleLeftHanded: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      leftHanded: false,
      toggleLeftHanded: () => set((state) => ({ leftHanded: !state.leftHanded })),
    }),
    {
      name: 'uketile-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
