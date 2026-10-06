import { createContext, useContext } from 'react';
import { SharedValue } from 'react-native-reanimated';

export interface DrawerContextType {
  translateX: SharedValue<number>;
  width: number;
}

export const DrawerContext = createContext<DrawerContextType | null>(null);

export const useDrawerContext = () => useContext(DrawerContext);
