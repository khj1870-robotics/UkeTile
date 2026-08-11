import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SettingsState {
  /** Mirrors chord diagrams horizontally (nut on the right) for left-handed players. */
  leftHanded: boolean;
  toggleLeftHanded: () => void;
  /** Whether performance mode plays a 4-beat count-in before starting (§24). */
  countInEnabled: boolean;
  toggleCountIn: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      leftHanded: false,
      toggleLeftHanded: () => set((state) => ({ leftHanded: !state.leftHanded })),
      countInEnabled: true,
      toggleCountIn: () => set((state) => ({ countInEnabled: !state.countInEnabled })),
    }),
    {
      name: 'uketile-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
