import { encryptionService } from '../security/encryption';

// Audit event types for comprehensive logging
export enum AuditEventType {
  // Authentication & Authorization
  LOGIN = 'auth.login',
  LOGOUT = 'auth.logout',
  LOGIN_FAILED = 'auth.login_failed',
  PASSWORD_CHANGE = 'auth.password_change',
  PERMISSION_GRANT = 'auth.permission_grant',
  PERMISSION_REVOKE = 'auth.permission_revoke',
  
  // Data Access & Modification
  DATA_ACCESS = 'data.access',
  DATA_CREATE = 'data.create',
  DATA_UPDATE = 'data.update',
  DATA_DELETE = 'data.delete',
  DATA_EXPORT = 'data.export',
  DATA_IMPORT = 'data.import',
  
  // File Operations
  FILE_UPLOAD = 'file.upload',
  FILE_DOWNLOAD = 'file.download',
  FILE_DELETE = 'file.delete',
  FILE_SHARE = 'file.share',
  FILE_ACCESS = 'file.access',
  
  // Security Events
  ENCRYPTION_KEY_CREATE = 'security.key_create',
  ENCRYPTION_KEY_ROTATE = 'security.key_rotate',
  ENCRYPTION_KEY_REVOKE = 'security.key_revoke',
  SECURITY_BREACH = 'security.breach',
  
  // Compliance Events
  GDPR_REQUEST = 'compliance.gdpr_request',
  HIPAA_ACCESS = 'compliance.hipaa_access',
  SOX_TRANSACTION = 'compliance.sox_transaction',
  DATA_RETENTION = 'compliance.data_retention',
  
  // System Events
  SYSTEM_START = 'system.start',
  SYSTEM_SHUTDOWN = 'system.shutdown',
  CONFIG_CHANGE = 'system.config_change',
  BACKUP_START = 'system.backup_start',
  BACKUP_COMPLETE = 'system.backup_complete',
}

export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent?: string;
  resource?: string;
  action: string;
  outcome: 'success' | 'failure' | 'error';
  details: Record<string, unknown>;
  metadata: {
    source: string;
    version: string;
    correlationId?: string;
  };
  integrity: {
    hash: string;
    signature?: string;
    previousHash?: string;
  };
}

export interface AuditLogChain {
  chainId: string;
  events: AuditEvent[];
  startHash: string;
  endHash: string;
  created: Date;
  sealed: boolean;
}

export interface AuditQuery {
  startDate?: Date;
  endDate?: Date;
  eventTypes?: AuditEventType[];
  userIds?: string[];
  severity?: AuditSeverity[];
  resources?: string[];
  outcome?: 'success' | 'failure' | 'error';
  limit?: number;
  offset?: number;
}

export class TamperProofAuditLogger {
  private static instance: TamperProofAuditLogger;
  private auditChains = new Map<string, AuditLogChain>();
  private currentChain: AuditLogChain | null = null;
  private chainSize = 1000; // Events per chain
  private signingKey = 'audit_signing_key';

  private constructor() {
    this.initializeAuditChain();
  }

  public static getInstance(): TamperProofAuditLogger {
    if (!TamperProofAuditLogger.instance) {
      TamperProofAuditLogger.instance = new TamperProofAuditLogger();
    }
    return TamperProofAuditLogger.instance;
  }

