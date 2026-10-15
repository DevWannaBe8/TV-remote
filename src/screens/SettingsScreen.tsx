import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, Alert } from 'react-native';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { useConfig } from '../lib/ConfigContext';
import { wakeFireTv } from '../lib/fireTv';
import { resetAdbKeyPair } from '../lib/adb/keystore';
import { theme } from '../theme';

function Field({
  label, value, onChangeText, placeholder, keyboardType,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: 'default' | 'url' | 'numeric';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

export function SettingsScreen() {
  const { config, update } = useConfig();
  const [testing, setTesting] = useState(false);
  const [detecting, setDetecting] = useState(false);

  async function detectPublicIp() {
    setDetecting(true);
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      if (data?.ip) {
        await update({ fireTvHost: data.ip });
        Alert.alert(
          'Übernommen',
          `Aktuelle öffentliche IP (${data.ip}) eingetragen. Wichtig: Dafür musst du gerade im Heim-WLAN sein - sonst wird die IP deines aktuellen Netzwerks übernommen, nicht die deines Zuhauses. Falls dein Anschluss eine dynamische IP hat, ändert sie sich außerdem wieder - dann besser einen DynDNS-Hostnamen statt der reinen IP eintragen.`
        );
      }
    } catch (err: any) {
      Alert.alert('Fehler', 'Öffentliche IP konnte nicht ermittelt werden.');
    } finally {
      setDetecting(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    try {
      await wakeFireTv(config.fireTvHost, config.fireTvPort, (state) => {
        if (state === 'waiting_for_device_confirmation') {
          Alert.alert(
            'Bestätigung nötig',
            'Bitte auf dem Fire-TV-Bildschirm die Anfrage "USB-Debugging erlauben?" bestätigen. Am besten dauerhaft erlauben, damit das nur einmal nötig ist.'
          );
        }
      });
      Alert.alert('Erfolg', 'Verbindung zum Fire TV hergestellt und autorisiert.');
    } catch (err: any) {
      Alert.alert('Fehler', err?.message ?? 'Verbindung fehlgeschlagen');
    } finally {
      setTesting(false);
    }
  }

  async function resetKey() {
    Alert.alert(
      'Schlüssel zurücksetzen',
      'Der Fire TV muss danach erneut bestätigt werden. Fortfahren?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Zurücksetzen',
          style: 'destructive',
          onPress: async () => {
            await resetAdbKeyPair();
            Alert.alert('Erledigt', 'Neuer Schlüssel wurde erzeugt.');
          },
        },
      ]
    );
  }

  return (
    <Screen title="Einstellungen" subtitle="Geräte- und Netzwerkkonfiguration">
      <Field
        label="Fire TV Adresse (Heim-IP oder DynDNS-Hostname)"
        value={config.fireTvHost}
        onChangeText={(v) => update({ fireTvHost: v })}
        placeholder="meine-domain.example.com"
        keyboardType="url"
      />
      <Button
        label="Aktuelle öffentliche IP übernehmen"
        loading={detecting}
        onPress={detectPublicIp}
        style={styles.testButton}
      />
      <Field
        label="Fire TV Port (extern weitergeleiteter Port am Router)"
        value={String(config.fireTvPort)}
        onChangeText={(v) => update({ fireTvPort: parseInt(v, 10) || 0 })}
        placeholder="58231"
        keyboardType="numeric"
      />
      <Button label="Verbindung testen" loading={testing} onPress={testConnection} style={styles.testButton} />
      <Button label="ADB-Schlüssel zurücksetzen" onPress={resetKey} style={styles.testButton} />

      <Field
        label="Samsung TV IP-Adresse"
        value={config.tvIp}
        onChangeText={(v) => update({ tvIp: v })}
        placeholder="192.168.1.42"
        keyboardType="url"
      />
      <Field
        label="Samsung TV MAC-Adresse (für Wake-on-LAN)"
        value={config.tvMac}
        onChangeText={(v) => update({ tvMac: v })}
        placeholder="AA:BB:CC:DD:EE:FF"
      />
      <Field
        label="Gerätename"
        value={config.tvName}
        onChangeText={(v) => update({ tvName: v })}
        placeholder="Wohnzimmer TV"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: theme.spacing(5) },
  label: {
    color: theme.colors.textMuted,
    fontSize: theme.font.sizeSm,
    marginBottom: theme.spacing(1),
  },
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
  testButton: { marginBottom: theme.spacing(4) },
});
