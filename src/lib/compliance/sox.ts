import { auditLogger, AuditEventType, AuditSeverity } from '../security/auditLogger';
import { fieldLevelEncryptionService } from '../security/fieldLevelEncryption';

// SOX Section 302 & 404 requirements
export enum SOXRequirement {
  INTERNAL_CONTROLS = 'internal_controls',
  FINANCIAL_DISCLOSURE = 'financial_disclosure', 
  AUDIT_TRAIL = 'audit_trail',
  CHANGE_MANAGEMENT = 'change_management',
  ACCESS_CONTROLS = 'access_controls',
  DATA_RETENTION = 'data_retention',
  SEGREGATION_DUTIES = 'segregation_duties',
}

// Financial data categories under SOX
export enum FinancialDataType {
  REVENUE = 'revenue',
  EXPENSES = 'expenses',
  ASSETS = 'assets',
  LIABILITIES = 'liabilities',
  EQUITY = 'equity',
  CASH_FLOW = 'cash_flow',
  JOURNAL_ENTRIES = 'journal_entries',
  GENERAL_LEDGER = 'general_ledger',
  ACCOUNTS_PAYABLE = 'accounts_payable',
  ACCOUNTS_RECEIVABLE = 'accounts_receivable',
  INVENTORY = 'inventory',
  PAYROLL = 'payroll',
}

// SOX control types
export enum SOXControlType {
  PREVENTIVE = 'preventive',
  DETECTIVE = 'detective', 
  CORRECTIVE = 'corrective',
  AUTOMATED = 'automated',
  MANUAL = 'manual',
  IT_DEPENDENT = 'it_dependent',
}

export interface FinancialRecord {
  id: string;
  recordType: FinancialDataType;
  data: Record<string, unknown>;
  metadata: {
    created: Date;
    createdBy: string;
    lastModified: Date;
    modifiedBy: string;
    version: number;
    status: 'draft' | 'approved' | 'posted' | 'reversed';
  };
  controls: {
    authorizationLevel: 'junior' | 'senior' | 'manager' | 'executive';
    approvers: string[];
    approvalDate?: Date;
    segregationCompliant: boolean;
    reviewRequired: boolean;
  };
  audit: {
    changeHistory: FinancialRecordChange[];
    accessLog: FinancialAccess[];
    integrityHash: string;
    digitalSignature?: string;
  };
  retention: {
    retentionPeriod: number; // Years (SOX requires 7 years)
    disposalDate: Date;
    legalHold: boolean;
  };
}

export interface FinancialRecordChange {
  changeId: string;
  timestamp: Date;
  userId: string;
  fieldChanges: Record<string, { oldValue: unknown; newValue: unknown }>;
  justification: string;
  approvalRequired: boolean;
  approved: boolean;
  approvedBy?: string;
}

export interface FinancialAccess {
  userId: string;
  timestamp: Date;
  action: 'view' | 'edit' | 'approve' | 'post' | 'reverse';
  purpose: string;
  ipAddress: string;
  success: boolean;
}

export interface SOXControl {
  id: string;
  name: string;
  description: string;
  controlType: SOXControlType;
  riskArea: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  owner: string;
  testProcedures: string[];
  lastTested?: Date;
  testResult?: 'effective' | 'deficient' | 'not_tested';
  deficiencies: string[];
  remediationPlan?: string;
}

export interface SOXDeficiency {
  id: string;
  controlId: string;
  severity: 'significant' | 'material' | 'minor';
  description: string;
  discoveredDate: Date;
  discoveredBy: string;
  impact: string;
  remediationPlan: string;
  targetDate: Date;
  status: 'open' | 'in_progress' | 'resolved';
  resolvedDate?: Date;
}

export class SOXComplianceService {
  private static instance: SOXComplianceService;
  private financialRecords = new Map<string, FinancialRecord>();
  private soxControls = new Map<string, SOXControl>();
  private deficiencies = new Map<string, SOXDeficiency>();
  private userRoles = new Map<string, string[]>(); // User -> Roles mapping

  private constructor() {
    this.initializeStandardControls();
  }

  public static getInstance(): SOXComplianceService {
    if (!SOXComplianceService.instance) {
      SOXComplianceService.instance = new SOXComplianceService();
    }
    return SOXComplianceService.instance;
  }