  /**
   * Log audit event with tamper-proof integrity
   */
  public async logEvent(
    eventType: AuditEventType,
    action: string,
    outcome: 'success' | 'failure' | 'error',
    details: Record<string, unknown>,
    options?: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      resource?: string;
      severity?: AuditSeverity;
      correlationId?: string;
    }
  ): Promise<string> {
    const event: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      eventType,
      severity: options?.severity || this.calculateSeverity(eventType, outcome),
      userId: options?.userId,
      sessionId: options?.sessionId,
      ipAddress: options?.ipAddress || 'unknown',
      userAgent: options?.userAgent,
      resource: options?.resource,
      action,
      outcome,
      details: this.sanitizeDetails(details),
      metadata: {
        source: 'audit-logger',
        version: '1.0',
        correlationId: options?.correlationId,
      },
      integrity: {
        hash: '',
        previousHash: this.getLastEventHash(),
      },
    };

    // Calculate event hash
    event.integrity.hash = await this.calculateEventHash(event);
    
    // Sign event for non-repudiation
    event.integrity.signature = await this.signEvent(event);

    // Add to current chain
    await this.addEventToChain(event);

    // Check if compliance notification needed
    if (this.requiresImmediateNotification(event)) {
      this.notifyCompliance(event);
    }

    return event.id;
  }

  /**
   * Query audit logs with integrity verification
   */
  public async queryEvents(query: AuditQuery): Promise<{
    events: AuditEvent[];
    totalCount: number;
    integrityStatus: 'verified' | 'compromised' | 'warning';
    integrityDetails: string[];
  }> {
    const allEvents = this.getAllEvents();
    let filteredEvents = allEvents;

    // Apply filters
    if (query.startDate) {
      filteredEvents = filteredEvents.filter(e => e.timestamp >= query.startDate!);
    }
    if (query.endDate) {
      filteredEvents = filteredEvents.filter(e => e.timestamp <= query.endDate!);
    }
    if (query.eventTypes?.length) {
      filteredEvents = filteredEvents.filter(e => query.eventTypes!.includes(e.eventType));
    }
    if (query.userIds?.length) {
      filteredEvents = filteredEvents.filter(e => e.userId && query.userIds!.includes(e.userId));
    }
    if (query.severity?.length) {
      filteredEvents = filteredEvents.filter(e => query.severity!.includes(e.severity));
    }
    if (query.resources?.length) {
      filteredEvents = filteredEvents.filter(e => e.resource && query.resources!.includes(e.resource));
    }
    if (query.outcome) {
      filteredEvents = filteredEvents.filter(e => e.outcome === query.outcome);
    }

    // Sort by timestamp
    filteredEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Apply pagination
    const totalCount = filteredEvents.length;
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    const paginatedEvents = filteredEvents.slice(offset, offset + limit);

    // Verify integrity
    const integrityCheck = await this.verifyIntegrity(paginatedEvents);

    return {
      events: paginatedEvents,
      totalCount,
      integrityStatus: integrityCheck.status,
      integrityDetails: integrityCheck.details,
    };
  }

  /**
   * Export audit logs for compliance reporting
   */
  public async exportAuditLogs(
    format: 'json' | 'csv' | 'xml',
    query?: AuditQuery
  ): Promise<{
    data: string;
    integrity: {
      checksum: string;
      eventCount: number;
      exportTimestamp: Date;
    };
  }> {
    const result = await this.queryEvents(query || {});
    
    let exportData: string;
    switch (format) {
      case 'json':
        exportData = JSON.stringify(result.events, null, 2);
        break;
      case 'csv':
        exportData = this.convertToCSV(result.events);
        break;
      case 'xml':
        exportData = this.convertToXML(result.events);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    const checksum = await this.calculateChecksum(exportData);
    
    return {
      data: exportData,
      integrity: {
        checksum,
        eventCount: result.events.length,
        exportTimestamp: new Date(),
      },
    };
  }

  /**
   * Verify audit log integrity
   */
  public async verifyIntegrity(events?: AuditEvent[]): Promise<{
    status: 'verified' | 'compromised' | 'warning';
    details: string[];
  }> {
    const eventsToVerify = events || this.getAllEvents();
    const issues: string[] = [];

    // Verify hash chain integrity
    for (let i = 1; i < eventsToVerify.length; i++) {
      const currentEvent = eventsToVerify[i];
      const previousEvent = eventsToVerify[i - 1];
      
      if (currentEvent.integrity.previousHash !== previousEvent.integrity.hash) {
        issues.push(`Hash chain broken at event ${currentEvent.id}`);
      }
    }

    // Verify individual event hashes
    for (const event of eventsToVerify) {
      const calculatedHash = await this.calculateEventHash({
        ...event,
        integrity: { ...event.integrity, hash: '' }
      });
      
      if (calculatedHash !== event.integrity.hash) {
        issues.push(`Event ${event.id} hash verification failed`);
      }
    }

    // Verify signatures
    for (const event of eventsToVerify) {
      if (event.integrity.signature) {
        const isValidSignature = await this.verifySignature(event);
        if (!isValidSignature) {
          issues.push(`Event ${event.id} signature verification failed`);
        }
      }
    }

    let status: 'verified' | 'compromised' | 'warning';
    if (issues.length === 0) {
      status = 'verified';
    } else if (issues.some(issue => issue.includes('hash') || issue.includes('signature'))) {
      status = 'compromised';
    } else {
      status = 'warning';
    }

    return { status, details: issues };
  }

  /**
   * Generate compliance report
   */
  public async generateComplianceReport(
    standard: 'sox' | 'hipaa' | 'gdpr' | 'pci_dss',
    startDate: Date,
    endDate: Date
  ): Promise<{
    standard: string;
    period: { start: Date; end: Date };
    summary: {
      totalEvents: number;
      criticalEvents: number;
      failedEvents: number;
      userAccesses: number;
    };
    compliance: {
      status: 'compliant' | 'non_compliant' | 'warning';
      issues: string[];
      recommendations: string[];
    };
    events: AuditEvent[];
  }> {
    const query: AuditQuery = {
      startDate,
      endDate,
      eventTypes: this.getComplianceEventTypes(standard),
    };

    const result = await this.queryEvents(query);
    
    const summary = {
      totalEvents: result.events.length,
      criticalEvents: result.events.filter(e => e.severity === AuditSeverity.CRITICAL).length,
      failedEvents: result.events.filter(e => e.outcome === 'failure' || e.outcome === 'error').length,
      userAccesses: new Set(result.events.map(e => e.userId).filter(Boolean)).size,
    };

    const compliance = this.assessCompliance(standard, result.events);

    return {
      standard,
      period: { start: startDate, end: endDate },
      summary,
      compliance,
      events: result.events,
    };
  }

  // Private helper methods

  private initializeAuditChain(): void {
    const chainId = this.generateChainId();
    this.currentChain = {
      chainId,
      events: [],
      startHash: this.generateGenesisHash(),
      endHash: '',
      created: new Date(),
      sealed: false,
    };
    this.auditChains.set(chainId, this.currentChain);
  }

  private async addEventToChain(event: AuditEvent): Promise<void> {
    if (!this.currentChain) {
      this.initializeAuditChain();
    }

    this.currentChain!.events.push(event);

    // Seal chain if it reaches size limit
    if (this.currentChain!.events.length >= this.chainSize) {
      await this.sealCurrentChain();
      this.initializeAuditChain();
    }
  }

  private async sealCurrentChain(): Promise<void> {
    if (!this.currentChain || this.currentChain.events.length === 0) return;

    const lastEvent = this.currentChain.events[this.currentChain.events.length - 1];
    this.currentChain.endHash = lastEvent.integrity.hash;
    this.currentChain.sealed = true;

    // In production, this sealed chain would be stored immutably
    console.log(`Audit chain ${this.currentChain.chainId} sealed with ${this.currentChain.events.length} events`);
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChainId(): string {
    return `chain_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private generateGenesisHash(): string {
    return `genesis_${Date.now()}`;
  }

  private getLastEventHash(): string | undefined {
    if (!this.currentChain || this.currentChain.events.length === 0) {
      return this.currentChain?.startHash;
    }
    return this.currentChain.events[this.currentChain.events.length - 1].integrity.hash;
  }

  private async calculateEventHash(event: AuditEvent): Promise<string> {
    const eventData = {
      ...event,
      integrity: { previousHash: event.integrity.previousHash }
    };
    const dataString = JSON.stringify(eventData);
    const encoder = new TextEncoder();
    const hashBuffer = await encryptionService.generateHash(encoder.encode(dataString));
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async signEvent(event: AuditEvent): Promise<string> {
    const eventString = JSON.stringify(event);
    const encoder = new TextEncoder();
    const signature = await encryptionService.generateHMAC(encoder.encode(eventString), this.signingKey);
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async verifySignature(event: AuditEvent): Promise<boolean> {
    if (!event.integrity.signature) return false;
    
    const eventString = JSON.stringify({ ...event, integrity: { ...event.integrity, signature: undefined } });
    const encoder = new TextEncoder();
    const expectedSignature = await encryptionService.generateHMAC(encoder.encode(eventString), this.signingKey);
    const expectedSigHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return expectedSigHex === event.integrity.signature;
  }

  private async calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashBuffer = await encryptionService.generateHash(encoder.encode(data));
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...details };
    
    // Remove or mask sensitive fields
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'ssn', 'creditCard'];
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private calculateSeverity(eventType: AuditEventType, outcome: string): AuditSeverity {
    if (outcome === 'failure' || outcome === 'error') {
      if (eventType.includes('security') || eventType.includes('breach')) {
        return AuditSeverity.CRITICAL;
      }
      return AuditSeverity.HIGH;
    }
    
    if (eventType.includes('security') || eventType.includes('compliance')) {
      return AuditSeverity.MEDIUM;
    }
    
    return AuditSeverity.LOW;
  }

  private requiresImmediateNotification(event: AuditEvent): boolean {
    return event.severity === AuditSeverity.CRITICAL || 
           event.eventType === AuditEventType.SECURITY_BREACH;
  }

  private notifyCompliance(event: AuditEvent): void {
    console.log(`COMPLIANCE ALERT: ${event.eventType} - ${event.action} (Severity: ${event.severity})`);
  }

  private getAllEvents(): AuditEvent[] {
    const allEvents: AuditEvent[] = [];
    for (const chain of this.auditChains.values()) {
      allEvents.push(...chain.events);
    }
    return allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private convertToCSV(events: AuditEvent[]): string {
    const headers = ['ID', 'Timestamp', 'Event Type', 'User ID', 'Action', 'Outcome', 'IP Address', 'Resource'];
    const rows = events.map(event => [
      event.id,
      event.timestamp.toISOString(),
      event.eventType,
      event.userId || '',
      event.action,
      event.outcome,
      event.ipAddress,
      event.resource || '',
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private convertToXML(events: AuditEvent[]): string {
    const xmlEvents = events.map(event => 
      `<event>
        <id>${event.id}</id>
        <timestamp>${event.timestamp.toISOString()}</timestamp>
        <type>${event.eventType}</type>
        <user>${event.userId || ''}</user>
        <action>${event.action}</action>
        <outcome>${event.outcome}</outcome>
        <ip>${event.ipAddress}</ip>
        <resource>${event.resource || ''}</resource>
      </event>`
    ).join('\n');
    
    return `<?xml version="1.0" encoding="UTF-8"?><auditLog>${xmlEvents}</auditLog>`;
  }

  private getComplianceEventTypes(standard: string): AuditEventType[] {
    const eventMap = {
      sox: [AuditEventType.DATA_CREATE, AuditEventType.DATA_UPDATE, AuditEventType.DATA_DELETE, AuditEventType.SOX_TRANSACTION],
      hipaa: [AuditEventType.DATA_ACCESS, AuditEventType.FILE_ACCESS, AuditEventType.HIPAA_ACCESS],
      gdpr: [AuditEventType.DATA_ACCESS, AuditEventType.DATA_EXPORT, AuditEventType.GDPR_REQUEST],
      pci_dss: [AuditEventType.DATA_ACCESS, AuditEventType.SECURITY_BREACH],
    };
    
    return eventMap[standard as keyof typeof eventMap] || [];
  }

  private assessCompliance(standard: string, events: AuditEvent[]): {
    status: 'compliant' | 'non_compliant' | 'warning';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Basic compliance checks
    const failedEvents = events.filter(e => e.outcome === 'failure' || e.outcome === 'error');
    if (failedEvents.length > events.length * 0.1) { // More than 10% failure rate
      issues.push('High failure rate detected');
      recommendations.push('Investigate and resolve system issues');
    }
    
    // Standard-specific compliance checks
    switch (standard) {
      case 'sox':
        const soxEvents = events.filter(e => e.eventType === AuditEventType.SOX_TRANSACTION);
        if (soxEvents.length === 0) {
          issues.push('No SOX transaction events found');
          recommendations.push('Ensure all financial transactions are properly audited');
        }
        break;
      case 'hipaa':
        const hipaaEvents = events.filter(e => e.eventType === AuditEventType.HIPAA_ACCESS);
        const dataAccessEvents = events.filter(e => e.eventType === AuditEventType.DATA_ACCESS);
        if (dataAccessEvents.length > 0 && hipaaEvents.length === 0) {
          issues.push('Data access events without HIPAA compliance logging');
          recommendations.push('Ensure all healthcare data access is properly logged under HIPAA standards');
        }
        break;
      case 'gdpr':
        const gdprEvents = events.filter(e => e.eventType === AuditEventType.GDPR_REQUEST);
        const dataExports = events.filter(e => e.eventType === AuditEventType.DATA_EXPORT);
        if (dataExports.length > gdprEvents.length * 2) {
          issues.push('High data export activity without corresponding GDPR requests');
          recommendations.push('Verify all data exports comply with GDPR requirements');
        }
        break;
      case 'pci_dss':
        const securityEvents = events.filter(e => e.eventType === AuditEventType.SECURITY_BREACH);
        if (securityEvents.length > 0) {
          issues.push('Security breach events detected');
          recommendations.push('Review and address all security incidents for PCI DSS compliance');
        }
        break;
      default:
        recommendations.push(`Unknown compliance standard: ${standard}`);
    }
    
    const status = issues.length === 0 ? 'compliant' : 'warning';
    
    return { status, issues, recommendations };
  }
}

// Export singleton instance
export const auditLogger = TamperProofAuditLogger.getInstance();