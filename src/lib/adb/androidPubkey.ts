import { Buffer } from 'buffer';
import { modPow, modInverse, bigIntToBytesLE } from './bigint';

/**
 * Android erwartet den oeffentlichen Schluessel beim AUTH-Handshake NICHT
 * im Standard-PEM/DER-Format, sondern in einem eigenen Binaerformat mit
 * vorab berechneten Montgomery-Parametern (fuer schnelle RSA-Verifikation
 * auf dem Geraet). Diese Implementierung folgt exakt dem verifizierten
 * AOSP-Referenzcode:
 * https://github.com/aosp-mirror/platform_system_core/blob/c55fab4a59cfa461857c6a61d8a0f1ae4591900c/libcrypto_utils/android_pubkey.c
 *
 * struct RSAPublicKey {
 *   uint32_t modulus_size_words; // = 64 (2048 Bit / 32)
 *   uint32_t n0inv;              // -1 / n[0] mod 2^32
 *   uint8_t modulus[256];        // little-endian
 *   uint8_t rr[256];             // (2^2048)^2 mod n, little-endian
 *   uint32_t exponent;           // ueblicherweise 65537
 * }
 */

const MODULUS_SIZE_BYTES = 256; // 2048-Bit-Schluessel
const MODULUS_SIZE_WORDS = MODULUS_SIZE_BYTES / 4; // 64

export function encodeAndroidPublicKey(n: bigint, e: bigint, comment: string): string {
  const r32 = 1n << 32n;
  const nMod = n % r32;
  const n0inv = (r32 - modInverse(nMod, r32)) % r32;

  // rr = (2^(modulus_size*8))^2 mod n = 2^(2 * modulus_size*8) mod n
  const rr = modPow(2n, BigInt(MODULUS_SIZE_BYTES * 8 * 2), n);

  const buf = Buffer.alloc(4 + 4 + MODULUS_SIZE_BYTES + MODULUS_SIZE_BYTES + 4);
  let offset = 0;
  buf.writeUInt32LE(MODULUS_SIZE_WORDS, offset); offset += 4;
  buf.writeUInt32LE(Number(n0inv & 0xffffffffn), offset); offset += 4;
  Buffer.from(bigIntToBytesLE(n, MODULUS_SIZE_BYTES)).copy(buf, offset); offset += MODULUS_SIZE_BYTES;
  Buffer.from(bigIntToBytesLE(rr, MODULUS_SIZE_BYTES)).copy(buf, offset); offset += MODULUS_SIZE_BYTES;
  buf.writeUInt32LE(Number(e & 0xffffffffn), offset);

  return buf.toString('base64') + ' ' + comment;
}
