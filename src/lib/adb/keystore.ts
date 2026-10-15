import forge from 'node-forge';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import { modPow, bytesToBigIntBE, bigIntToBytesBE, hexToBigInt } from './bigint';
import { encodeAndroidPublicKey } from './androidPubkey';

const STORAGE_KEY = 'tvremote.adbkey.v1';

// Standardisierter DER-Praefix fuer eine SHA-1-DigestInfo-Struktur
// (RFC 3447, Appendix B.1). Das ist KEIN ADB-spezifischer Wert, sondern
// die textbook PKCS#1-Kodierung fuer SHA-1-Signaturen - identisch zu dem,
// was OpenSSLs RSA_sign(NID_sha1, ...) intern voranstellt.
const SHA1_DIGEST_INFO_PREFIX = Buffer.from(
  '3021300906052b0e03021a05000414',
  'hex'
);

export interface AdbKeyPair {
  n: bigint;
  e: bigint;
  d: bigint;
  publicKeyAndroid: string; // base64 + " comment", fertig fuer AUTH(RSAPUBLICKEY)
}

async function generateAndStore(): Promise<AdbKeyPair> {
  const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
  const n = hexToBigInt(keypair.publicKey.n.toString(16));
  const e = hexToBigInt(keypair.publicKey.e.toString(16));
  const d = hexToBigInt(keypair.privateKey.d.toString(16));

  const record = { n: n.toString(16), e: e.toString(16), d: d.toString(16) };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));

  const publicKeyAndroid = encodeAndroidPublicKey(n, e, 'tvremote@app');
  return { n, e, d, publicKeyAndroid };
}

export async function loadOrCreateAdbKeyPair(): Promise<AdbKeyPair> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return generateAndStore();

  try {
    const record = JSON.parse(raw) as { n: string; e: string; d: string };
    const n = hexToBigInt(record.n);
    const e = hexToBigInt(record.e);
    const d = hexToBigInt(record.d);
    const publicKeyAndroid = encodeAndroidPublicKey(n, e, 'tvremote@app');
    return { n, e, d, publicKeyAndroid };
  } catch {
    return generateAndStore();
  }
}

export async function resetAdbKeyPair(): Promise<AdbKeyPair> {
  await AsyncStorage.removeItem(STORAGE_KEY);
  return generateAndStore();
}

/**
 * Signiert den 20-Byte-Token, den der Fire TV im AUTH(TOKEN,...)-Paket
 * schickt. Android behandelt diesen Token als bereits fertigen SHA-1-Hash
 * (siehe AOSP adb_auth_host.cpp: RSA_sign(NID_sha1, token, ...)) - wir
 * bauen daher die PKCS#1-v1.5-Polsterung inkl. SHA1-DigestInfo-Praefix
 * manuell und wenden die rohe RSA-Privatschluessel-Operation an, statt
 * eine High-Level-"Sign"-Funktion zu nutzen, die den Token faelschlich
 * ein zweites Mal hashen wuerde.
 */
export function signAdbToken(token: Uint8Array, key: AdbKeyPair): Uint8Array {
  const keySizeBytes = 256; // 2048 Bit
  const digestInfo = Buffer.concat([SHA1_DIGEST_INFO_PREFIX, Buffer.from(token)]);

  const paddingLength = keySizeBytes - digestInfo.length - 3;
  if (paddingLength < 8) throw new Error('Token zu lang fuer PKCS#1-Polsterung');

  const em = Buffer.concat([
    Buffer.from([0x00, 0x01]),
    Buffer.alloc(paddingLength, 0xff),
    Buffer.from([0x00]),
    digestInfo,
  ]);

  const m = bytesToBigIntBE(em);
  const signature = modPow(m, key.d, key.n);
  return bigIntToBytesBE(signature, keySizeBytes);
}
