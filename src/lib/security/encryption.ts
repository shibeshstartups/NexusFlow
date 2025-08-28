import { webcrypto } from 'crypto';

// Encryption algorithms supported
export enum EncryptionAlgorithm {
  AES_256_GCM = 'AES-GCM',
  RSA_2048 = 'RSA-OAEP',
  CHACHA20_POLY1305 = 'ChaCha20-Poly1305',
  ECDH_P256 = 'ECDH',
}

// Data classification levels
export enum DataClassification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  TOP_SECRET = 'top_secret',
}

// Compliance standards
export enum ComplianceStandard {
  GDPR = 'gdpr',
  HIPAA = 'hipaa',
  SOX = 'sox',
  PCI_DSS = 'pci_dss',
  FISMA = 'fisma',
  FIPS_140_2 = 'fips_140_2',
}

export interface EncryptionResult {
  encryptedData: ArrayBuffer;
  iv: ArrayBuffer;
  authTag?: ArrayBuffer;
  algorithm: EncryptionAlgorithm;
  keyId: string;
  timestamp: number;
  classification: DataClassification;
  compliance: ComplianceStandard[];
}

export interface DecryptionOptions {
  keyId: string;
  algorithm: EncryptionAlgorithm;
  iv: ArrayBuffer;
  authTag?: ArrayBuffer;
}

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  keyId: string;
  algorithm: EncryptionAlgorithm;
  created: Date;
  expires?: Date;
}

export class EncryptionService {
  private static instance: EncryptionService;
  private keyCache = new Map<string, CryptoKey>();
  private keyPairs = new Map<string, KeyPair>();

