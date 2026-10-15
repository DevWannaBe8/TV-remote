import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

interface ScreenProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function Screen({ title, subtitle, children }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing(5), paddingBottom: theme.spacing(10) },
  header: { marginBottom: theme.spacing(6) },
  title: { color: theme.colors.text, fontSize: theme.font.sizeXl, fontWeight: '700' },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.font.sizeSm, marginTop: theme.spacing(1) },
});