  /**
   * Create financial record with SOX controls
   */
  public async createFinancialRecord(
    recordType: FinancialDataType,
    data: Record<string, unknown>,
    userId: string,
    authorizationLevel: string
  ): Promise<FinancialRecord> {
    // Encrypt sensitive financial data
    const encryptedData = await fieldLevelEncryptionService.encryptFields({
      data,
      autoDetect: true,
      preserveStructure: true,
    });

    // Generate integrity hash
    const integrityHash = await this.generateIntegrityHash(data);

    const record: FinancialRecord = {
      id: this.generateId(),
      recordType,
      data: encryptedData,
      metadata: {
        created: new Date(),
        createdBy: userId,
        lastModified: new Date(),
        modifiedBy: userId,
        version: 1,
        status: 'draft',
      },
      controls: {
        authorizationLevel: authorizationLevel as any,
        approvers: [],
        segregationCompliant: this.validateSegregationOfDuties(userId, 'create'),
        reviewRequired: this.requiresReview(recordType, data),
      },
      audit: {
        changeHistory: [],
        accessLog: [{
          userId,
          timestamp: new Date(),
          action: 'edit',
          purpose: 'Record creation',
          ipAddress: 'system',
          success: true,
        }],
        integrityHash,
      },
      retention: {
        retentionPeriod: 7, // SOX requires 7 years
        disposalDate: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000),
        legalHold: false,
      },
    };

    this.financialRecords.set(record.id, record);

    // SOX audit logging
    await auditLogger.logEvent(
      AuditEventType.SOX_TRANSACTION,
      'Financial record created',
      'success',
      {
        recordId: record.id,
        recordType,
        authorizationLevel,
        segregationCompliant: record.controls.segregationCompliant,
        encryptionStatus: 'encrypted',
      },
      {
        userId,
        severity: AuditSeverity.MEDIUM,
        resource: `financial_record_${record.id}`,
      }
    );

