// Browser-only crypto helpers for FinTrack encrypted vaults.
// Passwords and recovery codes never leave the browser.
(function () {
  const VERSION = 1;
  const ITERATIONS = 210000;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  function bytesToB64(bytes) {
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  function b64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function randomBytes(length) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  }

  function randomB64(length) {
    return bytesToB64(randomBytes(length));
  }

  function normalizeSecret(secret) {
    return String(secret || "").trim().replace(/\s+/g, " ");
  }

  function makeRecoveryCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = randomBytes(24);
    const chars = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
    return chars.match(/.{1,4}/g).join("-");
  }

  async function importAesKey(raw, usages) {
    const rawBytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
    return crypto.subtle.importKey("raw", rawBytes, "AES-GCM", false, usages);
  }

  async function deriveKey(secret, saltB64) {
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(normalizeSecret(secret)),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: b64ToBytes(saltB64),
        iterations: ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptJson(value, rawMasterKey) {
    const key = await importAesKey(rawMasterKey, ["encrypt"]);
    const iv = randomBytes(12);
    const payload = enc.encode(JSON.stringify(value));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, payload);
    return {
      iv: bytesToB64(iv),
      ciphertext: bytesToB64(new Uint8Array(ciphertext)),
    };
  }

  async function decryptJson(row, rawMasterKey) {
    const key = await importAesKey(rawMasterKey, ["decrypt"]);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64ToBytes(row.iv) },
      key,
      b64ToBytes(row.ciphertext)
    );
    return JSON.parse(dec.decode(plaintext));
  }

  async function wrapMasterKey(rawMasterKey, secret, saltB64) {
    const wrappingKey = await deriveKey(secret, saltB64);
    const iv = randomBytes(12);
    const wrapped = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, wrappingKey, rawMasterKey);
    return {
      iv: bytesToB64(iv),
      wrappedKey: bytesToB64(new Uint8Array(wrapped)),
    };
  }

  async function unwrapMasterKey(wrappedKeyB64, ivB64, secret, saltB64) {
    const wrappingKey = await deriveKey(secret, saltB64);
    const raw = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64ToBytes(ivB64) },
      wrappingKey,
      b64ToBytes(wrappedKeyB64)
    );
    return new Uint8Array(raw);
  }

  async function buildVaultRecord({ userId, state, vaultPassword, recoveryCode }) {
    const masterKey = randomBytes(32);
    const passwordSalt = randomB64(16);
    const recoverySalt = randomB64(16);
    const payload = await encryptJson(state, masterKey);
    const passwordWrap = await wrapMasterKey(masterKey, vaultPassword, passwordSalt);
    const recoveryWrap = await wrapMasterKey(masterKey, recoveryCode, recoverySalt);
    return {
      masterKey,
      record: {
        user_id: userId,
        version: VERSION,
        ciphertext: payload.ciphertext,
        iv: payload.iv,
        password_salt: passwordSalt,
        password_key_iv: passwordWrap.iv,
        password_wrapped_key: passwordWrap.wrappedKey,
        recovery_salt: recoverySalt,
        recovery_key_iv: recoveryWrap.iv,
        recovery_wrapped_key: recoveryWrap.wrappedKey,
      },
    };
  }

  async function unlockWithPassword(row, vaultPassword) {
    return unwrapMasterKey(
      row.password_wrapped_key,
      row.password_key_iv,
      vaultPassword,
      row.password_salt
    );
  }

  async function unlockWithRecovery(row, recoveryCode) {
    return unwrapMasterKey(
      row.recovery_wrapped_key,
      row.recovery_key_iv,
      recoveryCode,
      row.recovery_salt
    );
  }

  async function rotatePassword(row, masterKey, newPassword) {
    const passwordSalt = randomB64(16);
    const passwordWrap = await wrapMasterKey(masterKey, newPassword, passwordSalt);
    return {
      password_salt: passwordSalt,
      password_key_iv: passwordWrap.iv,
      password_wrapped_key: passwordWrap.wrappedKey,
    };
  }

  Object.assign(window, {
    FinTrackCryptoVault: {
      buildVaultRecord,
      decryptJson,
      encryptJson,
      makeRecoveryCode,
      rotatePassword,
      unlockWithPassword,
      unlockWithRecovery,
    },
  });
})();
