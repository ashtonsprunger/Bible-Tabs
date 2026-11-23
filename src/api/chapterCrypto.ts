/**
 * RFC 8439 ChaCha20 stream cipher for encrypting locally cached licensed
 * Scripture chapters on mobile devices (Biblica Content License §V.E).
 * Pure TypeScript so no additional native binary rebuild is required.
 */

const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += BASE64_CHARS[b0 >> 2];
    out += BASE64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? BASE64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] : "=";
    out += i + 2 < bytes.length ? BASE64_CHARS[b2 & 63] : "=";
  }
  return out;
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, "");
  const pad = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  const byteLen = Math.floor((clean.length * 3) / 4) - pad;
  const out = new Uint8Array(Math.max(0, byteLen));
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = BASE64_CHARS.indexOf(clean[i]);
    const c1 = BASE64_CHARS.indexOf(clean[i + 1]);
    const c2 = clean[i + 2] === "=" ? 0 : BASE64_CHARS.indexOf(clean[i + 2]);
    const c3 = clean[i + 3] === "=" ? 0 : BASE64_CHARS.indexOf(clean[i + 3]);
    if (p < out.length) out[p++] = (c0 << 2) | (c1 >> 4);
    if (p < out.length) out[p++] = ((c1 & 15) << 4) | (c2 >> 2);
    if (p < out.length) out[p++] = ((c2 & 3) << 6) | c3;
  }
  return out;
}

function utf8Encode(str: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(str);
  }
  const encoded = unescape(encodeURIComponent(str));
  const out = new Uint8Array(encoded.length);
  for (let i = 0; i < encoded.length; i++) {
    out[i] = encoded.charCodeAt(i);
  }
  return out;
}

function utf8Decode(bytes: Uint8Array): string {
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder().decode(bytes);
  }
  let raw = "";
  for (let i = 0; i < bytes.length; i++) {
    raw += String.fromCharCode(bytes[i]);
  }
  return decodeURIComponent(escape(raw));
}

export function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  const cryptoObj = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
    return bytes;
  }
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

export function generateRandomHex(byteLength: number): string {
  const bytes = generateRandomBytes(byteLength);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

function rotl32(v: number, n: number): number {
  return ((v << n) | (v >>> (32 - n))) >>> 0;
}

function quarterRound(s: Uint32Array, a: number, b: number, c: number, d: number): void {
  s[a] = (s[a] + s[b]) >>> 0;
  s[d] = rotl32(s[d] ^ s[a], 16);
  s[c] = (s[c] + s[d]) >>> 0;
  s[b] = rotl32(s[b] ^ s[c], 12);
  s[a] = (s[a] + s[b]) >>> 0;
  s[d] = rotl32(s[d] ^ s[a], 8);
  s[c] = (s[c] + s[d]) >>> 0;
  s[b] = rotl32(s[b] ^ s[c], 7);
}

function readU32LE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

function chacha20Block(key: Uint8Array, counter: number, nonce: Uint8Array): Uint8Array {
  const state = new Uint32Array(16);
  state[0] = 0x61707865;
  state[1] = 0x3320646e;
  state[2] = 0x79622d32;
  state[3] = 0x6b206574;
  for (let i = 0; i < 8; i++) {
    state[4 + i] = readU32LE(key, i * 4);
  }
  state[12] = counter >>> 0;
  state[13] = readU32LE(nonce, 0);
  state[14] = readU32LE(nonce, 4);
  state[15] = readU32LE(nonce, 8);

  const working = new Uint32Array(state);
  for (let i = 0; i < 10; i++) {
    quarterRound(working, 0, 4, 8, 12);
    quarterRound(working, 1, 5, 9, 13);
    quarterRound(working, 2, 6, 10, 14);
    quarterRound(working, 3, 7, 11, 15);
    quarterRound(working, 0, 5, 10, 15);
    quarterRound(working, 1, 6, 11, 12);
    quarterRound(working, 2, 7, 8, 13);
    quarterRound(working, 3, 4, 9, 14);
  }

  const out = new Uint8Array(64);
  for (let i = 0; i < 16; i++) {
    const word = (working[i] + state[i]) >>> 0;
    out[i * 4] = word & 0xff;
    out[i * 4 + 1] = (word >>> 8) & 0xff;
    out[i * 4 + 2] = (word >>> 16) & 0xff;
    out[i * 4 + 3] = (word >>> 24) & 0xff;
  }
  return out;
}

function chacha20Xor(key: Uint8Array, nonce: Uint8Array, input: Uint8Array): Uint8Array {
  const out = new Uint8Array(input.length);
  let counter = 1;
  for (let offset = 0; offset < input.length; offset += 64) {
    const block = chacha20Block(key, counter++, nonce);
    const len = Math.min(64, input.length - offset);
    for (let i = 0; i < len; i++) {
      out[offset + i] = input[offset + i] ^ block[i];
    }
  }
  return out;
}

export function generateKeyBase64(): string {
  return bytesToBase64(generateRandomBytes(32));
}

export function encryptString(plaintext: string, keyBase64: string): string {
  const key = base64ToBytes(keyBase64);
  if (key.length !== 32) {
    throw new Error("Invalid ChaCha20 key length");
  }
  const nonce = generateRandomBytes(12);
  const plainBytes = utf8Encode(plaintext);
  const cipherBytes = chacha20Xor(key, nonce, plainBytes);
  return `v1:${bytesToBase64(nonce)}:${bytesToBase64(cipherBytes)}`;
}

export function decryptString(encoded: string, keyBase64: string): string | null {
  try {
    const parts = encoded.split(":");
    if (parts.length !== 3 || parts[0] !== "v1") {
      return null;
    }
    const key = base64ToBytes(keyBase64);
    const nonce = base64ToBytes(parts[1]);
    const cipherBytes = base64ToBytes(parts[2]);
    if (key.length !== 32 || nonce.length !== 12) {
      return null;
    }
    const plainBytes = chacha20Xor(key, nonce, cipherBytes);
    return utf8Decode(plainBytes);
  } catch {
    return null;
  }
}
