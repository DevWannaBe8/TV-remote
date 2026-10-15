/**
 * Reine BigInt-Arithmetik fuer die manuellen RSA-Rohoperationen, die ADBs
 * Authentifizierung braucht (Android verwendet ein eigenes Public-Key-
 * Binaerformat sowie eine "rohe" PKCS#1-v1.5-Signatur ohne die normale
 * Doppel-Hashing-Logik von WebCrypto/Node-Crypto - deshalb kommt hier
 * bewusst keine High-Level-Sign-Funktion einer Bibliothek zum Einsatz,
 * sondern die Mathematik direkt.
 */

export function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod === 1n) return 0n;
  let result = 1n;
  let b = base % mod;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod;
    e >>= 1n;
    b = (b * b) % mod;
  }
  return result;
}

/** Erweiterter euklidischer Algorithmus fuer das modulare Inverse. */
export function modInverse(a: bigint, m: bigint): bigint {
  let [oldR, r] = [((a % m) + m) % m, m];
  let [oldS, s] = [1n, 0n];
  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  return ((oldS % m) + m) % m;
}

export function bigIntToBytesBE(value: bigint, length: number): Uint8Array {
  const out = new Uint8Array(length);
  let v = value;
  for (let i = length - 1; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

export function bigIntToBytesLE(value: bigint, length: number): Uint8Array {
  return bigIntToBytesBE(value, length).reverse();
}

export function bytesToBigIntBE(bytes: Uint8Array): bigint {
  let v = 0n;
  for (let i = 0; i < bytes.length; i++) v = (v << 8n) | BigInt(bytes[i]);
  return v;
}

export function hexToBigInt(hex: string): bigint {
  const clean = hex.replace(/^0x/i, '');
  return BigInt('0x' + (clean.length % 2 ? '0' + clean : clean));
}
