import TcpSocket from 'react-native-tcp-socket';
import { Buffer } from 'buffer';

/**
 * Implementierung des Samsung "Legacy Remote"-Protokolls (Port 55000),
 * verwendet von Samsung Smart TVs bis Baujahr ~2015/2016.
 *
 * Wichtig: Dieses Protokoll funktioniert nur, solange der Fernseher
 * bereits eingeschaltet ist oder sich im Netzwerk-Standby befindet
 * (im TV-Menü als "Netzwerk-Standby" / "IP Remote" aktivierbar).
 * Ein vollstaendig ausgeschaltetes Geraet reagiert auf diesem Weg nicht.
 *
 * Quelle des Protokoll-Layouts: wiki.samygo.tv (Reverse Engineering der
 * offiziellen Samsung Remote-Apps).
 */

export const SAMSUNG_KEYS = {
  POWER: 'KEY_POWER',
  VOL_UP: 'KEY_VOLUP',
  VOL_DOWN: 'KEY_VOLDOWN',
  MUTE: 'KEY_MUTE',
  HOME: 'KEY_HOME',
  SOURCE: 'KEY_SOURCE',
  HDMI: 'KEY_HDMI',
  MENU: 'KEY_MENU',
  RETURN: 'KEY_RETURN',
  ENTER: 'KEY_ENTER',
  UP: 'KEY_UP',
  DOWN: 'KEY_DOWN',
  LEFT: 'KEY_LEFT',
  RIGHT: 'KEY_RIGHT',
} as const;

export type SamsungKey = (typeof SAMSUNG_KEYS)[keyof typeof SAMSUNG_KEYS];

interface SamsungRemoteOptions {
  tvIp: string;
  hostIp?: string;
  hostMac?: string;
  hostName?: string;
  appString?: string;
  tvAppString?: string;
  port?: number;
  timeoutMs?: number;
}

function b64(str: string): string {
  return Buffer.from(str, 'utf8').toString('base64');
}

function u16le(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n, 0);
  return b;
}

function lengthPrefixedAscii(str: string): Buffer {
  return Buffer.concat([u16le(str.length), Buffer.from(str, 'ascii')]);
}

function buildAuthPacket(opts: Required<Pick<SamsungRemoteOptions,
  'hostIp' | 'hostMac' | 'hostName' | 'appString'>>): Buffer {
  const ipB64 = b64(opts.hostIp);
  const macB64 = b64(opts.hostMac);
  const nameB64 = b64(opts.hostName);

  const payload = Buffer.concat([
    Buffer.from([0x64, 0x00]),
    u16le(ipB64.length), Buffer.from(ipB64, 'ascii'),
    u16le(macB64.length), Buffer.from(macB64, 'ascii'),
    u16le(nameB64.length), Buffer.from(nameB64, 'ascii'),
  ]);

  return Buffer.concat([
    Buffer.from([0x00]),
    lengthPrefixedAscii(opts.appString),
    u16le(payload.length), payload,
  ]);
}

function buildCommandPacket(key: string, tvAppString: string): Buffer {
  const keyB64 = b64(key);

  const payload = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00]),
    u16le(keyB64.length), Buffer.from(keyB64, 'ascii'),
  ]);

  return Buffer.concat([
    Buffer.from([0x00]),
    lengthPrefixedAscii(tvAppString),
    u16le(payload.length), payload,
  ]);
}

/**
 * Sendet eine einzelne Taste an den Fernseher. Oeffnet fuer jeden Aufruf
 * eine neue kurze TCP-Verbindung (das Protokoll ist zustandslos genug
 * dafuer und das vereinfacht Fehlerbehandlung erheblich).
 */
export function sendSamsungKey(
  key: SamsungKey | string,
  options: SamsungRemoteOptions
): Promise<void> {
  const opts = {
    hostIp: options.hostIp ?? '0.0.0.0',
    hostMac: options.hostMac ?? '00:00:00:00:00:00',
    hostName: options.hostName ?? 'TV Remote App',
    appString: options.appString ?? 'iphone..iapp.samsung',
    tvAppString: options.tvAppString ?? 'iphone.SamsungTV.iapp.samsung',
    port: options.port ?? 55000,
    timeoutMs: options.timeoutMs ?? 4000,
  };

  return new Promise((resolve, reject) => {
    const socket = TcpSocket.createConnection(
      { host: options.tvIp, port: opts.port },
      () => {
        socket.write(buildAuthPacket(opts));
        // kurze Pause, damit die TV-Firmware die Auth verarbeiten kann,
        // bevor der eigentliche Tastendruck gesendet wird
        setTimeout(() => {
          socket.write(buildCommandPacket(key, opts.tvAppString));
          setTimeout(() => {
            socket.destroy();
            resolve();
          }, 150);
        }, 150);
      }
    );

    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('Zeitueberschreitung - TV antwortet nicht auf Port 55000'));
    }, opts.timeoutMs);

    socket.on('error', (err: Error) => {
      clearTimeout(timeout);
      reject(err);
    });

    socket.on('close', () => {
      clearTimeout(timeout);
    });
  });
}
