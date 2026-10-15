import dgram from 'react-native-udp';
import { Buffer } from 'buffer';

/**
 * Sendet ein Wake-on-LAN Magic Packet. Funktioniert nur, wenn das
 * Zielgeraet WOL im Netzwerk-Standby unterstuetzt und diese Option
 * im jeweiligen Geraetemenue aktiviert ist. Bei vielen 2014er
 * Samsung-TVs nennt sich die Option "Netzwerk-Standby".
 */
export function sendWakeOnLan(mac: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const macBytes = mac
      .split(/[:-]/)
      .map((h) => parseInt(h, 16));

    if (macBytes.length !== 6 || macBytes.some((b) => Number.isNaN(b))) {
      reject(new Error('Ungueltige MAC-Adresse'));
      return;
    }

    const magic = Buffer.concat([
      Buffer.from(Array(6).fill(0xff)),
      Buffer.from(Array(16).fill(macBytes).flat()),
    ]);

    const socket = dgram.createSocket('udp4');
    socket.once('error', (err: Error) => {
      socket.close();
      reject(err);
    });

    socket.bind(() => {
      socket.setBroadcast(true);
      socket.send(magic, 0, magic.length, 9, '255.255.255.255', (err: Error | null) => {
        socket.close();
        if (err) reject(err);
        else resolve();
      });
    });
  });
}
