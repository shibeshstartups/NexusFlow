import { encryptionService, EncryptionAlgorithm, DataClassification, ComplianceStandard } from './encryption';
import { keyManagementService } from './keyManagement';

// Field types that require encryption
export enum FieldType {
  // Personal Identifiable Information (PII)
  SSN = 'ssn',
  EMAIL = 'email',
  PHONE = 'phone',
  ADDRESS = 'address',
  NAME = 'name',
  DATE_OF_BIRTH = 'date_of_birth',
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'drivers_license',
  
  // Financial Information
  CREDIT_CARD = 'credit_card',
  BANK_ACCOUNT = 'bank_account',
  ROUTING_NUMBER = 'routing_number',
  TAX_ID = 'tax_id',
  FINANCIAL_AMOUNT = 'financial_amount',
  
  // Medical Information
  MEDICAL_RECORD_NUMBER = 'medical_record_number',
  DIAGNOSIS = 'diagnosis',
  MEDICATION = 'medication',
  TREATMENT = 'treatment',
  HEALTH_INSURANCE = 'health_insurance',
  
  // Generic sensitive data
  PASSWORD = 'password',
  API_KEY = 'api_key',
  SECRET = 'secret',
  CONFIDENTIAL = 'confidential',
  CUSTOM = 'custom',
}

// Detection patterns for automatic field classification
const FIELD_PATTERNS: Record<FieldType, RegExp[]> = {
  [FieldType.SSN]: [
    /^\d{3}-?\d{2}-?\d{4}$/,
    /^\d{9}$/
  ],
  [FieldType.EMAIL]: [
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  ],
  [FieldType.PHONE]: [
    /^\+?[\d\s\-\(\)]{10,}$/,
    /^\(\d{3}\)\s?\d{3}-?\d{4}$/
  ],
  [FieldType.CREDIT_CARD]: [
    /^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$/,
    /^\d{13,19}$/
  ],
  [FieldType.BANK_ACCOUNT]: [
    /^\d{8,17}$/
  ],
  [FieldType.ROUTING_NUMBER]: [
    /^\d{9}$/
  ],
  [FieldType.TAX_ID]: [
    /^\d{2}-?\d{7}$/,
    /^\d{9}$/
  ],
  [FieldType.PASSPORT]: [
    /^[A-Z]{2}\d{6,9}$/,
    /^[A-Z]\d{8}$/
  ],
  [FieldType.DRIVERS_LICENSE]: [
    /^[A-Z]{1,2}\d{6,8}$/,
    /^\d{7,9}$/
  ],
  [FieldType.MEDICAL_RECORD_NUMBER]: [
    /^MRN\d{6,10}$/i,
    /^MR\d{6,10}$/i
  ],
  // Add more patterns as needed
  [FieldType.ADDRESS]: [],
  [FieldType.NAME]: [],
  [FieldType.DATE_OF_BIRTH]: [],
  [FieldType.DIAGNOSIS]: [],
  [FieldType.MEDICATION]: [],
  [FieldType.TREATMENT]: [],
  [FieldType.HEALTH_INSURANCE]: [],
  [FieldType.FINANCIAL_AMOUNT]: [],
  [FieldType.PASSWORD]: [],
  [FieldType.API_KEY]: [],
  [FieldType.SECRET]: [],
  [FieldType.CONFIDENTIAL]: [],
  [FieldType.CUSTOM]: [],
};

// Field names that should be encrypted
const SENSITIVE_FIELD_NAMES = new Set([
  'ssn', 'social_security_number', 'social_security',
  'email', 'email_address',
  'phone', 'phone_number', 'mobile', 'telephone',
  'address', 'street_address', 'home_address',
  'first_name', 'last_name', 'full_name', 'name',
  'dob', 'date_of_birth', 'birth_date',
  'passport', 'passport_number',
  'license', 'drivers_license', 'dl_number',
  'credit_card', 'cc_number', 'card_number',
  'bank_account', 'account_number',
  'routing', 'routing_number',
  'tax_id', 'ein', 'tin',
  'mrn', 'medical_record', 'patient_id',
  'diagnosis', 'condition',
  'medication', 'prescription',
  'treatment', 'procedure',
  'insurance', 'policy_number',
  'password', 'passwd', 'pwd',
  'api_key', 'secret_key', 'access_key',
  'token', 'secret', 'confidential',
]);

