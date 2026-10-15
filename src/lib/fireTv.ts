import { AdbClient, AdbAuthState } from './adb/AdbClient';

export const FIRE_TV_KEYS = {
  POWER: 26,
  WAKE: 224,
  SLEEP: 223,
  HOME: 3,
  BACK: 4,
  UP: 19,
  DOWN: 20,
  LEFT: 21,
  RIGHT: 22,
  SELECT: 23,
  MENU: 82,
  PLAY_PAUSE: 85,
  VOLUME_UP: 24,
  VOLUME_DOWN: 25,
  MUTE: 164,
} as const;

const SILK_BROWSER_PACKAGE = 'com.amazon.cloud9';

/**
 * Baut für jeden Befehl eine frische, kurzlebige ADB-Verbindung auf statt
 * eine alte wiederzuverwenden. Grund: Über eine portweitergeleitete
 * Internetverbindung (Router-NAT, ggf. Mobilfunknetz) werden Leerlauf-
 * Verbindungen häufig nach kurzer Zeit stillschweigend vom Netzwerk
 * gekappt, ohne dass die App das sofort merkt - eine wiederverwendete,
 * inzwischen tote Verbindung würde Befehle sonst kommentarlos verschlucken.
 * Da der Schlüssel nach der ersten Kopplung bereits autorisiert ist, geht
 * der erneute Verbindungsaufbau ohne erneute Bestätigung auf dem TV.
 */
async function withClient<T>(
  host: string,
  port: number,
  onAuthStateChange: ((state: AdbAuthState) => void) | undefined,
  fn: (client: AdbClient) => Promise<T>
): Promise<T> {
  if (!host) throw new Error('Fire TV Adresse ist nicht konfiguriert (siehe Einstellungen)');
  if (!port) throw new Error('Fire TV Port ist nicht konfiguriert (siehe Einstellungen)');

  const client = await AdbClient.connect({ host, port, onAuthStateChange });
  try {
    return await fn(client);
  } finally {
    client.close();
  }
}

export async function sendFireTvKey(
  host: string,
  port: number,
  keycode: number,
  onAuthStateChange?: (state: AdbAuthState) => void
) {
  await withClient(host, port, onAuthStateChange, (client) => client.shell(`input keyevent ${keycode}`));
}

export async function wakeFireTv(host: string, port: number, onAuthStateChange?: (state: AdbAuthState) => void) {
  return sendFireTvKey(host, port, FIRE_TV_KEYS.WAKE, onAuthStateChange);
}

export async function sleepFireTv(host: string, port: number, onAuthStateChange?: (state: AdbAuthState) => void) {
  return sendFireTvKey(host, port, FIRE_TV_KEYS.SLEEP, onAuthStateChange);
}

export async function openBrowserUrl(
  host: string,
  port: number,
  url: string,
  onAuthStateChange?: (state: AdbAuthState) => void
) {
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const escaped = normalized.replace(/"/g, '\\"');
  await withClient(host, port, onAuthStateChange, (client) =>
    client.shell(`am start -a android.intent.action.VIEW -d "${escaped}" ${SILK_BROWSER_PACKAGE}`)
  );
}
