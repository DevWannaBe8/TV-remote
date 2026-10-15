import { Buffer } from 'buffer';

/**
 * Low-Level-Framing des ADB-"Local Transport"-Protokolls.
 * Referenz: AOSP system/core/adb/protocol.txt
 *
 * Jedes Paket besteht aus einem 24-Byte-Header (6 x uint32 little-endian)
 * gefolgt von optionalen Nutzdaten:
 *   command | arg0 | arg1 | data_length | data_checksum | magic
 * magic = command XOR 0xFFFFFFFF (dient als simple Plausibilitätsprüfung)
 *
 * Die Kommando-IDs werden bewusst aus den 4 ASCII-Zeichen berechnet statt
 * als Hex-Konstante hingeschrieben - das eliminiert jedes Risiko eines
 * Zahlendrehers beim Abtippen.
 */

export function commandId(fourCc: string): number {
  if (fourCc.length !== 4) throw new Error('Kommando muss genau 4 Zeichen haben');
  const b = Buffer.from(fourCc, 'ascii');
  return (b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)) >>> 0;
}

export const CMD = {
  SYNC: commandId('SYNC'),
  CNXN: commandId('CNXN'),
  OPEN: commandId('OPEN'),
  OKAY: commandId('OKAY'),
  CLSE: commandId('CLSE'),
  WRTE: commandId('WRTE'),
  AUTH: commandId('AUTH'),
};

export const AUTH_TYPE = {
  TOKEN: 1,
  SIGNATURE: 2,
  RSAPUBLICKEY: 3,
};

export const A_VERSION = 0x01000000;
export const A_MAXDATA = 256 * 1024;

export interface AdbPacket {
  command: number;
  arg0: number;
  arg1: number;
  data: Buffer;
}

function checksum(data: Buffer): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum = (sum + data[i]) >>> 0;
  return sum >>> 0;
}

export function encodePacket(pkt: AdbPacket): Buffer {
  const header = Buffer.alloc(24);
  header.writeUInt32LE(pkt.command >>> 0, 0);
  header.writeUInt32LE(pkt.arg0 >>> 0, 4);
  header.writeUInt32LE(pkt.arg1 >>> 0, 8);
  header.writeUInt32LE(pkt.data.length, 12);
  header.writeUInt32LE(checksum(pkt.data), 16);
  header.writeUInt32LE((pkt.command ^ 0xffffffff) >>> 0, 20);
  return Buffer.concat([header, pkt.data]);
}

export interface PacketDecoderResult {
  packet: AdbPacket;
  rest: Buffer;
}

/**
 * Versucht ein vollstaendiges Paket vom Anfang des Puffers zu lesen.
 * Gibt null zurueck, wenn noch nicht genug Bytes angekommen sind - der
 * Aufrufer muss dann auf weitere Daten warten und erneut versuchen.
 */
export function tryDecodePacket(buf: Buffer): PacketDecoderResult | null {
  if (buf.length < 24) return null;
  const command = buf.readUInt32LE(0);
  const arg0 = buf.readUInt32LE(4);
  const arg1 = buf.readUInt32LE(8);
  const length = buf.readUInt32LE(12);
  if (buf.length < 24 + length) return null;
  const data = buf.subarray(24, 24 + length);
  const rest = buf.subarray(24 + length);
  return { packet: { command, arg0, arg1, data: Buffer.from(data) }, rest: Buffer.from(rest) };
}

export function commandName(cmd: number): string {
  for (const [name, id] of Object.entries(CMD)) {
    if (id === cmd) return name;
  }
  return `0x${cmd.toString(16)}`;
}
