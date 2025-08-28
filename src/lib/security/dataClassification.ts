import { DataClassification, ComplianceStandard } from './encryption';
import { rbacService, Permission } from './rbac';
import { auditLogger, AuditEventType, AuditSeverity } from './auditLogger';

// Data sensitivity levels
export enum SensitivityLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal', 
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  TOP_SECRET = 'top_secret',
}

// Classification rules and patterns
export interface ClassificationRule {
  id: string;
  name: string;
  patterns: ClassificationPattern[];
  classification: DataClassification;
  sensitivity: SensitivityLevel;
  compliance: ComplianceStandard[];
  autoApply: boolean;
  priority: number;
}

export interface ClassificationPattern {
  type: 'regex' | 'keyword' | 'filename' | 'content' | 'metadata';
  pattern: string;
  confidence: number; // 0-1
}

// Classified data record
export interface ClassifiedData {
  id: string;
  originalData: unknown;
  classification: DataClassification;
  sensitivity: SensitivityLevel;
  compliance: ComplianceStandard[];
  detectedPatterns: string[];
  confidence: number;
  classifiedAt: Date;
  classifiedBy: 'system' | string;
  labels: DataLabel[];
  protection: DataProtection;
  retention: RetentionPolicy;
}

// Data labels for categorization
export interface DataLabel {
  category: string;
  value: string;
  confidence: number;
  source: 'manual' | 'automatic' | 'inherited';
}

// Protection applied to classified data
export interface DataProtection {
  encrypted: boolean;
  encryptionAlgorithm?: string;
  accessControls: string[];
  requiresApproval: boolean;
  allowedRoles: string[];
  watermarked: boolean;
}

// Retention policy based on classification
export interface RetentionPolicy {
  retentionPeriod: number; // Days
  disposalMethod: 'secure_delete' | 'archive' | 'anonymize';
  legalHold: boolean;
  reviewDate: Date;
}

export class DataClassificationService {
  private static instance: DataClassificationService;
  private classificationRules = new Map<string, ClassificationRule>();
  private classifiedData = new Map<string, ClassifiedData>();

  private constructor() {
    this.initializeDefaultRules();
  }

  public static getInstance(): DataClassificationService {
    if (!DataClassificationService.instance) {
      DataClassificationService.instance = new DataClassificationService();
    }
    return DataClassificationService.instance;
  }

  /**
   * Classify data automatically
   */
  public async classifyData(
    id: string,
    data: unknown,
    context?: { filename?: string; metadata?: Record<string, unknown> }
  ): Promise<ClassifiedData> {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Apply classification rules
    const matchedRules: Array<{ rule: ClassificationRule; confidence: number }> = [];
    
    for (const rule of this.classificationRules.values()) {
      const confidence = this.evaluateRule(rule, dataString, context);
      if (confidence > 0) {
        matchedRules.push({ rule, confidence });
      }
    }
    
    // Sort by priority and confidence
    matchedRules.sort((a, b) => 
      (b.rule.priority * b.confidence) - (a.rule.priority * a.confidence)
    );
    
    // Determine final classification
    const bestMatch = matchedRules[0];
    const classification = bestMatch?.rule.classification || DataClassification.INTERNAL;
    const sensitivity = bestMatch?.rule.sensitivity || SensitivityLevel.INTERNAL;
    const compliance = bestMatch?.rule.compliance || [];
    
    // Generate labels
    const labels = this.generateLabels(dataString, context, matchedRules);
    
    // Apply protection policies
    const protection = this.determineProtection(classification, sensitivity);
    
    // Set retention policy
    const retention = this.getRetentionPolicy(classification, compliance);
    
    const classifiedData: ClassifiedData = {
      id,
      originalData: data,
      classification,
      sensitivity,
      compliance,
      detectedPatterns: matchedRules.map(m => m.rule.name),
      confidence: bestMatch?.confidence || 0,
      classifiedAt: new Date(),
      classifiedBy: 'system',
      labels,
      protection,
      retention,
    };
    
    this.classifiedData.set(id, classifiedData);
    
    // Audit classification
    await auditLogger.logEvent(
      AuditEventType.DATA_CREATE,
      'Data classified automatically',
      'success',
      {
        dataId: id,
        classification,
        sensitivity,
        confidence: classifiedData.confidence,
        rulesMatched: classifiedData.detectedPatterns.length,
        protectionApplied: protection.encrypted,
      },
      {
        userId: 'system',
        severity: this.getSeverityForClassification(classification),
        resource: `classified_data_${id}`,
      }
    );
    
    return classifiedData;
  }

