import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '../shared/app-context';
import { ThemeProvider, useTheme } from '../shared/components/theme';
function Navigation() {
  const theme = useTheme();
  return <><StatusBar style="auto" /><Stack screenOptions={{ headerStyle: { backgroundColor: theme.surface }, headerTintColor: theme.text, contentStyle: { backgroundColor: theme.background }, headerBackButtonDisplayMode: 'minimal' }}>
    <Stack.Screen name="index" options={{ title: 'DM Companion' }} />
    <Stack.Screen name="campaigns" options={{ title: 'Campanhas' }} />
    <Stack.Screen name="party" options={{ title: 'Grupo' }} />
    <Stack.Screen name="generator" options={{ title: 'Gerador' }} />
    <Stack.Screen name="result" options={{ title: 'Resultado' }} />
    <Stack.Screen name="history" options={{ title: 'Histórico' }} />
  </Stack></>;
}
export default function RootLayout() { return <SafeAreaProvider><ThemeProvider><AppProvider><Navigation /></AppProvider></ThemeProvider></SafeAreaProvider>; }
