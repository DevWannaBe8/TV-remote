import React, { useState } from 'react';
import { View, StyleSheet, Alert, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { useConfig } from '../lib/ConfigContext';
import { sendFireTvKey, FIRE_TV_KEYS } from '../lib/fireTv';
import { theme } from '../theme';

export function RemoteScreen() {
  const { config } = useConfig();
  const [busy, setBusy] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function press(code: number) {
    setBusy(code);
    setStatus(null);
    try {
      await sendFireTvKey(config.fireTvHost, config.fireTvPort, code, (s) => setStatus(s));
    } catch (err: any) {
      Alert.alert('Fehler', err?.message ?? 'Befehl konnte nicht gesendet werden');
    } finally {
      setBusy(null);
      setStatus(null);
    }
  }

  const Key = ({ label, code, style }: { label: string; code: number; style?: object }) => (
    <Button
      label={label}
      onPress={() => press(code)}
      loading={busy === code}
      style={{ ...styles.key, ...style }}
    />
  );

  return (
    <Screen title="Fernbedienung" subtitle="Steuert den Fire TV Stick direkt">
      {status ? <Text style={styles.status}>{status}</Text> : null}
      <View style={styles.dpad}>
        <Key label="Menü" code={FIRE_TV_KEYS.MENU} />
        <View style={styles.dpadRow}>
          <View style={styles.dpadSpacer} />
          <Key label="↑" code={FIRE_TV_KEYS.UP} style={styles.dpadCenter} />
          <View style={styles.dpadSpacer} />
        </View>
        <View style={styles.dpadRow}>
          <Key label="←" code={FIRE_TV_KEYS.LEFT} style={styles.dpadCenter} />
          <Key label="OK" code={FIRE_TV_KEYS.SELECT} style={styles.dpadCenter} />
          <Key label="→" code={FIRE_TV_KEYS.RIGHT} style={styles.dpadCenter} />
        </View>
        <View style={styles.dpadRow}>
          <View style={styles.dpadSpacer} />
          <Key label="↓" code={FIRE_TV_KEYS.DOWN} style={styles.dpadCenter} />
          <View style={styles.dpadSpacer} />
        </View>
        <View style={styles.dpadRow}>
          <Key label="Zurück" code={FIRE_TV_KEYS.BACK} style={styles.half} />
          <Key label="Home" code={FIRE_TV_KEYS.HOME} style={styles.half} />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <Key label="Lauter" code={FIRE_TV_KEYS.VOLUME_UP} style={styles.half} />
          <Key label="Leiser" code={FIRE_TV_KEYS.VOLUME_DOWN} style={styles.half} />
        </View>
        <Key label="Stumm" code={FIRE_TV_KEYS.MUTE} style={styles.spaced} />
      </View>

      <View style={styles.section}>
        <Key label="Play / Pause" code={FIRE_TV_KEYS.PLAY_PAUSE} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dpad: { marginBottom: theme.spacing(8) },
  dpadRow: { flexDirection: 'row', marginTop: theme.spacing(2) },
  dpadSpacer: { flex: 1, marginHorizontal: theme.spacing(1) },
  dpadCenter: { flex: 1, marginHorizontal: theme.spacing(1) },
  key: { marginTop: 0 },
  section: { marginBottom: theme.spacing(6) },
  row: { flexDirection: 'row', gap: theme.spacing(2) as any },
  half: { flex: 1, marginHorizontal: theme.spacing(1) },
  spaced: { marginTop: theme.spacing(2) },
  status: { color: theme.colors.textMuted, fontSize: theme.font.sizeSm, marginBottom: theme.spacing(4) },
});