  /**
   * Manually classify data with user override
   */
  public async manuallyClassifyData(
    id: string,
    classification: DataClassification,
    sensitivity: SensitivityLevel,
    userId: string,
    justification: string
  ): Promise<void> {
    const existingData = this.classifiedData.get(id);
    if (!existingData) {
      throw new Error(`Classified data not found: ${id}`);
    }
    
    // Check permissions for manual classification
    const hasPermission = await rbacService.checkPermission(
      { 
        userId, 
        userRoles: await rbacService.getUserRoles(userId),
        resourceType: 'system' as any
      },
      Permission.SECURITY_CONFIG
    );
    
    if (!hasPermission.granted) {
      throw new Error('Insufficient permissions for manual classification');
    }
    
    // Update classification
    existingData.classification = classification;
    existingData.sensitivity = sensitivity;
    existingData.classifiedBy = userId;
    existingData.classifiedAt = new Date();
    
    // Update protection based on new classification
    existingData.protection = this.determineProtection(classification, sensitivity);
    
    // Audit manual classification
    await auditLogger.logEvent(
      AuditEventType.DATA_UPDATE,
      'Data classification manually updated',
      'success',
      {
        dataId: id,
        newClassification: classification,
        newSensitivity: sensitivity,
        justification,
        previousClassification: existingData.classification,
      },
      {
        userId,
        severity: AuditSeverity.HIGH,
        resource: `classified_data_${id}`,
      }
    );
  }

  /**
   * Get classification for data
   */
  public getClassification(id: string): ClassifiedData | undefined {
    return this.classifiedData.get(id);
  }

  /**
   * Search classified data by criteria
   */
  public searchClassifiedData(criteria: {
    classification?: DataClassification;
    sensitivity?: SensitivityLevel;
    compliance?: ComplianceStandard;
    labels?: { category: string; value?: string }[];
  }): ClassifiedData[] {
    return Array.from(this.classifiedData.values()).filter(data => {
      if (criteria.classification && data.classification !== criteria.classification) {
        return false;
      }
      if (criteria.sensitivity && data.sensitivity !== criteria.sensitivity) {
        return false;
      }
      if (criteria.compliance && !data.compliance.includes(criteria.compliance)) {
        return false;
      }
      if (criteria.labels) {
        const hasAllLabels = criteria.labels.every(searchLabel => 
          data.labels.some(dataLabel => 
            dataLabel.category === searchLabel.category &&
            (!searchLabel.value || dataLabel.value === searchLabel.value)
          )
        );
        if (!hasAllLabels) return false;
      }
      return true;
    });
  }

