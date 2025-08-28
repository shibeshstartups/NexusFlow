import { encryptionService, EncryptionAlgorithm, DataClassification, ComplianceStandard } from './encryption';

// Key lifecycle states
export enum KeyState {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
  DESTROYED = 'destroyed',
}

// HSM provider types
export enum HSMProvider {
  AWS_CLOUDHSM = 'aws_cloudhsm',
  AZURE_KEY_VAULT = 'azure_key_vault',
  GOOGLE_CLOUD_HSM = 'google_cloud_hsm',
  THALES_LUNA = 'thales_luna',
  UTIMACO = 'utimaco',
  SOFTWARE_HSM = 'software_hsm', // For development/testing
}

export interface KeyMetadata {
  keyId: string;
  algorithm: EncryptionAlgorithm;
  keySize: number;
  purpose: string[];
  classification: DataClassification;
  compliance: ComplianceStandard[];
  created: Date;
  expires?: Date;
  lastUsed?: Date;
  state: KeyState;
  hsmProvider: HSMProvider;
  hsmKeyId?: string; // Reference to HSM key
  rotationPolicy?: KeyRotationPolicy;
  accessLog: KeyAccessLog[];
  owner: string;
  approvers: string[];
}

export interface KeyRotationPolicy {
  enabled: boolean;
  intervalDays: number;
  warningDays: number;
  autoRotate: boolean;
  lastRotation?: Date;
  nextRotation?: Date;
}

export interface KeyAccessLog {
  timestamp: Date;
  userId: string;
  action: 'create' | 'use' | 'export' | 'rotate' | 'revoke' | 'destroy';
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  reason?: string;
}

export interface HSMConfig {
  provider: HSMProvider;
  endpoint?: string;
  credentials: {
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    clientCertificate?: string;
    clientKey?: string;
    partitionLabel?: string;
    partitionPassword?: string;
  };
  options?: {
    timeout?: number;
    retryCount?: number;
    enableAuditLogging?: boolean;
  };
}

export interface KeyGenerationRequest {
  keyId: string;
  algorithm: EncryptionAlgorithm;
  keySize?: number;
  purpose: string[];
  classification: DataClassification;
  compliance: ComplianceStandard[];
  expiryDays?: number;
  rotationPolicy?: Partial<KeyRotationPolicy>;
  owner: string;
  approvers?: string[];
  hsmProvider?: HSMProvider;
}

export class KeyManagementService {
  private static instance: KeyManagementService;
  private keyMetadata = new Map<string, KeyMetadata>();
  private hsmConfigs = new Map<HSMProvider, HSMConfig>();
  private rotationTimers = new Map<string, NodeJS.Timeout>();

  private constructor() {
    this.initializeDefaultRotationChecks();
  }

  public static getInstance(): KeyManagementService {
    if (!KeyManagementService.instance) {
      KeyManagementService.instance = new KeyManagementService();
    }
    return KeyManagementService.instance;
  }

  /**
   * Configure HSM provider
   */
  public configureHSM(provider: HSMProvider, config: HSMConfig): void {
    this.hsmConfigs.set(provider, config);
    this.logKeyAccess('system', 'configure_hsm', true, `HSM ${provider} configured`);
  }

