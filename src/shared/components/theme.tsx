import { createContext, useContext } from 'react';
import type { PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
const dark = { background: '#121714', surface: '#1c241f', text: '#f3eedf', muted: '#b5bcb3', accent: '#e3c282', accentText: '#171c17', border: '#415046', danger: '#ffb4a7', notice: '#e3c282' };
const light = { background: '#f5f1e8', surface: '#fffdf7', text: '#202b24', muted: '#59645c', accent: '#6e4b13', accentText: '#fffdf7', border: '#abb5aa', danger: '#a52c23', notice: '#795115' };
const ThemeContext = createContext(dark);
export function ThemeProvider({ children }: PropsWithChildren) { const scheme = useColorScheme(); return <ThemeContext.Provider value={scheme === 'dark' ? dark : light}>{children}</ThemeContext.Provider>; }
export const useTheme = () => useContext(ThemeContext);
