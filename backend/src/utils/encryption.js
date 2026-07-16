/**
 * Encryption utility — AES-256-GCM symmetric encryption.
 *
 * Used to store sensitive third-party OAuth tokens at rest.
 * The key is read from ENCRYPTION_KEY (32-byte hex string = 64 hex chars).
 * A random 12-byte IV is prepended to every ciphertext so the same plaintext
 * never produces the same ciphertext twice.
 *
 * Wire format: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */

import crypto from 'crypto';
import config from '../config/index.js';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;   // 96-bit IV — GCM recommended length
const TAG_BYTES = 16;  // 128-bit authentication tag

function getKey() {
  const hex = config.encryption.key;
  if (!hex || hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a plaintext string.
 * @param {string} plaintext
 * @returns {string}  "<iv>:<tag>:<ciphertext>" — all hex-encoded
 */
export function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined) return null;
  const key = getKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a ciphertext string produced by encrypt().
 * @param {string} ciphertext  "<iv>:<tag>:<ciphertext>"
 * @returns {string}  original plaintext
 */
export function decrypt(ciphertext) {
  if (ciphertext === null || ciphertext === undefined) return null;
  const key = getKey();
  const [ivHex, tagHex, dataHex] = ciphertext.split(':');
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error('Invalid ciphertext format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
