import React, { useState } from 'react';
import { View, StyleSheet, Alert, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { useConfig } from '../lib/ConfigContext';
import { wakeFireTv, sleepFireTv } from '../lib/fireTv';
import { sendSamsungKey, SAMSUNG_KEYS } from '../lib/samsungLegacyRemote';
import { sendWakeOnLan } from '../lib/wol';
import { theme } from '../theme';
import type { RootStackParamList } from '../../App';
import type { AdbAuthState } from '../lib/adb/AdbClient';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const AUTH_STATE_LABEL: Record<AdbAuthState, string> = {
  connecting: 'Verbinde…',
  waiting_for_device_confirmation: 'Bitte auf dem Fire-TV-Bildschirm bestätigen…',
  authorized: 'Verbunden',
  failed: 'Fehlgeschlagen',
};

export function HomeScreen({ navigation }: Props) {
  const { config } = useConfig();
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setStatus(null);
    try {
      await fn();
    } catch (err: any) {
      Alert.alert('Fehler', err?.message ?? 'Unbekannter Fehler');
    } finally {
      setBusy(null);
      setStatus(null);
    }
  }

  const onAuthStateChange = (state: AdbAuthState) => setStatus(AUTH_STATE_LABEL[state]);

  const turnOnEverything = () =>
    run('on', async () => {
      await wakeFireTv(config.fireTvHost, config.fireTvPort, onAuthStateChange);
    });

  const tryDirectTvPower = () =>
    run('tv', async () => {
      if (config.tvMac) {
        try {
          await sendWakeOnLan(config.tvMac);
        } catch {
          // WOL ist best-effort
        }
      }
      await sendSamsungKey(SAMSUNG_KEYS.POWER, { tvIp: config.tvIp });
    });

  const sleepFireTvHandler = () =>
    run('sleep', async () => {
      await sleepFireTv(config.fireTvHost, config.fireTvPort, onAuthStateChange);
    });

  return (
    <Screen title="Übersicht" subtitle={config.tvName || 'Kein Gerät konfiguriert'}>
      <View style={styles.group}>
        <Button
          label="Alles einschalten (Fire TV → TV via CEC)"
          variant="primary"
          loading={busy === 'on'}
          onPress={turnOnEverything}
        />
        <Button
          label="Fire TV in Standby versetzen"
          loading={busy === 'sleep'}
          onPress={sleepFireTvHandler}
          style={styles.spaced}
        />
        <Button
          label="TV direkt schalten (Legacy-Protokoll)"
          loading={busy === 'tv'}
          onPress={tryDirectTvPower}
          style={styles.spaced}
        />
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </View>

      <View style={styles.group}>
        <Button label="Fernbedienung öffnen" onPress={() => navigation.navigate('Remote')} />
        <Button label="Browser" onPress={() => navigation.navigate('Browser')} style={styles.spaced} />
        <Button label="Einstellungen" onPress={() => navigation.navigate('Settings')} style={styles.spaced} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: theme.spacing(8) },
  spaced: { marginTop: theme.spacing(3) },
  status: { color: theme.colors.textMuted, fontSize: theme.font.sizeSm, marginTop: theme.spacing(3) },
});
