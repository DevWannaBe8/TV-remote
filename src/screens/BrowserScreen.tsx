import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Alert, FlatList, Text, Pressable } from 'react-native';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { useConfig } from '../lib/ConfigContext';
import { openBrowserUrl } from '../lib/fireTv';
import { theme } from '../theme';

export function BrowserScreen() {
  const { config, update } = useConfig();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  async function open(target: string) {
    if (!target.trim()) return;
    setBusy(true);
    try {
      await openBrowserUrl(config.fireTvHost, config.fireTvPort, target.trim());
    } catch (err: any) {
      Alert.alert('Fehler', err?.message ?? 'Seite konnte nicht geöffnet werden');
    } finally {
      setBusy(false);
    }
  }

  async function addFavorite() {
    if (!url.trim() || config.favoriteUrls.includes(url.trim())) return;
    await update({ favoriteUrls: [...config.favoriteUrls, url.trim()] });
  }

  async function removeFavorite(fav: string) {
    await update({ favoriteUrls: config.favoriteUrls.filter((f) => f !== fav) });
  }

  return (
    <Screen title="Browser" subtitle="Öffnet Webseiten im Fire TV Browser (Silk)">
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="z. B. youtube.com"
          placeholderTextColor={theme.colors.textMuted}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={() => open(url)}
        />
      </View>

      <View style={styles.actionRow}>
        <Button label="Öffnen" variant="primary" loading={busy} onPress={() => open(url)} style={styles.flex1} />
        <Button label="Merken" onPress={addFavorite} style={[styles.flex1, styles.marginLeft]} />
      </View>

      <Text style={styles.sectionTitle}>Favoriten</Text>
      <FlatList
        data={config.favoriteUrls}
        keyExtractor={(item) => item}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <View style={styles.favoriteRow}>
            <Pressable style={styles.favoriteButton} onPress={() => open(item)}>
              <Text style={styles.favoriteText}>{item}</Text>
            </Pressable>
            <Pressable onPress={() => removeFavorite(item)} style={styles.removeButton}>
              <Text style={styles.removeText}>Entfernen</Text>
            </Pressable>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  inputRow: { marginBottom: theme.spacing(3) },
  input: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(3),
    color: theme.colors.text,
    fontSize: theme.font.sizeMd,
  },
  actionRow: { flexDirection: 'row', marginBottom: theme.spacing(7) },
  flex1: { flex: 1 },
  marginLeft: { marginLeft: theme.spacing(2) },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: theme.font.sizeSm,
    fontWeight: '600',
    marginBottom: theme.spacing(2),
    textTransform: 'uppercase',
  },
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing(3),
    paddingHorizontal: theme.spacing(4),
  },
  favoriteButton: { flex: 1 },
  favoriteText: { color: theme.colors.text, fontSize: theme.font.sizeMd },
  removeButton: { paddingHorizontal: theme.spacing(2) },
  removeText: { color: theme.colors.danger, fontSize: theme.font.sizeSm },
  separator: { height: theme.spacing(2) },
});