export interface FieldEncryptionConfig {
  fieldType: FieldType;
  algorithm: EncryptionAlgorithm;
  keyId: string;
  classification: DataClassification;
  compliance: ComplianceStandard[];
  maskPattern?: string; // For displaying masked values
  searchable?: boolean; // Whether to create searchable hash
}

export interface EncryptedField {
  value: string; // Base64 encoded encrypted data
  fieldType: FieldType;
  algorithm: EncryptionAlgorithm;
  keyId: string;
  iv: string; // Base64 encoded IV
  authTag?: string; // Base64 encoded auth tag for GCM
  timestamp: number;
  searchHash?: string; // Hash for searchable encryption
  maskedValue?: string; // For display purposes
}

export interface FieldDetectionResult {
  fieldName: string;
  detectedType: FieldType | null;
  confidence: number; // 0-1
  suggestedConfig: FieldEncryptionConfig | null;
}

export interface BulkEncryptionRequest {
  data: Record<string, unknown>;
  fieldConfigs?: Map<string, FieldEncryptionConfig>;
  autoDetect?: boolean;
  preserveStructure?: boolean;
}

export interface BulkDecryptionRequest {
  encryptedData: Record<string, unknown>;
  fieldMapping?: Map<string, FieldEncryptionConfig>;
}

export class FieldLevelEncryptionService {
  private static instance: FieldLevelEncryptionService;
  private fieldConfigs = new Map<string, FieldEncryptionConfig>();
  private defaultConfigs = new Map<FieldType, FieldEncryptionConfig>();

  private constructor() {
    this.initializeDefaultConfigs();
  }

  public static getInstance(): FieldLevelEncryptionService {
    if (!FieldLevelEncryptionService.instance) {
      FieldLevelEncryptionService.instance = new FieldLevelEncryptionService();
    }
    return FieldLevelEncryptionService.instance;
  }

  /**
   * Configure encryption settings for specific fields
   */
  public configureField(fieldName: string, config: FieldEncryptionConfig): void {
    this.fieldConfigs.set(fieldName.toLowerCase(), config);
  }

  /**
   * Automatically detect sensitive fields in data
   */
  public detectSensitiveFields(data: Record<string, unknown>): FieldDetectionResult[] {
    const results: FieldDetectionResult[] = [];

    for (const [fieldName, value] of Object.entries(data)) {
      const detection = this.detectFieldType(fieldName, value);
      results.push(detection);
    }

    return results;
  }

  /**
   * Encrypt a single field value
   */
  public async encryptField(
    value: unknown,
    fieldName: string,
    config?: FieldEncryptionConfig
  ): Promise<EncryptedField> {
    if (value === null || value === undefined) {
      throw new Error('Cannot encrypt null or undefined value');
    }

    // Get configuration
    const fieldConfig = config || this.getFieldConfig(fieldName);
    if (!fieldConfig) {
      throw new Error(`No encryption configuration found for field: ${fieldName}`);
    }

    // Convert value to string for encryption
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    const encoder = new TextEncoder();
    const dataToEncrypt = encoder.encode(stringValue);

    // Encrypt the data
    const encryptionResult = await encryptionService.encryptAES(
      dataToEncrypt,
      fieldConfig.keyId,
      fieldConfig.classification,
      fieldConfig.compliance
    );

    // Create searchable hash if needed
    let searchHash: string | undefined;
    if (fieldConfig.searchable) {
      const hashBuffer = await encryptionService.generateHash(dataToEncrypt);
      searchHash = this.arrayBufferToBase64(hashBuffer);
    }

    // Create masked value for display
    const maskedValue = this.createMaskedValue(stringValue, fieldConfig.fieldType, fieldConfig.maskPattern);

    return {
      value: this.arrayBufferToBase64(encryptionResult.encryptedData),
      fieldType: fieldConfig.fieldType,
      algorithm: fieldConfig.algorithm,
      keyId: fieldConfig.keyId,
      iv: this.arrayBufferToBase64(encryptionResult.iv),
      authTag: encryptionResult.authTag ? this.arrayBufferToBase64(encryptionResult.authTag) : undefined,
      timestamp: encryptionResult.timestamp,
      searchHash,
      maskedValue,
    };
  }

