/**
 * Client-side encryption for backup data
 * Uses Web Crypto API for AES-GCM encryption
 * Key is derived from user password/secret using PBKDF2
 */

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;
const ITERATIONS = 100000;

/**
 * Derive encryption key from user password
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive actual encryption key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data with password
 * @param data - Plain text data to encrypt
 * @param password - User password/secret
 * @returns Base64 encoded encrypted data with salt and IV
 */
export async function encryptData(data: string, password: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Derive key
    const key = await deriveKey(password, salt);

    // Encrypt
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      dataBuffer
    );

    // Combine salt + iv + encrypted data
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const combined = new Uint8Array(SALT_LENGTH + IV_LENGTH + encryptedArray.length);
    combined.set(salt, 0);
    combined.set(iv, SALT_LENGTH);
    combined.set(encryptedArray, SALT_LENGTH + IV_LENGTH);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data with password
 * @param encryptedData - Base64 encoded encrypted data
 * @param password - User password/secret
 * @returns Decrypted plain text
 */
export async function decryptData(encryptedData: string, password: string): Promise<string> {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // Extract salt, IV, and encrypted data
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const encryptedBuffer = combined.slice(SALT_LENGTH + IV_LENGTH);

    // Derive key
    const key = await deriveKey(password, salt);

    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encryptedBuffer
    );

    // Convert to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data. Wrong password?');
  }
}

/**
 * Hash password for storage/comparison
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a secure random encryption key for first-time users
 */
export function generateSecureKey(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Compress data before encryption (optional, for large backups)
 */
export async function compressData(data: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  // Use CompressionStream if available
  if ('CompressionStream' in window) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(dataBuffer);
        controller.close();
      },
    });

    const compressedStream = stream.pipeThrough(
      new (window as any).CompressionStream('gzip')
    );

    const reader = compressedStream.getReader();
    const chunks: Uint8Array[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value as Uint8Array);
    }

    // Combine chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
  
  // Fallback: return uncompressed
  return dataBuffer;
}

/**
 * Decompress data after decryption (optional)
 */
export async function decompressData(compressedData: Uint8Array): Promise<string> {
  // Use DecompressionStream if available
  if ('DecompressionStream' in window) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(compressedData);
        controller.close();
      },
    });

    const decompressedStream = stream.pipeThrough(
      new (window as any).DecompressionStream('gzip')
    );

    const reader = decompressedStream.getReader();
    const chunks: Uint8Array[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value as Uint8Array);
    }

    // Combine chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    const decoder = new TextDecoder();
    return decoder.decode(result);
  }

  // Fallback: assume uncompressed
  const decoder = new TextDecoder();
  return decoder.decode(compressedData);
}