  /**
   * Generate compliance report
   */
  public generateClassificationReport(): {
    summary: {
      totalData: number;
      byClassification: Record<string, number>;
      bySensitivity: Record<string, number>;
      protectedData: number;
      averageConfidence: number;
    };
    compliance: {
      gdprData: number;
      hipaaData: number;
      soxData: number;
      retentionIssues: number;
    };
    risks: {
      lowConfidenceClassifications: number;
      unprotectedSensitiveData: number;
      overRetainedData: number;
    };
  } {
    const allData = Array.from(this.classifiedData.values());
    
    const byClassification: Record<string, number> = {};
    const bySensitivity: Record<string, number> = {};
    
    let protectedCount = 0;
    let totalConfidence = 0;
    let gdprCount = 0;
    let hipaaCount = 0;
    let soxCount = 0;
    
    allData.forEach(data => {
      byClassification[data.classification] = (byClassification[data.classification] || 0) + 1;
      bySensitivity[data.sensitivity] = (bySensitivity[data.sensitivity] || 0) + 1;
      
      if (data.protection.encrypted) protectedCount++;
      totalConfidence += data.confidence;
      
      if (data.compliance.includes(ComplianceStandard.GDPR)) gdprCount++;
      if (data.compliance.includes(ComplianceStandard.HIPAA)) hipaaCount++;
      if (data.compliance.includes(ComplianceStandard.SOX)) soxCount++;
    });
    
    // Calculate risks
    const lowConfidence = allData.filter(d => d.confidence < 0.7).length;
    const unprotectedSensitive = allData.filter(d => 
      (d.sensitivity === SensitivityLevel.CONFIDENTIAL || 
       d.sensitivity === SensitivityLevel.RESTRICTED) && 
      !d.protection.encrypted
    ).length;
    const overRetained = allData.filter(d => 
      d.retention.reviewDate < new Date() && !d.retention.legalHold
    ).length;
    
    return {
      summary: {
        totalData: allData.length,
        byClassification,
        bySensitivity,
        protectedData: protectedCount,
        averageConfidence: allData.length > 0 ? totalConfidence / allData.length : 0,
      },
      compliance: {
        gdprData: gdprCount,
        hipaaData: hipaaCount,
        soxData: soxCount,
        retentionIssues: overRetained,
      },
      risks: {
        lowConfidenceClassifications: lowConfidence,
        unprotectedSensitiveData: unprotectedSensitive,
        overRetainedData: overRetained,
      },
    };
  }

  // Private helper methods

  private initializeDefaultRules(): void {
    const rules: ClassificationRule[] = [
      {
        id: 'ssn_pattern',
        name: 'Social Security Number',
        patterns: [
          { type: 'regex', pattern: '\\d{3}-?\\d{2}-?\\d{4}', confidence: 0.9 },
        ],
        classification: DataClassification.RESTRICTED,
        sensitivity: SensitivityLevel.RESTRICTED,
        compliance: [ComplianceStandard.GDPR, ComplianceStandard.HIPAA],
        autoApply: true,
        priority: 100,
      },
      {
        id: 'credit_card',
        name: 'Credit Card Number',
        patterns: [
          { type: 'regex', pattern: '\\d{4}[\\s\\-]?\\d{4}[\\s\\-]?\\d{4}[\\s\\-]?\\d{4}', confidence: 0.8 },
        ],
        classification: DataClassification.RESTRICTED,
        sensitivity: SensitivityLevel.RESTRICTED,
        compliance: [ComplianceStandard.PCI_DSS],
        autoApply: true,
        priority: 95,
      },
      {
        id: 'financial_keywords',
        name: 'Financial Information',
        patterns: [
          { type: 'keyword', pattern: 'bank account|routing number|financial', confidence: 0.7 },
        ],
        classification: DataClassification.CONFIDENTIAL,
        sensitivity: SensitivityLevel.CONFIDENTIAL,
        compliance: [ComplianceStandard.SOX],
        autoApply: true,
        priority: 80,
      },
      {
        id: 'medical_keywords',
        name: 'Medical Information',
        patterns: [
          { type: 'keyword', pattern: 'patient|diagnosis|medical record|treatment', confidence: 0.7 },
        ],
        classification: DataClassification.RESTRICTED,
        sensitivity: SensitivityLevel.RESTRICTED,
        compliance: [ComplianceStandard.HIPAA],
        autoApply: true,
        priority: 85,
      },
    ];
    
    rules.forEach(rule => {
      this.classificationRules.set(rule.id, rule);
    });
  }

  private evaluateRule(
    rule: ClassificationRule,
    data: string,
    context?: { filename?: string; metadata?: Record<string, unknown> }
  ): number {
    let maxConfidence = 0;
    
    for (const pattern of rule.patterns) {
      let confidence = 0;
      
      switch (pattern.type) {
        case 'regex':
          const regex = new RegExp(pattern.pattern, 'gi');
          if (regex.test(data)) {
            confidence = pattern.confidence;
          }
          break;
          
        case 'keyword':
          const keywords = pattern.pattern.split('|');
          const found = keywords.some(keyword => 
            data.toLowerCase().includes(keyword.toLowerCase())
          );
          if (found) {
            confidence = pattern.confidence;
          }
          break;
          
        case 'filename':
          if (context?.filename && context.filename.includes(pattern.pattern)) {
            confidence = pattern.confidence;
          }
          break;
      }
      
      maxConfidence = Math.max(maxConfidence, confidence);
    }
    
    return maxConfidence;
  }