    return record;
  }

  /**
   * Update financial record with approval workflow
   */
  public async updateFinancialRecord(
    recordId: string,
    updates: Record<string, unknown>,
    userId: string,
    justification: string
  ): Promise<void> {
    const record = this.financialRecords.get(recordId);
    if (!record) {
      throw new Error(`Financial record not found: ${recordId}`);
    }

    // Validate authorization
    if (!this.canModifyRecord(userId, record)) {
      throw new Error('Insufficient authorization to modify record');
    }

    // Check segregation of duties
    if (!this.validateSegregationOfDuties(userId, 'modify')) {
      throw new Error('Segregation of duties violation');
    }

    // Decrypt existing data for comparison
    const existingData = await fieldLevelEncryptionService.decryptFields({
      encryptedData: record.data,
    });

    // Calculate changes
    const fieldChanges: Record<string, { oldValue: unknown; newValue: unknown }> = {};
    for (const [key, newValue] of Object.entries(updates)) {
      if (existingData[key] !== newValue) {
        fieldChanges[key] = {
          oldValue: existingData[key],
          newValue,
        };
      }
    }

    // Create change record
    const change: FinancialRecordChange = {
      changeId: this.generateId(),
      timestamp: new Date(),
      userId,
      fieldChanges,
      justification,
      approvalRequired: this.requiresApproval(record.recordType, fieldChanges),
      approved: false,
    };

    record.audit.changeHistory.push(change);

    // If approval required, don't apply changes yet
    if (change.approvalRequired) {
      await auditLogger.logEvent(
        AuditEventType.SOX_TRANSACTION,
        'Financial record change pending approval',
        'success',
        { recordId, changes: Object.keys(fieldChanges), justification },
        { userId, severity: AuditSeverity.HIGH }
      );
      return;
    }

    // Apply changes and update record
    await this.applyRecordChanges(record, updates, userId);
  }

  /**
   * Approve financial record changes
   */
  public async approveRecordChange(
    recordId: string,
    changeId: string,
    approverId: string
  ): Promise<void> {
    const record = this.financialRecords.get(recordId);
    if (!record) {
      throw new Error(`Financial record not found: ${recordId}`);
    }

    const change = record.audit.changeHistory.find(c => c.changeId === changeId);
    if (!change) {
      throw new Error(`Change record not found: ${changeId}`);
    }

    // Validate approval authority
    if (!this.canApprove(approverId, record)) {
      throw new Error('Insufficient authority to approve changes');
    }

    // Mark as approved
    change.approved = true;
    change.approvedBy = approverId;

    // Apply the changes
    const updates: Record<string, unknown> = {};
    for (const [field, change_] of Object.entries(change.fieldChanges)) {
      updates[field] = change_.newValue;
    }

    await this.applyRecordChanges(record, updates, change.userId);

    await auditLogger.logEvent(
      AuditEventType.SOX_TRANSACTION,
      'Financial record change approved',
      'success',
      { recordId, changeId, changes: Object.keys(change.fieldChanges) },
      { userId: approverId, severity: AuditSeverity.HIGH }
    );
  }

  /**
   * Test SOX controls
   */
  public async testSOXControl(
    controlId: string,
    testerId: string,
    testResults: {
      effective: boolean;
      findings: string[];
      recommendations: string[];
    }
  ): Promise<void> {
    const control = this.soxControls.get(controlId);
    if (!control) {
      throw new Error(`SOX control not found: ${controlId}`);
    }

    control.lastTested = new Date();
    control.testResult = testResults.effective ? 'effective' : 'deficient';

    if (!testResults.effective) {
      // Create deficiency record
      const deficiency: SOXDeficiency = {
        id: this.generateId(),
        controlId,
        severity: this.assessDeficiencySeverity(testResults.findings),
        description: testResults.findings.join('; '),
        discoveredDate: new Date(),
        discoveredBy: testerId,
        impact: 'Control deficiency may impact financial reporting',
        remediationPlan: testResults.recommendations.join('; '),
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        status: 'open',
      };

      this.deficiencies.set(deficiency.id, deficiency);
      control.deficiencies = testResults.findings;
    }

    await auditLogger.logEvent(
      AuditEventType.SOX_TRANSACTION,
      'SOX control tested',
      'success',
      {
        controlId,
        effective: testResults.effective,
        findings: testResults.findings.length,
      },
      { userId: testerId, severity: AuditSeverity.HIGH }
    );
  }

  /**
   * Generate SOX compliance report
   */
  public generateSOXComplianceReport(): {
    controlsEffectiveness: {
      total: number;
      effective: number;
      deficient: number;
      notTested: number;
    };
    deficiencies: {
      total: number;
      significant: number;
      material: number;
      minor: number;
      open: number;
    };
    financialRecords: {
      total: number;
      approved: number;
      pendingApproval: number;
      integrityIssues: number;
    };
    auditReadiness: {
      score: number; // 0-100
      criticalIssues: string[];
      recommendations: string[];
    };
  } {
    const controls = Array.from(this.soxControls.values());
    const deficiencies = Array.from(this.deficiencies.values());
    const records = Array.from(this.financialRecords.values());

    const effectiveControls = controls.filter(c => c.testResult === 'effective').length;
    const deficientControls = controls.filter(c => c.testResult === 'deficient').length;
    const notTestedControls = controls.filter(c => !c.testResult || c.testResult === 'not_tested').length;

    const openDeficiencies = deficiencies.filter(d => d.status === 'open');
    const significantDeficiencies = openDeficiencies.filter(d => d.severity === 'significant').length;
    const materialDeficiencies = openDeficiencies.filter(d => d.severity === 'material').length;

    const pendingApproval = records.filter(r => 
      r.audit.changeHistory.some(c => c.approvalRequired && !c.approved)
    ).length;

    // Calculate audit readiness score
    let score = 100;
    if (materialDeficiencies > 0) score -= 30;
    if (significantDeficiencies > 0) score -= 20;
    if (notTestedControls > controls.length * 0.1) score -= 15; // More than 10% untested
    if (pendingApproval > 0) score -= 10;

    const criticalIssues: string[] = [];
    if (materialDeficiencies > 0) {
      criticalIssues.push(`${materialDeficiencies} material control deficiencies`);
    }
    if (notTestedControls > 0) {
      criticalIssues.push(`${notTestedControls} controls not tested`);
    }

    return {
      controlsEffectiveness: {
        total: controls.length,
        effective: effectiveControls,
        deficient: deficientControls,
        notTested: notTestedControls,
      },
      deficiencies: {
        total: deficiencies.length,
        significant: significantDeficiencies,
        material: materialDeficiencies,
        minor: openDeficiencies.filter(d => d.severity === 'minor').length,
        open: openDeficiencies.length,
      },
      financialRecords: {
        total: records.length,
        approved: records.filter(r => r.metadata.status === 'approved').length,
        pendingApproval,
        integrityIssues: 0, // Would check integrity hashes
      },
      auditReadiness: {
        score: Math.max(0, score),
        criticalIssues,
        recommendations: this.generateRecommendations(criticalIssues),
      },
    };
  }

  // Private helper methods

  private initializeStandardControls(): void {
    const standardControls: Omit<SOXControl, 'id'>[] = [
      {
        name: 'Journal Entry Review',
        description: 'All journal entries must be reviewed and approved',
        controlType: SOXControlType.MANUAL,
        riskArea: 'Financial Reporting',
        frequency: 'daily',
        owner: 'Controller',
        testProcedures: ['Review approval workflow', 'Test segregation of duties'],
        testResult: 'not_tested',
        deficiencies: [],
      },
      {
        name: 'Access Controls',
        description: 'Restricted access to financial systems',
        controlType: SOXControlType.IT_DEPENDENT,
        riskArea: 'System Access',
        frequency: 'quarterly',
        owner: 'IT Security',
        testProcedures: ['Review user access', 'Test role assignments'],
        testResult: 'not_tested',
        deficiencies: [],
      },
    ];

    standardControls.forEach(control => {
      const fullControl: SOXControl = {
        id: this.generateId(),
        ...control,
      };
      this.soxControls.set(fullControl.id, fullControl);
    });
  }

  private async applyRecordChanges(
    record: FinancialRecord,
    updates: Record<string, unknown>,
    userId: string
  ): Promise<void> {
    // Decrypt existing data
    const existingData = await fieldLevelEncryptionService.decryptFields({
      encryptedData: record.data,
    });

    // Apply updates
    const updatedData = { ...existingData, ...updates };

    // Re-encrypt
    const encryptedData = await fieldLevelEncryptionService.encryptFields({
      data: updatedData,
      autoDetect: true,
      preserveStructure: true,
    });

    // Update record
    record.data = encryptedData;
    record.metadata.lastModified = new Date();
    record.metadata.modifiedBy = userId;
    record.metadata.version++;
    record.audit.integrityHash = await this.generateIntegrityHash(updatedData);

    // Log access
    record.audit.accessLog.push({
      userId,
      timestamp: new Date(),
      action: 'edit',
      purpose: 'Record update',
      ipAddress: 'system',
      success: true,
    });
  }

  private validateSegregationOfDuties(userId: string, action: string): boolean {
    // Simplified validation - in production, this would check complex role matrices
    const userRoles = this.userRoles.get(userId) || [];
    
    // User cannot both create and approve
    if (action === 'create' && userRoles.includes('approver')) {
      return false;
    }
    
    return true;
  }

  private canModifyRecord(userId: string, record: FinancialRecord): boolean {
    // Check if user can modify based on record status and authorization level
    if (record.metadata.status === 'posted') {
      return false; // Posted records cannot be modified
    }
    
    const userRoles = this.userRoles.get(userId) || [];
    return userRoles.includes('financial_user') || userRoles.includes('controller');
  }

  private canApprove(userId: string, record: FinancialRecord): boolean {
    const userRoles = this.userRoles.get(userId) || [];
    
    // Segregation check - approver cannot be the creator
    if (record.metadata.createdBy === userId) {
      return false;
    }
    
    return userRoles.includes('approver') || userRoles.includes('controller');
  }

  private requiresReview(recordType: FinancialDataType, data: Record<string, unknown>): boolean {
    // High-risk transactions require review
    const amount = data.amount as number;
    if (amount && amount > 10000) return true;
    
    // Certain record types always require review
    return [
      FinancialDataType.JOURNAL_ENTRIES,
      FinancialDataType.GENERAL_LEDGER,
    ].includes(recordType);
  }

  private requiresApproval(recordType: FinancialDataType, changes: Record<string, any>): boolean {
    // Certain record types always require approval
    const highRiskRecordTypes = [
      FinancialDataType.JOURNAL_ENTRIES,
      FinancialDataType.GENERAL_LEDGER,
      FinancialDataType.CASH_FLOW,
      FinancialDataType.PAYROLL,
    ];

    if (highRiskRecordTypes.includes(recordType)) {
      return true;
    }

    // Material changes require approval
    const materialFields = ['amount', 'account', 'description'];
    return Object.keys(changes).some(field => materialFields.includes(field));
  }

  private assessDeficiencySeverity(findings: string[]): 'significant' | 'material' | 'minor' {
    // Simplified assessment - in production, this would be more sophisticated
    if (findings.some(f => f.includes('material') || f.includes('critical'))) {
      return 'material';
    }
    if (findings.length > 2) {
      return 'significant';
    }
    return 'minor';
  }

  private generateRecommendations(issues: string[]): string[] {
    const recommendations: string[] = [];
    
    if (issues.some(i => i.includes('material'))) {
      recommendations.push('Immediately remediate all material control deficiencies');
    }
    if (issues.some(i => i.includes('not tested'))) {
      recommendations.push('Complete testing of all SOX controls before quarter end');
    }
    
    return recommendations;
  }

  private async generateIntegrityHash(data: Record<string, unknown>): Promise<string> {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataString));
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private generateId(): string {
    return `sox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const soxComplianceService = SOXComplianceService.getInstance();