  /**
   * Generate new encryption key with full lifecycle management
   */
  public async generateKey(request: KeyGenerationRequest, userId: string): Promise<KeyMetadata> {
    try {
      // Validate request
      this.validateKeyRequest(request);

      // Check if key already exists
      if (this.keyMetadata.has(request.keyId)) {
        throw new Error(`Key already exists: ${request.keyId}`);
      }

      // Generate key using appropriate method
      let keyGenerated = false;
      let hsmKeyId: string | undefined;

      if (request.hsmProvider && request.hsmProvider !== HSMProvider.SOFTWARE_HSM) {
        // Use HSM for key generation
        hsmKeyId = await this.generateKeyInHSM(request);
        keyGenerated = true;
      } else {
        // Use software encryption service
        await this.generateKeySoftware(request);
        keyGenerated = true;
      }

      // Create key metadata
      const keyMetadata: KeyMetadata = {
        keyId: request.keyId,
        algorithm: request.algorithm,
        keySize: request.keySize || this.getDefaultKeySize(request.algorithm),
        purpose: request.purpose,
        classification: request.classification,
        compliance: request.compliance,
        created: new Date(),
        expires: request.expiryDays ? new Date(Date.now() + request.expiryDays * 24 * 60 * 60 * 1000) : undefined,
        state: KeyState.ACTIVE,
        hsmProvider: request.hsmProvider || HSMProvider.SOFTWARE_HSM,
        hsmKeyId,
        rotationPolicy: this.createRotationPolicy(request.rotationPolicy),
        accessLog: [],
        owner: request.owner,
        approvers: request.approvers || [],
      };

      // Store metadata
      this.keyMetadata.set(request.keyId, keyMetadata);

      // Set up rotation timer if enabled
      if (keyMetadata.rotationPolicy?.enabled) {
        this.scheduleKeyRotation(request.keyId);
      }

      // Log key creation
      this.logKeyAccess(userId, 'create', true, `Key ${request.keyId} created`);

      return keyMetadata;
    } catch (error) {
      this.logKeyAccess(userId, 'create', false, `Failed to create key ${request.keyId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Rotate encryption key
   */
  public async rotateKey(keyId: string, userId: string): Promise<KeyMetadata> {
    try {
      const metadata = this.keyMetadata.get(keyId);
      if (!metadata) {
        throw new Error(`Key not found: ${keyId}`);
      }

      if (metadata.state !== KeyState.ACTIVE) {
        throw new Error(`Cannot rotate key in state: ${metadata.state}`);
      }

      // Create new key ID for rotated key
      const newKeyId = `${keyId}_rotated_${Date.now()}`;
      
      // Generate new key with same properties
      const rotationRequest: KeyGenerationRequest = {
        keyId: newKeyId,
        algorithm: metadata.algorithm,
        keySize: metadata.keySize,
        purpose: metadata.purpose,
        classification: metadata.classification,
        compliance: metadata.compliance,
        rotationPolicy: metadata.rotationPolicy,
        owner: metadata.owner,
        approvers: metadata.approvers,
        hsmProvider: metadata.hsmProvider,
      };

      const newMetadata = await this.generateKey(rotationRequest, userId);

      // Mark old key as inactive
      metadata.state = KeyState.INACTIVE;
      metadata.lastUsed = new Date();

      // Update rotation policy
      if (metadata.rotationPolicy) {
        metadata.rotationPolicy.lastRotation = new Date();
        metadata.rotationPolicy.nextRotation = new Date(
          Date.now() + metadata.rotationPolicy.intervalDays * 24 * 60 * 60 * 1000
        );
      }

      // Schedule next rotation
      if (newMetadata.rotationPolicy?.enabled) {
        this.scheduleKeyRotation(newKeyId);
      }

      this.logKeyAccess(userId, 'rotate', true, `Key ${keyId} rotated to ${newKeyId}`);

      return newMetadata;
    } catch (error) {
      this.logKeyAccess(userId, 'rotate', false, `Failed to rotate key ${keyId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Revoke encryption key
   */
  public async revokeKey(keyId: string, userId: string, reason: string): Promise<void> {
    try {
      const metadata = this.keyMetadata.get(keyId);
      if (!metadata) {
        throw new Error(`Key not found: ${keyId}`);
      }

      if (metadata.state === KeyState.REVOKED || metadata.state === KeyState.DESTROYED) {
        throw new Error(`Key already in final state: ${metadata.state}`);
      }

      // Update key state
      metadata.state = KeyState.REVOKED;
      metadata.lastUsed = new Date();

      // Clear rotation timer
      const timer = this.rotationTimers.get(keyId);
      if (timer) {
        clearTimeout(timer);
        this.rotationTimers.delete(keyId);
      }

      // Revoke in HSM if applicable
      if (metadata.hsmProvider !== HSMProvider.SOFTWARE_HSM && metadata.hsmKeyId) {
        await this.revokeKeyInHSM(metadata.hsmProvider, metadata.hsmKeyId);
      }

      // Clear from software encryption service
      encryptionService.clearKeys([keyId]);

      this.logKeyAccess(userId, 'revoke', true, `Key ${keyId} revoked: ${reason}`);
    } catch (error) {
      this.logKeyAccess(userId, 'revoke', false, `Failed to revoke key ${keyId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Destroy encryption key (irreversible)
   */
  public async destroyKey(keyId: string, userId: string, approvers: string[]): Promise<void> {
    try {
      const metadata = this.keyMetadata.get(keyId);
      if (!metadata) {
        throw new Error(`Key not found: ${keyId}`);
      }

      // Verify approvers (for high-classification keys)
      if (metadata.classification === DataClassification.RESTRICTED || metadata.classification === DataClassification.TOP_SECRET) {
        const requiredApprovers = metadata.approvers.length > 0 ? metadata.approvers : [metadata.owner];
        const hasRequiredApprovals = requiredApprovers.every(approver => approvers.includes(approver));
        
        if (!hasRequiredApprovals) {
          throw new Error(`Insufficient approvals for key destruction. Required: ${requiredApprovers.join(', ')}`);
        }
      }

      // Update key state
      metadata.state = KeyState.DESTROYED;
      metadata.lastUsed = new Date();

      // Clear rotation timer
      const timer = this.rotationTimers.get(keyId);
      if (timer) {
        clearTimeout(timer);
        this.rotationTimers.delete(keyId);
      }

      // Destroy in HSM if applicable
      if (metadata.hsmProvider !== HSMProvider.SOFTWARE_HSM && metadata.hsmKeyId) {
        await this.destroyKeyInHSM(metadata.hsmProvider, metadata.hsmKeyId);
      }

      // Clear from software encryption service
      encryptionService.clearKeys([keyId]);

      this.logKeyAccess(userId, 'destroy', true, `Key ${keyId} destroyed with approvers: ${approvers.join(', ')}`);
    } catch (error) {
      this.logKeyAccess(userId, 'destroy', false, `Failed to destroy key ${keyId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Get key metadata
   */
  public getKeyMetadata(keyId: string): KeyMetadata | undefined {
    return this.keyMetadata.get(keyId);
  }

  /**
   * List keys with filtering
   */
  public listKeys(filters?: {
    state?: KeyState;
    classification?: DataClassification;
    compliance?: ComplianceStandard;
    owner?: string;
    expiringSoon?: boolean; // Next 30 days
  }): KeyMetadata[] {
    let keys = Array.from(this.keyMetadata.values());

    if (filters) {
      if (filters.state) {
        keys = keys.filter(key => key.state === filters.state);
      }
      if (filters.classification) {
        keys = keys.filter(key => key.classification === filters.classification);
      }
      if (filters.compliance) {
        keys = keys.filter(key => key.compliance.includes(filters.compliance!));
      }
      if (filters.owner) {
        keys = keys.filter(key => key.owner === filters.owner);
      }
      if (filters.expiringSoon) {
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        keys = keys.filter(key => key.expires && key.expires <= thirtyDaysFromNow);
      }
    }

    return keys;
  }

  /**
   * Get key usage statistics
   */
  public getKeyUsageStats(keyId: string): {
    totalAccesses: number;
    lastAccess?: Date;
    accessesByAction: Record<string, number>;
    accessesByUser: Record<string, number>;
  } {
    const metadata = this.keyMetadata.get(keyId);
    if (!metadata) {
      throw new Error(`Key not found: ${keyId}`);
    }

    const stats = {
      totalAccesses: metadata.accessLog.length,
      lastAccess: metadata.lastUsed,
      accessesByAction: {} as Record<string, number>,
      accessesByUser: {} as Record<string, number>,
    };

    metadata.accessLog.forEach(log => {
      // Count by action
      stats.accessesByAction[log.action] = (stats.accessesByAction[log.action] || 0) + 1;
      
      // Count by user
      stats.accessesByUser[log.userId] = (stats.accessesByUser[log.userId] || 0) + 1;
    });

    return stats;
  }

  /**
   * Export key securely (with proper authorization)
   */
  public async exportKey(keyId: string, userId: string, format: 'jwk' | 'pem' | 'der' = 'jwk'): Promise<string | ArrayBuffer> {
    try {
      const metadata = this.keyMetadata.get(keyId);
      if (!metadata) {
        throw new Error(`Key not found: ${keyId}`);
      }

      if (metadata.state !== KeyState.ACTIVE) {
        throw new Error(`Cannot export key in state: ${metadata.state}`);
      }

      // Check permissions (simplified - in production, use proper RBAC)
      if (metadata.owner !== userId && !metadata.approvers.includes(userId)) {
        throw new Error(`Insufficient permissions to export key: ${keyId}`);
      }

      let exportedKey: string | ArrayBuffer | JsonWebKey;

      if (metadata.hsmProvider !== HSMProvider.SOFTWARE_HSM && metadata.hsmKeyId) {
        // Export from HSM (if supported by HSM)
        exportedKey = await this.exportKeyFromHSM(metadata.hsmProvider, metadata.hsmKeyId, format);
      } else {
        // Export from software encryption service
        exportedKey = await encryptionService.exportKey(keyId, format as 'jwk');
      }

      this.logKeyAccess(userId, 'export', true, `Key ${keyId} exported in ${format} format`);

      // Convert to appropriate return type
      if (format === 'jwk') {
        return JSON.stringify(exportedKey);
      }
      
      return exportedKey as ArrayBuffer;
    } catch (error) {
      this.logKeyAccess(userId, 'export', false, `Failed to export key ${keyId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Import key securely
   */
  public async importKey(
    keyData: string | ArrayBuffer | JsonWebKey,
    metadata: Omit<KeyMetadata, 'created' | 'lastUsed' | 'accessLog'>,
    userId: string
  ): Promise<void> {
    try {
      if (this.keyMetadata.has(metadata.keyId)) {
        throw new Error(`Key already exists: ${metadata.keyId}`);
      }

      // Parse key data based on type
      let parsedKeyData: ArrayBuffer | JsonWebKey;
      if (typeof keyData === 'string') {
        parsedKeyData = JSON.parse(keyData);
      } else {
        parsedKeyData = keyData;
      }

      // Import into software encryption service
      const usages: KeyUsage[] = this.getKeyUsagesFromPurpose(metadata.purpose);
      await encryptionService.importKey(
        parsedKeyData,
        metadata.algorithm,
        metadata.keyId,
        usages
      );

      // Store metadata
      const fullMetadata: KeyMetadata = {
        ...metadata,
        created: new Date(),
        accessLog: [],
      };

      this.keyMetadata.set(metadata.keyId, fullMetadata);

      // Set up rotation timer if enabled
      if (fullMetadata.rotationPolicy?.enabled) {
        this.scheduleKeyRotation(metadata.keyId);
      }

      this.logKeyAccess(userId, 'import', true, `Key ${metadata.keyId} imported`);
    } catch (error) {
      this.logKeyAccess(userId, 'import', false, `Failed to import key ${metadata.keyId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Check compliance status
   */
  public checkCompliance(keyId: string): {
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const metadata = this.keyMetadata.get(keyId);
    if (!metadata) {
      throw new Error(`Key not found: ${keyId}`);
    }

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check key expiry
    if (metadata.expires && metadata.expires < new Date()) {
      issues.push('Key has expired');
    }

    // Check key rotation
    if (metadata.rotationPolicy?.enabled) {
      const nextRotation = metadata.rotationPolicy.nextRotation;
      if (nextRotation && nextRotation < new Date()) {
        issues.push('Key rotation is overdue');
      }

      const warningDate = new Date(Date.now() + (metadata.rotationPolicy.warningDays || 7) * 24 * 60 * 60 * 1000);
      if (nextRotation && nextRotation < warningDate) {
        recommendations.push('Key rotation is approaching');
      }
    }

    // Check key size compliance
    const minKeySize = this.getMinKeySizeForCompliance(metadata.compliance);
    if (metadata.keySize < minKeySize) {
      issues.push(`Key size ${metadata.keySize} is below minimum ${minKeySize} for compliance standards`);
    }

    // Check HSM requirements for high-classification data
    if (
      (metadata.classification === DataClassification.RESTRICTED || 
       metadata.classification === DataClassification.TOP_SECRET) &&
      metadata.hsmProvider === HSMProvider.SOFTWARE_HSM
    ) {
      issues.push('High-classification data requires HSM-backed keys');
    }

    // Check access patterns
    const stats = this.getKeyUsageStats(keyId);
    if (stats.lastAccess && (Date.now() - stats.lastAccess.getTime()) > 90 * 24 * 60 * 60 * 1000) {
      recommendations.push('Key has not been accessed in 90+ days - consider revocation');
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations,
    };
  }

  // Private helper methods

  private validateKeyRequest(request: KeyGenerationRequest): void {
    if (!request.keyId || !request.algorithm || !request.purpose.length) {
      throw new Error('Invalid key generation request');
    }

    if (request.classification === DataClassification.RESTRICTED || request.classification === DataClassification.TOP_SECRET) {
      if (!request.approvers || request.approvers.length === 0) {
        throw new Error('High-classification keys require approvers');
      }
    }
  }

  private async generateKeyInHSM(request: KeyGenerationRequest): Promise<string> {
    // This is a placeholder for HSM integration
    // In production, this would integrate with actual HSM SDKs
    const hsmKeyId = `hsm_${request.hsmProvider}_${request.keyId}_${Date.now()}`;
    
    // Simulate HSM key generation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return hsmKeyId;
  }

  private async generateKeySoftware(request: KeyGenerationRequest): Promise<void> {
    switch (request.algorithm) {
      case EncryptionAlgorithm.AES_256_GCM:
        await encryptionService.generateAESKey(request.keyId);
        break;
      case EncryptionAlgorithm.RSA_2048:
        await encryptionService.generateRSAKeyPair(request.keyId);
        break;
      case EncryptionAlgorithm.ECDH_P256:
        await encryptionService.generateECDHKeyPair(request.keyId);
        break;
      default:
        throw new Error(`Unsupported algorithm: ${request.algorithm}`);
    }
  }

  private async revokeKeyInHSM(provider: HSMProvider, hsmKeyId: string): Promise<void> {
    // Placeholder for HSM key revocation
    console.log(`Revoking HSM key ${hsmKeyId} in ${provider}`);
  }

  private async destroyKeyInHSM(provider: HSMProvider, hsmKeyId: string): Promise<void> {
    // Placeholder for HSM key destruction
    console.log(`Destroying HSM key ${hsmKeyId} in ${provider}`);
  }

  private async exportKeyFromHSM(provider: HSMProvider, hsmKeyId: string, format: string): Promise<ArrayBuffer> {
    // Placeholder for HSM key export
    console.log(`Exporting HSM key ${hsmKeyId} from ${provider} in ${format} format`);
    return new ArrayBuffer(0);
  }

  private getDefaultKeySize(algorithm: EncryptionAlgorithm): number {
    switch (algorithm) {
      case EncryptionAlgorithm.AES_256_GCM:
        return 256;
      case EncryptionAlgorithm.RSA_2048:
        return 2048;
      case EncryptionAlgorithm.ECDH_P256:
        return 256;
      default:
        return 256;
    }
  }

  private createRotationPolicy(partial?: Partial<KeyRotationPolicy>): KeyRotationPolicy {
    const defaultPolicy: KeyRotationPolicy = {
      enabled: false,
      intervalDays: 365,
      warningDays: 30,
      autoRotate: false,
    };

    if (!partial) return defaultPolicy;

    const policy = { ...defaultPolicy, ...partial };
    
    if (policy.enabled && !policy.nextRotation) {
      policy.nextRotation = new Date(Date.now() + policy.intervalDays * 24 * 60 * 60 * 1000);
    }

    return policy;
  }

  private scheduleKeyRotation(keyId: string): void {
    const metadata = this.keyMetadata.get(keyId);
    if (!metadata || !metadata.rotationPolicy?.enabled || !metadata.rotationPolicy.nextRotation) {
      return;
    }

    const timeUntilRotation = metadata.rotationPolicy.nextRotation.getTime() - Date.now();
    
    if (timeUntilRotation > 0) {
      const timer = setTimeout(async () => {
        try {
          if (metadata.rotationPolicy?.autoRotate) {
            await this.rotateKey(keyId, 'system');
          } else {
            console.log(`Key rotation due for ${keyId} - manual intervention required`);
          }
        } catch (error) {
          console.error(`Failed to auto-rotate key ${keyId}:`, error);
        }
      }, timeUntilRotation);

      this.rotationTimers.set(keyId, timer);
    }
  }

  private initializeDefaultRotationChecks(): void {
    // Check for overdue rotations every hour
    setInterval(() => {
      const keys = this.listKeys({ state: KeyState.ACTIVE });
      keys.forEach(key => {
        if (key.rotationPolicy?.enabled && key.rotationPolicy.nextRotation) {
          const overdue = key.rotationPolicy.nextRotation < new Date();
          if (overdue) {
            console.warn(`Key rotation overdue for ${key.keyId}`);
          }
        }
      });
    }, 60 * 60 * 1000); // 1 hour
  }

  private getKeyUsagesFromPurpose(purposes: string[]): KeyUsage[] {
    const usages: KeyUsage[] = [];
    
    if (purposes.includes('encrypt') || purposes.includes('encryption')) {
      usages.push('encrypt');
    }
    if (purposes.includes('decrypt') || purposes.includes('decryption')) {
      usages.push('decrypt');
    }
    if (purposes.includes('sign') || purposes.includes('signing')) {
      usages.push('sign');
    }
    if (purposes.includes('verify') || purposes.includes('verification')) {
      usages.push('verify');
    }

    return usages.length > 0 ? usages : ['encrypt', 'decrypt'];
  }

  private getMinKeySizeForCompliance(standards: ComplianceStandard[]): number {
    let minSize = 128; // Default minimum

    standards.forEach(standard => {
      switch (standard) {
        case ComplianceStandard.FIPS_140_2:
        case ComplianceStandard.FISMA:
          minSize = Math.max(minSize, 256);
          break;
        case ComplianceStandard.PCI_DSS:
          minSize = Math.max(minSize, 256);
          break;
        default:
          minSize = Math.max(minSize, 128);
      }
    });

    return minSize;
  }

  private logKeyAccess(userId: string, action: string, success: boolean, reason?: string): void {
    // In production, this would integrate with audit logging system
    console.log(`KEY ACCESS: ${new Date().toISOString()} | User: ${userId} | Action: ${action} | Success: ${success} | Reason: ${reason || 'N/A'}`);
  }
}

// Export singleton instance
export const keyManagementService = KeyManagementService.getInstance();