  private generateLabels(
    data: string,
    context?: { filename?: string; metadata?: Record<string, unknown> },
    matchedRules?: Array<{ rule: ClassificationRule; confidence: number }>
  ): DataLabel[] {
    const labels: DataLabel[] = [];
    
    // Add labels based on matched rules
    matchedRules?.forEach(({ rule, confidence }) => {
      labels.push({
        category: 'classification_rule',
        value: rule.name,
        confidence,
        source: 'automatic',
      });
    });
    
    // Add file type label if filename available
    if (context?.filename) {
      const extension = context.filename.split('.').pop()?.toLowerCase();
      if (extension) {
        labels.push({
          category: 'file_type',
          value: extension,
          confidence: 1.0,
          source: 'automatic',
        });
      }
    }
    
    return labels;
  }

  private determineProtection(
    classification: DataClassification,
    sensitivity: SensitivityLevel
  ): DataProtection {
    const requiresEncryption = 
      classification === DataClassification.CONFIDENTIAL ||
      classification === DataClassification.RESTRICTED ||
      sensitivity === SensitivityLevel.CONFIDENTIAL ||
      sensitivity === SensitivityLevel.RESTRICTED;
      
    const requiresApproval = 
      classification === DataClassification.RESTRICTED ||
      sensitivity === SensitivityLevel.RESTRICTED;
      
    return {
      encrypted: requiresEncryption,
      encryptionAlgorithm: requiresEncryption ? 'AES-256-GCM' : undefined,
      accessControls: this.getAccessControlsForClassification(classification),
      requiresApproval,
      allowedRoles: this.getAllowedRoles(classification, sensitivity),
      watermarked: requiresApproval,
    };
  }

  private getAccessControlsForClassification(classification: DataClassification): string[] {
    const controls = ['authentication'];
    
    if (classification === DataClassification.CONFIDENTIAL) {
      controls.push('authorization', 'audit_logging');
    }
    
    if (classification === DataClassification.RESTRICTED) {
      controls.push('mfa', 'approval_workflow', 'need_to_know');
    }
    
    return controls;
  }

  private getAllowedRoles(
    classification: DataClassification,
    sensitivity: SensitivityLevel
  ): string[] {
    if (classification === DataClassification.RESTRICTED) {
      return ['security_officer', 'compliance_officer', 'super_admin'];
    }
    
    if (classification === DataClassification.CONFIDENTIAL) {
      return ['admin', 'security_officer', 'compliance_officer', 'super_admin'];
    }
    
    return ['user', 'contributor', 'admin', 'security_officer', 'compliance_officer', 'super_admin'];
  }

  private getRetentionPolicy(
    classification: DataClassification,
    compliance: ComplianceStandard[]
  ): RetentionPolicy {
    let retentionDays = 365; // Default 1 year
    
    // Adjust based on compliance requirements
    if (compliance.includes(ComplianceStandard.SOX)) {
      retentionDays = Math.max(retentionDays, 7 * 365); // 7 years for SOX
    }
    
    if (compliance.includes(ComplianceStandard.HIPAA)) {
      retentionDays = Math.max(retentionDays, 6 * 365); // 6 years for HIPAA
    }
    
    return {
      retentionPeriod: retentionDays,
      disposalMethod: classification === DataClassification.RESTRICTED ? 'secure_delete' : 'archive',
      legalHold: false,
      reviewDate: new Date(Date.now() + (retentionDays * 24 * 60 * 60 * 1000)),
    };
  }

  private getSeverityForClassification(classification: DataClassification): AuditSeverity {
    switch (classification) {
      case DataClassification.RESTRICTED:
        return AuditSeverity.HIGH;
      case DataClassification.CONFIDENTIAL:
        return AuditSeverity.MEDIUM;
      default:
        return AuditSeverity.LOW;
    }
  }
}

// Export singleton instance
export const dataClassificationService = DataClassificationService.getInstance();