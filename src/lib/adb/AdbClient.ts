import TcpSocket from 'react-native-tcp-socket';
import { Buffer } from 'buffer';
import { CMD, AUTH_TYPE, A_VERSION, A_MAXDATA, encodePacket, tryDecodePacket, AdbPacket } from './protocol';
import { loadOrCreateAdbKeyPair, signAdbToken, AdbKeyPair } from './keystore';

export type AdbAuthState = 'connecting' | 'waiting_for_device_confirmation' | 'authorized' | 'failed' | 'retrying';

interface ConnectOptions {
  host: string;
  port: number;
  timeoutMs?: number;
  onAuthStateChange?: (state: AdbAuthState, info?: { attempt: number; maxAttempts: number }) => void;
}

/**
 * Minimaler ADB-Client fuer genau die Befehle, die diese App braucht:
 * Tasten senden (input keyevent) und den Browser mit einer URL oeffnen
 * (am start). Implementiert das noetige Subset des ADB-Protokolls direkt
 * ueber TCP-Sockets, ohne auf den lokalen adb-Server angewiesen zu sein.
 */
export class AdbClient {
  private socket: ReturnType<typeof TcpSocket.createConnection> | null = null;
  private buffer: Buffer = Buffer.alloc(0);
  private nextLocalId = 1;
  private pendingPacketWaiters: Array<(pkt: AdbPacket) => boolean> = [];

  private constructor(private key: AdbKeyPair) {}

  static async connect(opts: ConnectOptions): Promise<AdbClient> {
    const key = await loadOrCreateAdbKeyPair();
    const client = new AdbClient(key);
    await client.open(opts);
    return client;
  }

  private open(opts: ConnectOptions): Promise<void> {
    const timeoutMs = opts.timeoutMs ?? 20000;
    opts.onAuthStateChange?.('connecting');

    return new Promise((resolve, reject) => {
      let settled = false;
      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        opts.onAuthStateChange?.('failed');
        clearTimeout(timer);
        reject(err);
      };
      const succeed = () => {
        if (settled) return;
        settled = true;
        opts.onAuthStateChange?.('authorized');
        clearTimeout(timer);
        resolve();
      };

      const timer = setTimeout(() => {
        fail(new Error(
          'Zeitüberschreitung. Falls das der allererste Verbindungsversuch ist: ' +
          'am Fire TV muss die "USB-Debugging erlauben?"-Anfrage auf dem Bildschirm bestätigt werden.'
        ));
      }, timeoutMs);

      this.socket = TcpSocket.createConnection({ host: opts.host, port: opts.port }, () => {
        this.sendPacket({
          command: CMD.CNXN,
          arg0: A_VERSION,
          arg1: A_MAXDATA,
          data: Buffer.from('host::tvremote\0', 'ascii'),
        });
      });

      let authAttempted = false;

      this.socket.on('data', (chunk: Buffer | string) => {
        const buf = typeof chunk === 'string' ? Buffer.from(chunk, 'base64') : chunk;
        this.buffer = Buffer.concat([this.buffer, buf]);

        for (;;) {
          const result = tryDecodePacket(this.buffer);
          if (!result) break;
          this.buffer = result.rest;
          const pkt = result.packet;

          if (pkt.command === CMD.CNXN) {
            succeed();
            continue;
          }

          if (pkt.command === CMD.AUTH) {
            if (pkt.arg0 !== AUTH_TYPE.TOKEN) continue;

            if (!authAttempted) {
              authAttempted = true;
              const signature = signAdbToken(pkt.data, this.key);
              this.sendPacket({ command: CMD.AUTH, arg0: AUTH_TYPE.SIGNATURE, arg1: 0, data: Buffer.from(signature) });
            } else {
              opts.onAuthStateChange?.('waiting_for_device_confirmation');
              const pubKeyPayload = Buffer.from(this.key.publicKeyAndroid + '\0', 'utf8');
              this.sendPacket({ command: CMD.AUTH, arg0: AUTH_TYPE.RSAPUBLICKEY, arg1: 0, data: pubKeyPayload });
            }
            continue;
          }

          this.dispatchToWaiters(pkt);
        }
      });

      this.socket.on('error', (err: Error) => fail(err));
      this.socket.on('close', () => {
        if (!settled) fail(new Error('Verbindung wurde geschlossen, bevor die Authentifizierung abgeschlossen war'));
      });
    });
  }

  private dispatchToWaiters(pkt: AdbPacket) {
    this.pendingPacketWaiters = this.pendingPacketWaiters.filter((waiter) => !waiter(pkt));
  }

  private sendPacket(pkt: AdbPacket) {
    this.socket?.write(encodePacket(pkt));
  }

  /**
   * Fuehrt einen Shell-Befehl aus und wartet, bis das Geraet den Stream
   * selbst schliesst (= Befehl fertig ausgefuehrt). Vorherige Version hat
   * direkt nach der Bestaetigung des Stream-Aufbaus selbst geschlossen -
   * das hat den Befehl auf dem Geraet oft abgewuergt, bevor er ausgefuehrt
   * wurde. Zwischen-Datenpakete (WRTE) werden quittiert, damit der
   * geraeteseitige Datenfluss nicht blockiert.
   */
  async shell(command: string, timeoutMs = 15000): Promise<void> {
    const localId = this.nextLocalId++;
    const openData = Buffer.from(`shell:${command}\0`, 'utf8');
    this.sendPacket({ command: CMD.OPEN, arg0: localId, arg1: 0, data: openData });

    let remoteId: number | null = null;

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingPacketWaiters = this.pendingPacketWaiters.filter((w) => w !== waiter);
        reject(new Error(`Zeitüberschreitung beim Ausführen des Befehls: ${command}`));
      }, timeoutMs);

      const waiter = (pkt: AdbPacket): boolean => {
        if (pkt.command === CMD.OKAY && pkt.arg1 === localId) {
          if (remoteId === null) remoteId = pkt.arg0;
          return false; // Stream offen, weiter auf Ausfuehrung/Abschluss warten
        }

        if (remoteId === null) return false; // Pakete ohne bekannten remoteId ignorieren

        if (pkt.command === CMD.WRTE && pkt.arg0 === remoteId && pkt.arg1 === localId) {
          // Empfang bestaetigen, sonst blockiert der geraeteseitige Fluss
          this.sendPacket({ command: CMD.OKAY, arg0: localId, arg1: remoteId, data: Buffer.alloc(0) });
          return false;
        }

        if (pkt.command === CMD.CLSE && pkt.arg0 === remoteId && pkt.arg1 === localId) {
          clearTimeout(timer);
          // Hoeflich unsererseits ebenfalls schliessen
          this.sendPacket({ command: CMD.CLSE, arg0: localId, arg1: remoteId, data: Buffer.alloc(0) });
          resolve();
          return true;
        }

        return false;
      };

      this.pendingPacketWaiters.push(waiter);
    });
  }

  close() {
    this.socket?.destroy();
    this.socket = null;
  }
}
