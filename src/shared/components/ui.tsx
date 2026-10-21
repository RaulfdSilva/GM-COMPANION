import type { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './theme';
export function Copy({ children, muted = false }: PropsWithChildren<{ muted?: boolean }>) {
  const theme = useTheme();
  return (
    <Text style={{ color: muted ? theme.muted : theme.text, fontSize: 16, lineHeight: 24 }}>
      {children}
    </Text>
  );
}
export function Heading({ children }: PropsWithChildren) {
  const theme = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={{ color: theme.text, fontSize: 22, fontWeight: '700', marginBottom: 6 }}
    >
      {children}
    </Text>
  );
}
export function Card({ children }: PropsWithChildren) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {children}
    </View>
  );
}
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: secondary ? theme.surface : theme.accent,
          borderColor: theme.accent,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: secondary ? theme.text : theme.accentText,
          fontSize: 16,
          fontWeight: '700',
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Check({
  title,
  checked,
  onPress,
}: {
  title: string;
  checked: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={title}
      accessibilityState={{ checked }}
      onPress={onPress}
      style={[
        styles.choice,
        { borderColor: checked ? theme.accent : theme.border, backgroundColor: theme.surface },
      ]}
    >
      <Text style={{ color: theme.text, fontSize: 16 }}>
        {checked ? '☑' : '☐'} {title}
      </Text>
    </Pressable>
  );
}
export function Choices<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  options: readonly Readonly<{ value: T; label: string }>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.stack}>
      <Copy>{label}</Copy>
      <View style={styles.row}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: option.value === value, disabled }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={[
              styles.choice,
              {
                borderColor: option.value === value ? theme.accent : theme.border,
                backgroundColor: option.value === value ? theme.accent : theme.surface,
              },
            ]}
          >
            <Text
              style={{
                color: option.value === value ? theme.accentText : theme.text,
                fontSize: 16,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.stack}>
      <Copy>{label}</Copy>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={theme.muted}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border },
          props.multiline && { minHeight: 110, textAlignVertical: 'top' },
        ]}
      />
    </View>
  );
}
export function Notice({ children, error = false }: PropsWithChildren<{ error?: boolean }>) {
  const theme = useTheme();
  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ color: error ? theme.danger : theme.notice, fontSize: 15, lineHeight: 23 }}
    >
      {children}
    </Text>
  );
}
export function Page({
  title,
  children,
  loading = false,
}: PropsWithChildren<{ title: string; loading?: boolean }>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.page, { paddingBottom: Math.max(24, insets.bottom) + 24 }]}
    >
      <Text style={{ color: theme.accent, letterSpacing: 2, fontSize: 12, fontWeight: '700' }}>
        DM COMPANION • CADERNO DO MESTRE
      </Text>
      <Text
        accessibilityRole="header"
        style={{ color: theme.text, fontSize: 32, fontWeight: '700' }}
      >
        {title}
      </Text>
      {loading && <ActivityIndicator accessibilityLabel="Carregando" color={theme.accent} />}
      {children}
    </ScrollView>
  );
}
export const styles = StyleSheet.create({
  page: {
    padding: 20,
    paddingBottom: 60,
    gap: 18,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  card: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 12 },
  button: {
    minHeight: 48,
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  choice: {
    minHeight: 48,
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stack: { gap: 8 },
  input: { borderWidth: 1, borderRadius: 10, minHeight: 48, fontSize: 17, padding: 12 },
});
