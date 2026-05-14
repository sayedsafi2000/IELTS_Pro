const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

function getKey() {
  const raw = process.env.INTEGRATION_ENC_KEY;
  if (!raw) throw new Error('INTEGRATION_ENC_KEY env var is required for integration token encryption');
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) throw new Error('INTEGRATION_ENC_KEY must be 32 bytes (base64-encoded)');
  return buf;
}

function encrypt(plaintext) {
  if (plaintext == null) return null;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

function decrypt(payload) {
  if (!payload) return null;
  const parts = String(payload).split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('Invalid encrypted payload format');
  const key = getKey();
  const iv = Buffer.from(parts[1], 'base64');
  const tag = Buffer.from(parts[2], 'base64');
  const enc = Buffer.from(parts[3], 'base64');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}

module.exports = { encrypt, decrypt };