  private constructor() {}

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Generate AES-256-GCM encryption key
   */
  public async generateAESKey(keyId: string): Promise<CryptoKey> {
    try {
      const key = await webcrypto.subtle.generateKey(
        {
          name: EncryptionAlgorithm.AES_256_GCM,
          length: 256,
        },
        true,
        ['encrypt', 'decrypt']
      );

      this.keyCache.set(keyId, key);
      return key;
    } catch (error) {
      throw new Error(`Failed to generate AES key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate RSA-2048 key pair for asymmetric encryption
   */
  public async generateRSAKeyPair(keyId: string): Promise<KeyPair> {
    try {
      const keyPair = await webcrypto.subtle.generateKey(
        {
          name: EncryptionAlgorithm.RSA_2048,
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
      );

      const keyPairInfo: KeyPair = {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        keyId,
        algorithm: EncryptionAlgorithm.RSA_2048,
        created: new Date(),
      };

      this.keyPairs.set(keyId, keyPairInfo);
      return keyPairInfo;
    } catch (error) {
      throw new Error(`Failed to generate RSA key pair: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate ECDH P-256 key pair for key exchange
   */
  public async generateECDHKeyPair(keyId: string): Promise<KeyPair> {
    try {
      const keyPair = await webcrypto.subtle.generateKey(
        {
          name: EncryptionAlgorithm.ECDH_P256,
          namedCurve: 'P-256',
        },
        true,
        ['deriveKey']
      );

      const keyPairInfo: KeyPair = {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        keyId,
        algorithm: EncryptionAlgorithm.ECDH_P256,
        created: new Date(),
      };

      this.keyPairs.set(keyId, keyPairInfo);
      return keyPairInfo;
    } catch (error) {
      throw new Error(`Failed to generate ECDH key pair: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  public async encryptAES(
    data: ArrayBuffer,
    keyId: string,
    classification: DataClassification = DataClassification.INTERNAL,
    compliance: ComplianceStandard[] = []
  ): Promise<EncryptionResult> {
    try {
      let key = this.keyCache.get(keyId);
      if (!key) {
        key = await this.generateAESKey(keyId);
      }

      const iv = webcrypto.getRandomValues(new Uint8Array(12)); // GCM recommends 96-bit IV
      
      const encryptedData = await webcrypto.subtle.encrypt(
        {
          name: EncryptionAlgorithm.AES_256_GCM,
          iv: iv,
          tagLength: 128, // 128-bit authentication tag
        },
        key,
        data
      );

      return {
        encryptedData,
        iv: iv.buffer,
        algorithm: EncryptionAlgorithm.AES_256_GCM,
        keyId,
        timestamp: Date.now(),
        classification,
        compliance,
      };
    } catch (error) {
      throw new Error(`AES encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  public async decryptAES(
    encryptedData: ArrayBuffer,
    options: DecryptionOptions
  ): Promise<ArrayBuffer> {
    try {
      const key = this.keyCache.get(options.keyId);
      if (!key) {
        throw new Error(`Key not found: ${options.keyId}`);
      }

      const decryptedData = await webcrypto.subtle.decrypt(
        {
          name: EncryptionAlgorithm.AES_256_GCM,
          iv: options.iv,
          tagLength: 128,
        },
        key,
        encryptedData
      );

      return decryptedData;
    } catch (error) {
      throw new Error(`AES decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encrypt data using RSA-2048
   */
  public async encryptRSA(
    data: ArrayBuffer,
    keyId: string,
    classification: DataClassification = DataClassification.CONFIDENTIAL,
    compliance: ComplianceStandard[] = []
  ): Promise<EncryptionResult> {
    try {
      const keyPair = this.keyPairs.get(keyId);
      if (!keyPair) {
        throw new Error(`RSA key pair not found: ${keyId}`);
      }

      // RSA can only encrypt small amounts of data, so we use hybrid encryption
      // Generate a random AES key for the actual data encryption
      const aesKey = await webcrypto.subtle.generateKey(
        {
          name: EncryptionAlgorithm.AES_256_GCM,
          length: 256,
        },
        true,
        ['encrypt', 'decrypt']
      );

      // Export the AES key to encrypt it with RSA
      const aesKeyBuffer = await webcrypto.subtle.exportKey('raw', aesKey);
      
      const encryptedAESKey = await webcrypto.subtle.encrypt(
        {
          name: EncryptionAlgorithm.RSA_2048,
        },
        keyPair.publicKey,
        aesKeyBuffer
      );

      // Encrypt the actual data with AES
      const iv = webcrypto.getRandomValues(new Uint8Array(12));
      const encryptedData = await webcrypto.subtle.encrypt(
        {
          name: EncryptionAlgorithm.AES_256_GCM,
          iv: iv,
          tagLength: 128,
        },
        aesKey,
        data
      );

      // Combine encrypted AES key + IV + encrypted data
      const combined = new Uint8Array(
        encryptedAESKey.byteLength + iv.byteLength + encryptedData.byteLength
      );
      combined.set(new Uint8Array(encryptedAESKey), 0);
      combined.set(iv, encryptedAESKey.byteLength);
      combined.set(new Uint8Array(encryptedData), encryptedAESKey.byteLength + iv.byteLength);

      return {
        encryptedData: combined.buffer,
        iv: iv.buffer,
        algorithm: EncryptionAlgorithm.RSA_2048,
        keyId,
        timestamp: Date.now(),
        classification,
        compliance,
      };
    } catch (error) {
      throw new Error(`RSA encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt data using RSA-2048 (hybrid encryption)
   */
  public async decryptRSA(
    encryptedData: ArrayBuffer,
    options: DecryptionOptions
  ): Promise<ArrayBuffer> {
    try {
      const keyPair = this.keyPairs.get(options.keyId);
      if (!keyPair) {
        throw new Error(`RSA key pair not found: ${options.keyId}`);
      }

      const combined = new Uint8Array(encryptedData);
      
      // Extract encrypted AES key (first 256 bytes for RSA-2048)
      const encryptedAESKey = combined.slice(0, 256);
      
      // Extract IV (next 12 bytes)
      const iv = combined.slice(256, 268);
      
      // Extract encrypted data (remaining bytes)
      const actualEncryptedData = combined.slice(268);

      // Decrypt the AES key using RSA
      const aesKeyBuffer = await webcrypto.subtle.decrypt(
        {
          name: EncryptionAlgorithm.RSA_2048,
        },
        keyPair.privateKey,
        encryptedAESKey
      );

      // Import the decrypted AES key
      const aesKey = await webcrypto.subtle.importKey(
        'raw',
        aesKeyBuffer,
        {
          name: EncryptionAlgorithm.AES_256_GCM,
        },
        false,
        ['decrypt']
      );

      // Decrypt the actual data using AES
      const decryptedData = await webcrypto.subtle.decrypt(
        {
          name: EncryptionAlgorithm.AES_256_GCM,
          iv: iv,
          tagLength: 128,
        },
        aesKey,
        actualEncryptedData
      );

      return decryptedData;
    } catch (error) {
      throw new Error(`RSA decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate cryptographic hash (SHA-256, SHA-512)
   */
  public async generateHash(
    data: ArrayBuffer,
    algorithm: 'SHA-256' | 'SHA-512' = 'SHA-256'
  ): Promise<ArrayBuffer> {
    try {
      return await webcrypto.subtle.digest(algorithm, data);
    } catch (error) {
      throw new Error(`Hash generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate HMAC for data integrity
   */
  public async generateHMAC(
    data: ArrayBuffer,
    keyId: string,
    algorithm: 'SHA-256' | 'SHA-512' = 'SHA-256'
  ): Promise<ArrayBuffer> {
    try {
      let key = this.keyCache.get(`hmac_${keyId}`);
      if (!key) {
        key = await webcrypto.subtle.generateKey(
          {
            name: 'HMAC',
            hash: algorithm,
          },
          true,
          ['sign', 'verify']
        );
        this.keyCache.set(`hmac_${keyId}`, key);
      }

      return await webcrypto.subtle.sign('HMAC', key, data);
    } catch (error) {
      throw new Error(`HMAC generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify HMAC
   */
  public async verifyHMAC(
    data: ArrayBuffer,
    signature: ArrayBuffer,
    keyId: string,
    algorithm: 'SHA-256' | 'SHA-512' = 'SHA-256'
  ): Promise<boolean> {
    try {
      const key = this.keyCache.get(`hmac_${keyId}`);
      if (!key) {
        throw new Error(`HMAC key not found: ${keyId}`);
      }

      return await webcrypto.subtle.verify('HMAC', key, signature, data);
    } catch (error) {
      throw new Error(`HMAC verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export key for secure storage (encrypted format)
   */
  public async exportKey(keyId: string, format: 'jwk'): Promise<JsonWebKey>;
  public async exportKey(keyId: string, format: 'raw' | 'pkcs8' | 'spki'): Promise<ArrayBuffer>;
  public async exportKey(keyId: string, format: 'jwk' | 'raw' | 'pkcs8' | 'spki' = 'jwk'): Promise<ArrayBuffer | JsonWebKey> {
    try {
      const key = this.keyCache.get(keyId);
      if (!key) {
        throw new Error(`Key not found: ${keyId}`);
      }

      return await webcrypto.subtle.exportKey(format as any, key);
    } catch (error) {
      throw new Error(`Key export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import key from secure storage
   */
  public async importKey(
    keyData: ArrayBuffer | JsonWebKey,
    algorithm: EncryptionAlgorithm,
    keyId: string,
    usages: KeyUsage[]
  ): Promise<CryptoKey> {
    try {
      let keyFormat: 'jwk' | 'raw' | 'pkcs8' | 'spki';
      let algorithmParams: any;

      switch (algorithm) {
        case EncryptionAlgorithm.AES_256_GCM:
          keyFormat = 'raw';
          algorithmParams = { name: algorithm, length: 256 };
          break;
        case EncryptionAlgorithm.RSA_2048:
          keyFormat = 'jwk';
          algorithmParams = { name: algorithm, hash: 'SHA-256' };
          break;
        default:
          throw new Error(`Unsupported algorithm: ${algorithm}`);
      }

      const key = await webcrypto.subtle.importKey(
        keyFormat as any,
        keyData as any,
        algorithmParams,
        true,
        usages
      );

      this.keyCache.set(keyId, key);
      return key;
    } catch (error) {
      throw new Error(`Key import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Secure key derivation using PBKDF2
   */
  public async deriveKeyFromPassword(
    password: string,
    salt: ArrayBuffer,
    iterations: number = 100000,
    keyId: string
  ): Promise<CryptoKey> {
    try {
      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(password);

      const baseKey = await webcrypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
      );

      const derivedKey = await webcrypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: iterations,
          hash: 'SHA-256',
        },
        baseKey,
        {
          name: EncryptionAlgorithm.AES_256_GCM,
          length: 256,
        },
        true,
        ['encrypt', 'decrypt']
      );

      this.keyCache.set(keyId, derivedKey);
      return derivedKey;
    } catch (error) {
      throw new Error(`Key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear sensitive data from memory
   */
  public clearKeys(keyIds?: string[]): void {
    if (keyIds) {
      keyIds.forEach(id => {
        this.keyCache.delete(id);
        this.keyPairs.delete(id);
      });
    } else {
      this.keyCache.clear();
      this.keyPairs.clear();
    }
  }

  /**
   * Get key information (without exposing the actual key)
   */
  public getKeyInfo(keyId: string): { exists: boolean; algorithm?: string; created?: Date } {
    const key = this.keyCache.get(keyId);
    const keyPair = this.keyPairs.get(keyId);

    if (key) {
      return { exists: true, algorithm: key.algorithm.toString() };
    }

    if (keyPair) {
      return {
        exists: true,
        algorithm: keyPair.algorithm,
        created: keyPair.created,
      };
    }

    return { exists: false };
  }
}

// Export singleton instance
export const encryptionService = EncryptionService.getInstance();