  /**
   * Decrypt a single field value
   */
  public async decryptField(encryptedField: EncryptedField): Promise<unknown> {
    try {
      // Prepare decryption options
      const decryptionOptions = {
        keyId: encryptedField.keyId,
        algorithm: encryptedField.algorithm,
        iv: this.base64ToArrayBuffer(encryptedField.iv),
        authTag: encryptedField.authTag ? this.base64ToArrayBuffer(encryptedField.authTag) : undefined,
      };

      // Decrypt the data
      const encryptedData = this.base64ToArrayBuffer(encryptedField.value);
      const decryptedBuffer = await encryptionService.decryptAES(encryptedData, decryptionOptions);

      // Convert back to string
      const decoder = new TextDecoder();
      const decryptedString = decoder.decode(decryptedBuffer);

      // Try to parse as JSON if it looks like JSON
      if (decryptedString.startsWith('{') || decryptedString.startsWith('[') || decryptedString.startsWith('"')) {
        try {
          return JSON.parse(decryptedString);
        } catch {
          // If JSON parsing fails, return as string
          return decryptedString;
        }
      }

      return decryptedString;
    } catch (error) {
      throw new Error(`Failed to decrypt field: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encrypt multiple fields in an object
   */
  public async encryptFields(request: BulkEncryptionRequest): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = request.preserveStructure ? { ...request.data } : {};

    // Auto-detect sensitive fields if requested
    if (request.autoDetect) {
      const detections = this.detectSensitiveFields(request.data);
      for (const detection of detections) {
        if (detection.suggestedConfig && detection.confidence > 0.7) {
          this.configureField(detection.fieldName, detection.suggestedConfig);
        }
      }
    }

    // Process each field
    for (const [fieldName, value] of Object.entries(request.data)) {
      if (value === null || value === undefined) {
        result[fieldName] = value;
        continue;
      }

      // Check if field should be encrypted
      const config = request.fieldConfigs?.get(fieldName) || this.getFieldConfig(fieldName);
      
      if (config) {
        try {
          result[fieldName] = await this.encryptField(value, fieldName, config);
        } catch (error) {
          // Log error but continue processing other fields
          console.error(`Failed to encrypt field ${fieldName}:`, error);
          result[fieldName] = value; // Keep original value if encryption fails
        }
      } else {
        result[fieldName] = value;
      }
    }

    return result;
  }

  /**
   * Decrypt multiple fields in an object
   */
  public async decryptFields(request: BulkDecryptionRequest): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};

    for (const [fieldName, value] of Object.entries(request.encryptedData)) {
      if (value === null || value === undefined) {
        result[fieldName] = value;
        continue;
      }

      // Check if value is an encrypted field
      if (this.isEncryptedField(value)) {
        try {
          result[fieldName] = await this.decryptField(value as EncryptedField);
        } catch (error) {
          console.error(`Failed to decrypt field ${fieldName}:`, error);
          result[fieldName] = (value as EncryptedField).maskedValue || '[ENCRYPTED]';
        }
      } else {
        result[fieldName] = value;
      }
    }

    return result;
  }

  /**
   * Search encrypted fields using searchable encryption
   */
  public async searchEncryptedFields(
    data: Record<string, unknown>[],
    searchField: string,
    searchValue: string
  ): Promise<Record<string, unknown>[]> {
    const config = this.getFieldConfig(searchField);
    if (!config || !config.searchable) {
      throw new Error(`Field ${searchField} is not configured for searchable encryption`);
    }

    // Create search hash
    const encoder = new TextEncoder();
    const searchData = encoder.encode(searchValue);
    const searchHashBuffer = await encryptionService.generateHash(searchData);
    const searchHash = this.arrayBufferToBase64(searchHashBuffer);

    // Filter results
    return data.filter(record => {
      const fieldValue = record[searchField];
      if (this.isEncryptedField(fieldValue)) {
        const encryptedField = fieldValue as EncryptedField;
        return encryptedField.searchHash === searchHash;
      }
      return false;
    });
  }

  /**
   * Get masked value for display purposes
   */
  public getMaskedValue(encryptedField: EncryptedField): string {
    return encryptedField.maskedValue || this.createMaskedValue('[ENCRYPTED]', encryptedField.fieldType);
  }

  /**
   * Validate field encryption compliance
   */
  public validateCompliance(
    fieldName: string,
    encryptedField: EncryptedField,
    requiredStandards: ComplianceStandard[]
  ): { compliant: boolean; issues: string[] } {
    const issues: string[] = [];
    const config = this.getFieldConfig(fieldName);

    if (!config) {
      issues.push(`No configuration found for field: ${fieldName}`);
      return { compliant: false, issues };
    }

    // Check if all required compliance standards are met
    const missingStandards = requiredStandards.filter(
      standard => !config.compliance.includes(standard)
    );

    if (missingStandards.length > 0) {
      issues.push(`Missing compliance standards: ${missingStandards.join(', ')}`);
    }

    // Check key compliance
    const keyMetadata = keyManagementService.getKeyMetadata(encryptedField.keyId);
    if (keyMetadata) {
      const keyCompliance = keyManagementService.checkCompliance(encryptedField.keyId);
      if (!keyCompliance.compliant) {
        issues.push(`Key compliance issues: ${keyCompliance.issues.join(', ')}`);
      }
    } else {
      issues.push(`Key metadata not found: ${encryptedField.keyId}`);
    }

    // Check algorithm strength
    if (encryptedField.algorithm !== EncryptionAlgorithm.AES_256_GCM) {
      issues.push(`Algorithm ${encryptedField.algorithm} may not meet all compliance requirements`);
    }

    return {
      compliant: issues.length === 0,
      issues,
    };
  }

  // Private helper methods

  private initializeDefaultConfigs(): void {
    // PII defaults
    this.defaultConfigs.set(FieldType.SSN, {
      fieldType: FieldType.SSN,
      algorithm: EncryptionAlgorithm.AES_256_GCM,
      keyId: 'pii_default',
      classification: DataClassification.RESTRICTED,
      compliance: [ComplianceStandard.GDPR, ComplianceStandard.HIPAA],
      maskPattern: 'XXX-XX-####',
      searchable: false,
    });

    this.defaultConfigs.set(FieldType.EMAIL, {
      fieldType: FieldType.EMAIL,
      algorithm: EncryptionAlgorithm.AES_256_GCM,
      keyId: 'pii_default',
      classification: DataClassification.CONFIDENTIAL,
      compliance: [ComplianceStandard.GDPR],
      maskPattern: 'X***@***.***',
      searchable: true,
    });

    // Financial defaults
    this.defaultConfigs.set(FieldType.CREDIT_CARD, {
      fieldType: FieldType.CREDIT_CARD,
      algorithm: EncryptionAlgorithm.AES_256_GCM,
      keyId: 'financial_default',
      classification: DataClassification.RESTRICTED,
      compliance: [ComplianceStandard.PCI_DSS, ComplianceStandard.SOX],
      maskPattern: '****-****-****-####',
      searchable: false,
    });

    // Medical defaults
    this.defaultConfigs.set(FieldType.MEDICAL_RECORD_NUMBER, {
      fieldType: FieldType.MEDICAL_RECORD_NUMBER,
      algorithm: EncryptionAlgorithm.AES_256_GCM,
      keyId: 'medical_default',
      classification: DataClassification.RESTRICTED,
      compliance: [ComplianceStandard.HIPAA, ComplianceStandard.GDPR],
      maskPattern: 'MRN****####',
      searchable: true,
    });
  }

  private detectFieldType(fieldName: string, value: unknown): FieldDetectionResult {
    const lowerFieldName = fieldName.toLowerCase();
    let detectedType: FieldType | null = null;
    let confidence = 0;

    // Check field name patterns first
    if (SENSITIVE_FIELD_NAMES.has(lowerFieldName)) {
      confidence = 0.8;
      
      // Try to determine specific type based on field name
      if (lowerFieldName.includes('ssn') || lowerFieldName.includes('social')) {
        detectedType = FieldType.SSN;
      } else if (lowerFieldName.includes('email')) {
        detectedType = FieldType.EMAIL;
      } else if (lowerFieldName.includes('phone') || lowerFieldName.includes('mobile')) {
        detectedType = FieldType.PHONE;
      } else if (lowerFieldName.includes('address')) {
        detectedType = FieldType.ADDRESS;
      } else if (lowerFieldName.includes('name')) {
        detectedType = FieldType.NAME;
      } else if (lowerFieldName.includes('card') || lowerFieldName.includes('credit')) {
        detectedType = FieldType.CREDIT_CARD;
      } else if (lowerFieldName.includes('account')) {
        detectedType = FieldType.BANK_ACCOUNT;
      } else if (lowerFieldName.includes('medical') || lowerFieldName.includes('mrn')) {
        detectedType = FieldType.MEDICAL_RECORD_NUMBER;
      } else {
        detectedType = FieldType.CONFIDENTIAL;
        confidence = 0.6;
      }
    }

    // If no field name match, try value patterns
    if (!detectedType && typeof value === 'string') {
      for (const [fieldType, patterns] of Object.entries(FIELD_PATTERNS)) {
        for (const pattern of patterns) {
          if (pattern.test(value)) {
            detectedType = fieldType as FieldType;
            confidence = 0.9;
            break;
          }
        }
        if (detectedType) break;
      }
    }

    // Get suggested configuration
    let suggestedConfig: FieldEncryptionConfig | null = null;
    if (detectedType) {
      suggestedConfig = this.defaultConfigs.get(detectedType) || {
        fieldType: detectedType,
        algorithm: EncryptionAlgorithm.AES_256_GCM,
        keyId: 'default_key',
        classification: DataClassification.CONFIDENTIAL,
        compliance: [ComplianceStandard.GDPR],
        searchable: false,
      };
    }

    return {
      fieldName,
      detectedType,
      confidence,
      suggestedConfig,
    };
  }

  private getFieldConfig(fieldName: string): FieldEncryptionConfig | null {
    return this.fieldConfigs.get(fieldName.toLowerCase()) || null;
  }

  private isEncryptedField(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) return false;
    
    const obj = value as Record<string, unknown>;
    return (
      typeof obj.value === 'string' &&
      typeof obj.fieldType === 'string' &&
      typeof obj.algorithm === 'string' &&
      typeof obj.keyId === 'string' &&
      typeof obj.iv === 'string' &&
      typeof obj.timestamp === 'number'
    );
  }

  private createMaskedValue(value: string, fieldType: FieldType, maskPattern?: string): string {
    if (maskPattern) {
      // Apply custom mask pattern
      let masked = maskPattern;
      let valueIndex = 0;
      
      for (let i = 0; i < masked.length && valueIndex < value.length; i++) {
        if (masked[i] === '#') {
          masked = masked.substring(0, i) + value[valueIndex] + masked.substring(i + 1);
          valueIndex++;
        }
      }
      
      return masked.replace(/#/g, '?'); // Replace remaining # with ?
    }

    // Default masking patterns
    switch (fieldType) {
      case FieldType.SSN:
        if (value.length >= 4) {
          return `XXX-XX-${value.slice(-4)}`;
        }
        break;
      case FieldType.EMAIL:
        const atIndex = value.indexOf('@');
        if (atIndex > 0) {
          return `${value[0]}***@${value.substring(atIndex + 1)}`;
        }
        break;
      case FieldType.CREDIT_CARD:
        if (value.length >= 4) {
          return `****-****-****-${value.slice(-4)}`;
        }
        break;
      case FieldType.PHONE:
        if (value.length >= 4) {
          return `***-***-${value.slice(-4)}`;
        }
        break;
      default:
        // Generic masking - show first and last character with stars in between
        if (value.length <= 2) return '*'.repeat(value.length);
        if (value.length <= 4) return value[0] + '*'.repeat(value.length - 2) + value.slice(-1);
        return value[0] + value[1] + '*'.repeat(Math.max(0, value.length - 4)) + value.slice(-2);
    }

    return '*'.repeat(Math.min(value.length, 8));
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Export singleton instance
export const fieldLevelEncryptionService = FieldLevelEncryptionService.getInstance();