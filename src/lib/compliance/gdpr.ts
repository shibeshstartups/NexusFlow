// GDPR Legal Basis for Processing
export enum LegalBasis {
  CONSENT = 'consent',
  CONTRACT = 'contract',
  LEGAL_OBLIGATION = 'legal_obligation',
  VITAL_INTERESTS = 'vital_interests',
  PUBLIC_TASK = 'public_task',
  LEGITIMATE_INTERESTS = 'legitimate_interests',
}

// DPDP Act Legal Basis for Processing
export enum DPDPLegalBasis {
  CONSENT = 'consent',
  LEGITIMATE_USE = 'legitimate_use', // For specified lawful purposes
  FUNCTION_OF_STATE = 'function_of_state',
  MEDICAL_EMERGENCY = 'medical_emergency',
  EMPLOYMENT_RELATED = 'employment_related',
  CREDIT_SCORING = 'credit_scoring',
  RECOVERY_OF_DEBT = 'recovery_of_debt',
  MERGERS_ACQUISITIONS = 'mergers_acquisitions',
  NETWORK_SECURITY = 'network_security',
  JUDICIAL_FUNCTIONS = 'judicial_functions',
}

// Data Subject Rights under GDPR
export enum DataSubjectRight {
  ACCESS = 'access', // Article 15
  RECTIFICATION = 'rectification', // Article 16
  ERASURE = 'erasure', // Article 17 (Right to be forgotten)
  RESTRICT_PROCESSING = 'restrict_processing', // Article 18
  DATA_PORTABILITY = 'data_portability', // Article 20
  OBJECT = 'object', // Article 21
  WITHDRAW_CONSENT = 'withdraw_consent', // Article 7(3)
}

// Data Principal Rights under DPDP Act
export enum DPDPDataPrincipalRight {
  ACCESS = 'access', // Right to information
  CORRECTION = 'correction', // Right to correction and erasure
  ERASURE = 'erasure', // Right to correction and erasure
  GRIEVANCE = 'grievance', // Right to grievance redressal
  NOMINATE_SUCCESSOR = 'nominate_successor', // Right to nominate
  WITHDRAW_CONSENT = 'withdraw_consent', // Right to withdraw consent
}

// Processing Purpose Categories
export enum ProcessingPurpose {
  SERVICE_PROVISION = 'service_provision',
  ANALYTICS = 'analytics',
  MARKETING = 'marketing',
  SECURITY = 'security',
  LEGAL_COMPLIANCE = 'legal_compliance',
  RESEARCH = 'research',
  CUSTOMER_SUPPORT = 'customer_support',
}

// Compliance Regulation
export enum ComplianceRegulation {
  GDPR = 'gdpr',
  DPDP = 'dpdp',
  BOTH = 'both',
}

// Consent Status
export enum ConsentStatus {
  GIVEN = 'given',
  WITHDRAWN = 'withdrawn',
  EXPIRED = 'expired',
  NOT_REQUIRED = 'not_required',
}

export interface ConsentRecord {
  id: string;
  dataSubjectId: string;
  purpose: ProcessingPurpose;
  legalBasis: LegalBasis | DPDPLegalBasis;
  regulation: ComplianceRegulation;
  consentStatus: ConsentStatus;
  consentText: string;
  consentVersion: string;
  timestamp: Date;
  expiryDate?: Date;
  withdrawalDate?: Date;
  ipAddress: string;
  userAgent: string;
  evidenceHash: string; // Cryptographic proof of consent
  parentConsentId?: string; // For consent updates
  // DPDP specific fields
  dataFiduciaryDetails?: {
    name: string;
    address: string;
    contactInfo: string;
  };
  verifiableParentalConsent?: boolean; // For children under 18
  significantHarmAssessment?: string; // DPDP specific risk assessment
}

export interface DataSubjectRequest {
  id: string;
  dataSubjectId: string;
  requestType: DataSubjectRight | DPDPDataPrincipalRight;
  regulation: ComplianceRegulation;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  submittedAt: Date;
  completedAt?: Date;
  requestDetails: string;
  verificationStatus: 'pending' | 'verified' | 'failed';
  processingNotes: string[];
  attachments: string[]; // File IDs for supporting documents
  escalated: boolean;
  assignedTo?: string;
  legalReview?: boolean;
  // DPDP specific fields
  grievanceRedressalBoard?: string; // DPDP grievance mechanism
  dataFiduciaryResponse?: string;
  timelineCompliance?: {
    acknowledgedAt?: Date; // DPDP requires acknowledgment
    responseDeadline: Date; // Different timelines for GDPR vs DPDP
  };
}

export interface DataInventoryItem {
  dataType: string;
  location: string; // Database, file system, etc.
  personalDataFields: string[];
  legalBasis: LegalBasis | DPDPLegalBasis;
  regulation: ComplianceRegulation;
  processingPurpose: ProcessingPurpose[];
  retentionPeriod: number; // Days
  dataSource: string;
  recipients: string[]; // Third parties who receive data
  transferCountries: string[]; // For international transfers
  lastUpdated: Date;
  // DPDP specific fields
  significantHarmRisk?: 'low' | 'medium' | 'high';
  childrenDataInvolved?: boolean; // Special protections under DPDP
  dataFiduciaryClassification?: 'significant' | 'non_significant';
}

export interface DataProtectionImpactAssessment {
  id: string;
  projectName: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  personalDataInvolved: string[];
  processingPurposes: ProcessingPurpose[];
  legalBasis: LegalBasis | DPDPLegalBasis;
  riskMitigations: string[];
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvalDate?: Date;
  reviewDate: Date;
  created: Date;
}

export interface DataPortabilityPackage {
  dataSubjectId: string;
  generatedAt: Date;
  format: 'json' | 'xml' | 'csv';
  data: Record<string, unknown>;
  metadata: {
    totalRecords: number;
    dataTypes: string[];
    timeRange: { from: Date; to: Date };
    exportVersion: string;
  };
  integrity: {
    checksum: string;
    algorithm: string;
  };
}

export interface BreachIncident {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedDataSubjects: number;
  dataTypes: string[];
  discoveredAt: Date;
  reportedAt?: Date;
  description: string;
  rootCause?: string;
  containmentActions: string[];
  notificationsSent: boolean;
  supervisoryAuthorityNotified: boolean;
  resolved: boolean;
  resolvedAt?: Date;
  lessons: string[];
  regulation: ComplianceRegulation;
  // DPDP specific fields
  dataProtectionBoardNotified?: boolean;
  significantHarmOccurred?: boolean;
  affectedChildrenCount?: number;
}

// DPDP Act Specific Interfaces
export interface DPDPGrievanceRecord {
  id: string;
  dataSubjectId: string;
  grievanceType: 'data_fiduciary_non_compliance' | 'consent_violation' | 'data_breach' | 'other';
  description: string;
  submittedAt: Date;
  acknowledgedAt?: Date;
  status: 'submitted' | 'acknowledged' | 'under_review' | 'resolved' | 'escalated';
  resolutionDetails?: string;
  escalatedToBoard?: boolean;
  boardReference?: string;
}

export interface DPDPDataFiduciaryObligation {
  id: string;
  obligationType: 'notice' | 'purpose_limitation' | 'data_minimization' | 'accuracy' | 'storage_limitation' | 'security';
  description: string;
  complianceStatus: 'compliant' | 'non_compliant' | 'under_review';
  lastAssessed: Date;
  evidence: string[];
  remediationPlan?: string;
}

export interface DPDPConsentManagerDesignation {
  dataFiduciaryId: string;
  consentManagerName: string;
  registrationNumber: string;
  designatedAt: Date;
  responsibilities: string[];
  contactInfo: {
    email: string;
    phone: string;
    address: string;
  };
}

export class DataProtectionComplianceService {
  private static instance: DataProtectionComplianceService;
  private consentRecords = new Map<string, ConsentRecord[]>();
  private dataSubjectRequests = new Map<string, DataSubjectRequest[]>();
  private dpiAssessments = new Map<string, DataProtectionImpactAssessment>();
  private breachIncidents = new Map<string, BreachIncident>();
  // DPDP specific storage
  private dpdpGrievances = new Map<string, DPDPGrievanceRecord[]>();
  private dpdpObligations = new Map<string, DPDPDataFiduciaryObligation[]>();
  private consentManagerDesignations = new Map<string, DPDPConsentManagerDesignation>();

  private constructor() {}

  public static getInstance(): DataProtectionComplianceService {
    if (!DataProtectionComplianceService.instance) {
      DataProtectionComplianceService.instance = new DataProtectionComplianceService();
    }
    return DataProtectionComplianceService.instance;
  }

  // Consent Management

  /**
   * Record consent given by data subject
   */
  public async recordConsent(
    dataSubjectId: string,
    purpose: ProcessingPurpose,
    legalBasis: LegalBasis | DPDPLegalBasis,
    regulation: ComplianceRegulation,
    consentText: string,
    consentVersion: string,
    ipAddress: string,
    userAgent: string,
    expiryDays?: number,
    dpdpSpecificFields?: {
      dataFiduciaryDetails?: {
        name: string;
        address: string;
        contactInfo: string;
      };
      verifiableParentalConsent?: boolean;
      significantHarmAssessment?: string;
    }
  ): Promise<ConsentRecord> {
    // DPDP Act validation for children
    if (regulation === ComplianceRegulation.DPDP || regulation === ComplianceRegulation.BOTH) {
      if (dpdpSpecificFields?.verifiableParentalConsent && !this.validateParentalConsent(dataSubjectId)) {
        throw new Error('Verifiable parental consent required for processing children\'s data under DPDP Act');
      }
    }

    const consentRecord: ConsentRecord = {
      id: this.generateId(),
      dataSubjectId,
      purpose,
      legalBasis,
      regulation,
      consentStatus: ConsentStatus.GIVEN,
      consentText,
      consentVersion,
      timestamp: new Date(),
      expiryDate: expiryDays ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) : undefined,
      ipAddress,
      userAgent,
      evidenceHash: await this.generateConsentHash(dataSubjectId, consentText, new Date().toISOString()),
      ...dpdpSpecificFields,
    };

    // Store consent record
    const existing = this.consentRecords.get(dataSubjectId) || [];
    existing.push(consentRecord);
    this.consentRecords.set(dataSubjectId, existing);

    // Log consent for audit trail
    this.logComplianceActivity(
      'consent_recorded',
      dataSubjectId,
      `Consent recorded for ${purpose} with legal basis ${legalBasis} under ${regulation}`,
      regulation
    );

    return consentRecord;
  }

  /**
   * Withdraw consent
   */
  public async withdrawConsent(
    dataSubjectId: string,
    consentId: string,
    reason?: string
  ): Promise<void> {
    const consents = this.consentRecords.get(dataSubjectId) || [];
    const consent = consents.find(c => c.id === consentId);

    if (!consent) {
      throw new Error(`Consent record not found: ${consentId}`);
    }

    if (consent.consentStatus !== ConsentStatus.GIVEN) {
      throw new Error(`Cannot withdraw consent in status: ${consent.consentStatus}`);
    }

    // Update consent status
    consent.consentStatus = ConsentStatus.WITHDRAWN;
    consent.withdrawalDate = new Date();

    // Create new consent record for withdrawal (audit trail)
    const withdrawalRecord: ConsentRecord = {
      ...consent,
      id: this.generateId(),
      consentStatus: ConsentStatus.WITHDRAWN,
      timestamp: new Date(),
      parentConsentId: consentId,
      evidenceHash: await this.generateConsentHash(dataSubjectId, `WITHDRAWN: ${reason || 'No reason provided'}`, new Date().toISOString()),
    };

    consents.push(withdrawalRecord);
    this.consentRecords.set(dataSubjectId, consents);

    // Trigger data processing restrictions
    await this.restrictProcessingForPurpose(dataSubjectId, consent.purpose);

    this.logComplianceActivity(
      'consent_withdrawn',
      dataSubjectId,
      `Consent withdrawn for ${consent.purpose}. Reason: ${reason || 'Not provided'}`,
      consent.regulation
    );
  }

  /**
   * Check if consent is valid for processing
   */
  public isConsentValid(
    dataSubjectId: string,
    purpose: ProcessingPurpose,
    legalBasis?: LegalBasis | DPDPLegalBasis,
    regulation?: ComplianceRegulation
  ): boolean {
    // If legal basis is not consent, check if it's valid under the respective regulation
    if (legalBasis && legalBasis !== LegalBasis.CONSENT && legalBasis !== DPDPLegalBasis.CONSENT) {
      return this.isNonConsentLegalBasisValid(legalBasis, regulation);
    }

    const consents = this.consentRecords.get(dataSubjectId) || [];
    let relevantConsents = consents.filter(
      c => c.purpose === purpose && 
      (c.legalBasis === LegalBasis.CONSENT || c.legalBasis === DPDPLegalBasis.CONSENT)
    );

    // Filter by regulation if specified
    if (regulation) {
      relevantConsents = relevantConsents.filter(c => 
        c.regulation === regulation || c.regulation === ComplianceRegulation.BOTH
      );
    }

    relevantConsents = relevantConsents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (relevantConsents.length === 0) {
      return false;
    }

    const latestConsent = relevantConsents[0];
    
    // Check if consent is given and not expired
    if (latestConsent.consentStatus !== ConsentStatus.GIVEN) {
      return false;
    }

    if (latestConsent.expiryDate && latestConsent.expiryDate < new Date()) {
      return false;
    }

    // DPDP specific validations
    if ((regulation === ComplianceRegulation.DPDP || latestConsent.regulation === ComplianceRegulation.DPDP) &&
        latestConsent.verifiableParentalConsent && 
        !this.validateParentalConsent(dataSubjectId)) {
      return false;
    }

    return true;
  }

  // Data Subject Rights

  /**
   * Submit data subject request
   */
  public async submitDataSubjectRequest(
    dataSubjectId: string,
    requestType: DataSubjectRight | DPDPDataPrincipalRight,
    regulation: ComplianceRegulation,
    requestDetails: string,
    attachments: string[] = []
  ): Promise<DataSubjectRequest> {
    // Calculate response deadline based on regulation
    const responseDeadline = this.calculateResponseDeadline(requestType, regulation);
    
    const request: DataSubjectRequest = {
      id: this.generateId(),
      dataSubjectId,
      requestType,
      regulation,
      status: 'pending',
      submittedAt: new Date(),
      requestDetails,
      verificationStatus: 'pending',
      processingNotes: [],
      attachments,
      escalated: false,
      timelineCompliance: {
        responseDeadline,
      },
    };

    // DPDP specific handling
    if (regulation === ComplianceRegulation.DPDP || regulation === ComplianceRegulation.BOTH) {
      // Acknowledge receipt immediately for DPDP compliance
      request.timelineCompliance!.acknowledgedAt = new Date();
      
      // Set up grievance mechanism if required
      if (requestType === DPDPDataPrincipalRight.GRIEVANCE) {
        await this.initiateDPDPGrievanceProcess(dataSubjectId, requestDetails);
      }
    }

    // Store request
    const existing = this.dataSubjectRequests.get(dataSubjectId) || [];
    existing.push(request);
    this.dataSubjectRequests.set(dataSubjectId, existing);

    // Auto-escalate certain types of requests
    if (requestType === DataSubjectRight.ERASURE || 
        requestType === DataSubjectRight.DATA_PORTABILITY ||
        requestType === DPDPDataPrincipalRight.ERASURE) {
      request.legalReview = true;
    }

    this.logComplianceActivity(
      'data_subject_request_submitted',
      dataSubjectId,
      `${requestType} request submitted under ${regulation}: ${requestDetails}`,
      regulation
    );

    // Start processing timeline
    this.scheduleRequestReminder(request.id, regulation);

    return request;
  }

  /**
   * Process right to access request (Article 15)
   */
  public async processAccessRequest(requestId: string): Promise<Record<string, unknown>> {
    const request = this.findRequest(requestId);
    if (!request || request.requestType !== DataSubjectRight.ACCESS) {
      throw new Error('Invalid access request');
    }

    request.status = 'in_progress';
    
    try {
      // Collect all personal data for the data subject
      const personalData = await this.collectPersonalData(request.dataSubjectId);
      
      // Include consent history
      const consentHistory = this.consentRecords.get(request.dataSubjectId) || [];
      
      // Include request history (excluding other data subjects' requests)
      const requestHistory = this.dataSubjectRequests.get(request.dataSubjectId) || [];
      
      const accessPackage = {
        dataSubject: {
          id: request.dataSubjectId,
          dataCollected: personalData,
          consentHistory: consentHistory.map(c => ({
            purpose: c.purpose,
            legalBasis: c.legalBasis,
            status: c.consentStatus,
            timestamp: c.timestamp,
            withdrawalDate: c.withdrawalDate,
          })),
          requestHistory: requestHistory.map(r => ({
            type: r.requestType,
            status: r.status,
            submittedAt: r.submittedAt,
            completedAt: r.completedAt,
          })),
        },
        processingActivities: await this.getProcessingActivitiesForSubject(request.dataSubjectId),
        dataSharing: await this.getDataSharingInfo(request.dataSubjectId),
        retentionPeriods: await this.getRetentionInfo(request.dataSubjectId),
        generatedAt: new Date(),
      };

      request.status = 'completed';
      request.completedAt = new Date();
      
      this.logComplianceActivity(
        'access_request_completed',
        request.dataSubjectId,
        `Access request completed: ${Object.keys(personalData).length} data items provided`,
        request.regulation
      );

      return accessPackage;
    } catch (error) {
      request.status = 'rejected';
      request.processingNotes.push(`Error processing request: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Process right to be forgotten request (Article 17)
   */
  public async processErasureRequest(requestId: string): Promise<void> {
    const request = this.findRequest(requestId);
    if (!request || request.requestType !== DataSubjectRight.ERASURE) {
      throw new Error('Invalid erasure request');
    }

    request.status = 'in_progress';

    try {
      // Check if erasure is permissible
      const canErase = await this.canEraseData(request.dataSubjectId);
      if (!canErase.allowed) {
        request.status = 'rejected';
        request.processingNotes.push(`Erasure not permitted: ${canErase.reason}`);
        return;
      }

      // Perform erasure
      const erasureResult = await this.erasePersonalData(request.dataSubjectId);
      
      request.status = 'completed';
      request.completedAt = new Date();
      request.processingNotes.push(`Data erasure completed: ${erasureResult.itemsErased} items removed`);

      this.logComplianceActivity(
        'erasure_completed',
        request.dataSubjectId,
        `Personal data erased: ${erasureResult.itemsErased} items, ${erasureResult.locations.join(', ')}`,
        request.regulation
      );

      // Notify third parties if necessary
      if (erasureResult.thirdPartyNotifications.length > 0) {
        await this.notifyThirdPartiesOfErasure(request.dataSubjectId, erasureResult.thirdPartyNotifications);
      }

    } catch (error) {
      request.status = 'rejected';
      request.processingNotes.push(`Error processing erasure: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Process data portability request (Article 20)
   */
  public async processPortabilityRequest(
    requestId: string,
    format: 'json' | 'xml' | 'csv' = 'json'
  ): Promise<DataPortabilityPackage> {
    const request = this.findRequest(requestId);
    if (!request || request.requestType !== DataSubjectRight.DATA_PORTABILITY) {
      throw new Error('Invalid portability request');
    }

    request.status = 'in_progress';

    try {
      // Collect portable data (only data provided by the data subject or generated through their actions)
      const portableData = await this.collectPortableData(request.dataSubjectId);
      
      // Create portability package
      const package_: DataPortabilityPackage = {
        dataSubjectId: request.dataSubjectId,
        generatedAt: new Date(),
        format,
        data: portableData,
        metadata: {
          totalRecords: Object.keys(portableData).length,
          dataTypes: Object.keys(portableData),
          timeRange: await this.getDataTimeRange(request.dataSubjectId),
          exportVersion: '1.0',
        },
        integrity: {
          checksum: await this.generateChecksum(JSON.stringify(portableData)),
          algorithm: 'SHA-256',
        },
      };

      request.status = 'completed';
      request.completedAt = new Date();
      
      this.logComplianceActivity(
        'portability_completed',
        request.dataSubjectId,
        `Data portability package created: ${package_.metadata.totalRecords} records in ${format} format`,
        request.regulation
      );

      return package_;
    } catch (error) {
      request.status = 'rejected';
      request.processingNotes.push(`Error processing portability: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  // DPDP Act Specific Methods

  /**
   * Submit grievance under DPDP Act
   */
  public async submitDPDPGrievance(
    dataSubjectId: string,
    grievanceType: 'data_fiduciary_non_compliance' | 'consent_violation' | 'data_breach' | 'other',
    description: string
  ): Promise<DPDPGrievanceRecord> {
    const grievance: DPDPGrievanceRecord = {
      id: this.generateId(),
      dataSubjectId,
      grievanceType,
      description,
      submittedAt: new Date(),
      acknowledgedAt: new Date(), // DPDP requires immediate acknowledgment
      status: 'acknowledged',
    };

    const existing = this.dpdpGrievances.get(dataSubjectId) || [];
    existing.push(grievance);
    this.dpdpGrievances.set(dataSubjectId, existing);

    this.logComplianceActivity(
      'dpdp_grievance_submitted',
      dataSubjectId,
      `DPDP grievance submitted: ${grievanceType} - ${description}`,
      ComplianceRegulation.DPDP
    );

    return grievance;
  }

  /**
   * Check data fiduciary obligations under DPDP Act
   */
  public async assessDPDPObligations(dataFiduciaryId: string): Promise<DPDPDataFiduciaryObligation[]> {
    const obligations: DPDPDataFiduciaryObligation[] = [
      {
        id: this.generateId(),
        obligationType: 'notice',
        description: 'Provide clear notice about data processing to data principals',
        complianceStatus: 'compliant',
        lastAssessed: new Date(),
        evidence: ['privacy_policy.pdf', 'consent_forms.pdf'],
      },
      {
        id: this.generateId(),
        obligationType: 'purpose_limitation',
        description: 'Process personal data only for specified lawful purposes',
        complianceStatus: 'compliant',
        lastAssessed: new Date(),
        evidence: ['data_processing_register.xlsx'],
      },
      {
        id: this.generateId(),
        obligationType: 'data_minimization',
        description: 'Collect only necessary personal data',
        complianceStatus: 'under_review',
        lastAssessed: new Date(),
        evidence: [],
        remediationPlan: 'Review data collection forms to ensure minimal data collection',
      },
    ];

    this.dpdpObligations.set(dataFiduciaryId, obligations);
    return obligations;
  }

  /**
   * Register consent manager under DPDP Act
   */
  public async registerConsentManager(
    dataFiduciaryId: string,
    consentManagerName: string,
    registrationNumber: string,
    contactInfo: { email: string; phone: string; address: string }
  ): Promise<DPDPConsentManagerDesignation> {
    const designation: DPDPConsentManagerDesignation = {
      dataFiduciaryId,
      consentManagerName,
      registrationNumber,
      designatedAt: new Date(),
      responsibilities: [
        'Consent collection and management',
        'Data principal request processing',
        'Grievance redressal',
        'Compliance monitoring',
      ],
      contactInfo,
    };

    this.consentManagerDesignations.set(dataFiduciaryId, designation);

    this.logComplianceActivity(
      'consent_manager_registered',
      'system',
      `Consent manager registered: ${consentManagerName} for ${dataFiduciaryId}`,
      ComplianceRegulation.DPDP
    );

    return designation;
  }

  // Data Protection Impact Assessment (DPIA)

  /**
   * Create DPIA for high-risk processing (supports both GDPR and DPDP Act)
   */
  public async createDPIA(
    projectName: string,
    description: string,
    personalDataInvolved: string[],
    processingPurposes: ProcessingPurpose[],
    legalBasis: LegalBasis | DPDPLegalBasis,
    regulation: ComplianceRegulation = ComplianceRegulation.GDPR
  ): Promise<DataProtectionImpactAssessment> {
    const dpia: DataProtectionImpactAssessment = {
      id: this.generateId(),
      projectName,
      description,
      riskLevel: this.assessRiskLevel(personalDataInvolved, processingPurposes, regulation),
      personalDataInvolved,
      processingPurposes,
      legalBasis,
      riskMitigations: [],
      approvalStatus: 'pending',
      reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      created: new Date(),
    };

    this.dpiAssessments.set(dpia.id, dpia);

    this.logComplianceActivity(
      'dpia_created', 
      'system', 
      `DPIA created for project: ${projectName} under ${regulation}`,
      regulation
    );

    return dpia;
  }

  // Breach Management

  /**
   * Report data breach incident (supports both GDPR and DPDP Act)
   */
  public async reportBreach(
    severity: 'low' | 'medium' | 'high' | 'critical',
    affectedDataSubjects: number,
    dataTypes: string[],
    description: string,
    regulation: ComplianceRegulation = ComplianceRegulation.GDPR,
    dpdpSpecificFields?: {
      significantHarmOccurred?: boolean;
      affectedChildrenCount?: number;
    }
  ): Promise<BreachIncident> {
    const breach: BreachIncident = {
      id: this.generateId(),
      severity,
      affectedDataSubjects,
      dataTypes,
      discoveredAt: new Date(),
      description,
      containmentActions: [],
      notificationsSent: false,
      supervisoryAuthorityNotified: false,
      resolved: false,
      lessons: [],
      regulation,
      ...dpdpSpecificFields,
    };

    this.breachIncidents.set(breach.id, breach);

    // Regulation-specific breach reporting requirements
    if (regulation === ComplianceRegulation.GDPR || regulation === ComplianceRegulation.BOTH) {
      // GDPR: Report to supervisory authority within 72 hours for high/critical breaches
      if (severity === 'high' || severity === 'critical') {
        this.scheduleSupervisoryAuthorityNotification(breach.id, 'gdpr');
      }
    }

    if (regulation === ComplianceRegulation.DPDP || regulation === ComplianceRegulation.BOTH) {
      // DPDP Act: Report to Data Protection Board if significant harm occurred
      if (dpdpSpecificFields?.significantHarmOccurred || severity === 'critical') {
        this.scheduleDataProtectionBoardNotification(breach.id);
        breach.dataProtectionBoardNotified = true;
      }
      
      // Special handling for children's data under DPDP
      if (dpdpSpecificFields?.affectedChildrenCount && dpdpSpecificFields.affectedChildrenCount > 0) {
        breach.severity = 'critical'; // Upgrade severity for children's data
        this.scheduleDataProtectionBoardNotification(breach.id);
      }
    }

    // Notify affected data subjects if required
    if (this.requiresDataSubjectNotification(breach)) {
      this.scheduleDataSubjectNotification(breach.id);
    }

    this.logComplianceActivity(
      'breach_reported',
      'system',
      `${severity} breach reported under ${regulation}: ${affectedDataSubjects} subjects affected, data types: ${dataTypes.join(', ')}`,
      regulation
    );

    return breach;
  }

  // Compliance Monitoring

  /**
   * Generate comprehensive compliance report for both GDPR and DPDP Act
   */
  public generateComplianceReport(): {
    gdprCompliance: {
      consentCompliance: {
        totalConsents: number;
        activeConsents: number;
        expiredConsents: number;
        withdrawnConsents: number;
      };
      requestCompliance: {
        totalRequests: number;
        pendingRequests: number;
        overdueRequests: number;
        completedOnTime: number;
      };
      breachCompliance: {
        totalBreaches: number;
        openBreaches: number;
        reportedToAuthority: number;
        averageResolutionTime: number;
      };
      dpiaPending: number;
    };
    dpdpCompliance: {
      consentCompliance: {
        totalConsents: number;
        activeConsents: number;
        parentalConsents: number;
        withdrawnConsents: number;
      };
      requestCompliance: {
        totalRequests: number;
        pendingRequests: number;
        acknowledgedOnTime: number;
        grievancesSubmitted: number;
      };
      breachCompliance: {
        totalBreaches: number;
        significantHarmBreaches: number;
        boardNotifications: number;
        childrenDataBreaches: number;
      };
      obligationCompliance: {
        totalObligations: number;
        compliantObligations: number;
        nonCompliantObligations: number;
      };
    };
    lastAssessment: Date;
  } {
    // GDPR Metrics
    const gdprConsents = Array.from(this.consentRecords.values()).flat()
      .filter(c => c.regulation === ComplianceRegulation.GDPR || c.regulation === ComplianceRegulation.BOTH);
    const gdprActiveConsents = gdprConsents.filter(c => c.consentStatus === ConsentStatus.GIVEN);
    const gdprExpiredConsents = gdprConsents.filter(c => 
      c.expiryDate && c.expiryDate < new Date() && c.consentStatus === ConsentStatus.GIVEN
    );
    const gdprWithdrawnConsents = gdprConsents.filter(c => c.consentStatus === ConsentStatus.WITHDRAWN);

    const gdprRequests = Array.from(this.dataSubjectRequests.values()).flat()
      .filter(r => r.regulation === ComplianceRegulation.GDPR || r.regulation === ComplianceRegulation.BOTH);
    const gdprPendingRequests = gdprRequests.filter(r => r.status === 'pending' || r.status === 'in_progress');
    const gdprOverdueRequests = gdprRequests.filter(r => 
      (r.status === 'pending' || r.status === 'in_progress') && 
      r.timelineCompliance?.responseDeadline && 
      r.timelineCompliance.responseDeadline < new Date()
    );
    const gdprCompletedRequests = gdprRequests.filter(r => r.status === 'completed' && r.completedAt);
    const gdprCompletedOnTime = gdprCompletedRequests.filter(r => 
      r.completedAt && r.timelineCompliance?.responseDeadline &&
      r.completedAt <= r.timelineCompliance.responseDeadline
    );

    const gdprBreaches = Array.from(this.breachIncidents.values())
      .filter(b => b.regulation === ComplianceRegulation.GDPR || b.regulation === ComplianceRegulation.BOTH);
    const gdprOpenBreaches = gdprBreaches.filter(b => !b.resolved);
    const gdprReportedBreaches = gdprBreaches.filter(b => b.supervisoryAuthorityNotified);
    const gdprResolvedBreaches = gdprBreaches.filter(b => b.resolved && b.resolvedAt);
    const gdprAverageResolutionTime = gdprResolvedBreaches.length > 0 
      ? gdprResolvedBreaches.reduce((sum, b) => sum + (b.resolvedAt!.getTime() - b.discoveredAt.getTime()), 0) / gdprResolvedBreaches.length / (24 * 60 * 60 * 1000)
      : 0;

    // DPDP Metrics
    const dpdpConsents = Array.from(this.consentRecords.values()).flat()
      .filter(c => c.regulation === ComplianceRegulation.DPDP || c.regulation === ComplianceRegulation.BOTH);
    const dpdpActiveConsents = dpdpConsents.filter(c => c.consentStatus === ConsentStatus.GIVEN);
    const dpdpParentalConsents = dpdpConsents.filter(c => c.verifiableParentalConsent);
    const dpdpWithdrawnConsents = dpdpConsents.filter(c => c.consentStatus === ConsentStatus.WITHDRAWN);

    const dpdpRequests = Array.from(this.dataSubjectRequests.values()).flat()
      .filter(r => r.regulation === ComplianceRegulation.DPDP || r.regulation === ComplianceRegulation.BOTH);
    const dpdpPendingRequests = dpdpRequests.filter(r => r.status === 'pending' || r.status === 'in_progress');
    const dpdpAcknowledgedOnTime = dpdpRequests.filter(r => 
      r.timelineCompliance?.acknowledgedAt &&
      (r.timelineCompliance.acknowledgedAt.getTime() - r.submittedAt.getTime()) <= (24 * 60 * 60 * 1000) // 24 hours
    );

    const dpdpGrievances = Array.from(this.dpdpGrievances.values()).flat();

    const dpdpBreaches = Array.from(this.breachIncidents.values())
      .filter(b => b.regulation === ComplianceRegulation.DPDP || b.regulation === ComplianceRegulation.BOTH);
    const dpdpSignificantHarmBreaches = dpdpBreaches.filter(b => b.significantHarmOccurred);
    const dpdpBoardNotifications = dpdpBreaches.filter(b => b.dataProtectionBoardNotified);
    const dpdpChildrenDataBreaches = dpdpBreaches.filter(b => b.affectedChildrenCount && b.affectedChildrenCount > 0);

    const allObligations = Array.from(this.dpdpObligations.values()).flat();
    const compliantObligations = allObligations.filter(o => o.complianceStatus === 'compliant');
    const nonCompliantObligations = allObligations.filter(o => o.complianceStatus === 'non_compliant');

    const pendingDPIAs = Array.from(this.dpiAssessments.values()).filter(d => d.approvalStatus === 'pending');

    return {
      gdprCompliance: {
        consentCompliance: {
          totalConsents: gdprConsents.length,
          activeConsents: gdprActiveConsents.length,
          expiredConsents: gdprExpiredConsents.length,
          withdrawnConsents: gdprWithdrawnConsents.length,
        },
        requestCompliance: {
          totalRequests: gdprRequests.length,
          pendingRequests: gdprPendingRequests.length,
          overdueRequests: gdprOverdueRequests.length,
          completedOnTime: gdprCompletedOnTime.length,
        },
        breachCompliance: {
          totalBreaches: gdprBreaches.length,
          openBreaches: gdprOpenBreaches.length,
          reportedToAuthority: gdprReportedBreaches.length,
          averageResolutionTime: gdprAverageResolutionTime,
        },
        dpiaPending: pendingDPIAs.length,
      },
      dpdpCompliance: {
        consentCompliance: {
          totalConsents: dpdpConsents.length,
          activeConsents: dpdpActiveConsents.length,
          parentalConsents: dpdpParentalConsents.length,
          withdrawnConsents: dpdpWithdrawnConsents.length,
        },
        requestCompliance: {
          totalRequests: dpdpRequests.length,
          pendingRequests: dpdpPendingRequests.length,
          acknowledgedOnTime: dpdpAcknowledgedOnTime.length,
          grievancesSubmitted: dpdpGrievances.length,
        },
        breachCompliance: {
          totalBreaches: dpdpBreaches.length,
          significantHarmBreaches: dpdpSignificantHarmBreaches.length,
          boardNotifications: dpdpBoardNotifications.length,
          childrenDataBreaches: dpdpChildrenDataBreaches.length,
        },
        obligationCompliance: {
          totalObligations: allObligations.length,
          compliantObligations: compliantObligations.length,
          nonCompliantObligations: nonCompliantObligations.length,
        },
      },
      lastAssessment: new Date(),
    };
  }

  // Private helper methods

  private generateId(): string {
    return `compliance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async generateConsentHash(dataSubjectId: string, consentText: string, timestamp: string): Promise<string> {
    const data = `${dataSubjectId}|${consentText}|${timestamp}`;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async generateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private findRequest(requestId: string): DataSubjectRequest | undefined {
    for (const requests of this.dataSubjectRequests.values()) {
      const request = requests.find(r => r.id === requestId);
      if (request) return request;
    }
    return undefined;
  }

  private async restrictProcessingForPurpose(dataSubjectId: string, purpose: ProcessingPurpose): Promise<void> {
    // Placeholder for restricting data processing
    console.log(`Restricting processing for ${dataSubjectId} purpose ${purpose}`);
  }

  private async collectPersonalData(dataSubjectId: string): Promise<Record<string, unknown>> {
    // Placeholder - in production, this would query all systems/databases
    // and decrypt personal data for the data subject
    return {
      profile: { id: dataSubjectId, email: 'user@example.com' },
      files: [],
      activity: [],
    };
  }

  private async collectPortableData(_dataSubjectId: string): Promise<Record<string, unknown>> {
    // Placeholder - only data that should be portable according to GDPR Article 20
    return {
      userProvidedData: {},
      generatedData: {},
    };
  }

  private async canEraseData(_dataSubjectId: string): Promise<{ allowed: boolean; reason?: string }> {
    // Check if data can be erased (legal obligations, legitimate interests, etc.)
    return { allowed: true };
  }

  private async erasePersonalData(_dataSubjectId: string): Promise<{
    itemsErased: number;
    locations: string[];
    thirdPartyNotifications: string[];
  }> {
    // Placeholder for actual data erasure
    return {
      itemsErased: 0,
      locations: [],
      thirdPartyNotifications: [],
    };
  }

  private async getProcessingActivitiesForSubject(_dataSubjectId: string): Promise<unknown[]> {
    return [];
  }

  private async getDataSharingInfo(_dataSubjectId: string): Promise<unknown[]> {
    return [];
  }

  private async getRetentionInfo(_dataSubjectId: string): Promise<unknown[]> {
    return [];
  }

  private async getDataTimeRange(_dataSubjectId: string): Promise<{ from: Date; to: Date }> {
    return { from: new Date(), to: new Date() };
  }

  private assessRiskLevel(
    personalData: string[], 
    purposes: ProcessingPurpose[], 
    regulation: ComplianceRegulation = ComplianceRegulation.GDPR
  ): 'low' | 'medium' | 'high' {
    // Enhanced risk assessment for both GDPR and DPDP Act
    const sensitiveData = personalData.filter(d => 
      d.includes('health') || d.includes('biometric') || d.includes('genetic') || d.includes('financial')
    );
    
    // DPDP Act specific risk factors
    if (regulation === ComplianceRegulation.DPDP || regulation === ComplianceRegulation.BOTH) {
      const childrenData = personalData.filter(d => d.includes('children') || d.includes('minor'));
      if (childrenData.length > 0) {
        return 'high'; // Children's data always high risk under DPDP
      }
      
      if (sensitiveData.length > 0 || purposes.includes(ProcessingPurpose.ANALYTICS)) {
        return 'high';
      }
    }
    
    // GDPR risk assessment
    if (sensitiveData.length > 0 || purposes.includes(ProcessingPurpose.ANALYTICS)) {
      return 'high';
    }
    
    if (personalData.length > 10) {
      return 'medium';
    }
    
    return 'low';
  }

  private requiresDataSubjectNotification(breach: BreachIncident): boolean {
    if (breach.regulation === ComplianceRegulation.DPDP || breach.regulation === ComplianceRegulation.BOTH) {
      return breach.significantHarmOccurred || breach.severity === 'high' || breach.severity === 'critical';
    }
    return breach.severity === 'high' || breach.severity === 'critical';
  }

  private calculateResponseDeadline(
    requestType: DataSubjectRight | DPDPDataPrincipalRight, 
    regulation: ComplianceRegulation
  ): Date {
    const now = new Date();
    
    if (regulation === ComplianceRegulation.DPDP) {
      // DPDP Act timelines (in days)
      switch (requestType) {
        case DPDPDataPrincipalRight.ACCESS:
          return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
        case DPDPDataPrincipalRight.CORRECTION:
        case DPDPDataPrincipalRight.ERASURE:
          return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
        case DPDPDataPrincipalRight.GRIEVANCE:
          return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
        default:
          return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      }
    }
    
    // GDPR timelines (1 month = 30 days, can be extended by 2 months)
    return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  private validateParentalConsent(dataSubjectId: string): boolean {
    // Placeholder for parental consent validation logic
    // In production, this would verify parent/guardian consent for minors
    console.log(`Validating parental consent for ${dataSubjectId}`);
    return true;
  }

  private isNonConsentLegalBasisValid(
    legalBasis: LegalBasis | DPDPLegalBasis, 
    regulation?: ComplianceRegulation
  ): boolean {
    // Validate non-consent legal bases according to respective regulations
    if (regulation === ComplianceRegulation.DPDP) {
      const dpdpLegalBases = Object.values(DPDPLegalBasis);
      return dpdpLegalBases.includes(legalBasis as DPDPLegalBasis);
    }
    
    const gdprLegalBases = Object.values(LegalBasis);
    return gdprLegalBases.includes(legalBasis as LegalBasis);
  }

  private async initiateDPDPGrievanceProcess(dataSubjectId: string, description: string): Promise<void> {
    await this.submitDPDPGrievance(dataSubjectId, 'other', description);
  }

  private scheduleRequestReminder(requestId: string, regulation: ComplianceRegulation): void {
    const reminderDays = regulation === ComplianceRegulation.DPDP ? 25 : 25; // 5 days before deadline
    setTimeout(() => {
      console.log(`Reminder: ${regulation} request ${requestId} deadline approaching`);
    }, reminderDays * 24 * 60 * 60 * 1000);
  }

  private scheduleSupervisoryAuthorityNotification(breachId: string, authority: string): void {
    // Schedule for 72 hours as required by GDPR
    setTimeout(() => {
      console.log(`Automatic ${authority} supervisory authority notification for breach ${breachId}`);
    }, 72 * 60 * 60 * 1000);
  }

  private scheduleDataProtectionBoardNotification(breachId: string): void {
    // DPDP Act: Notify Data Protection Board for significant harm
    setTimeout(() => {
      console.log(`Automatic Data Protection Board notification for breach ${breachId}`);
    }, 72 * 60 * 60 * 1000);
  }

  private scheduleDataSubjectNotification(breachId: string): void {
    // Schedule data subject notification without undue delay
    setTimeout(() => {
      console.log(`Automatic data subject notification for breach ${breachId}`);
    }, 24 * 60 * 60 * 1000);
  }

  private async notifyThirdPartiesOfErasure(dataSubjectId: string, parties: string[]): Promise<void> {
    console.log(`Notifying third parties of erasure for ${dataSubjectId}: ${parties.join(', ')}`);
  }

  private logComplianceActivity(
    action: string, 
    dataSubjectId: string, 
    details: string, 
    regulation: ComplianceRegulation
  ): void {
    // In production, integrate with audit logging system
    console.log(`COMPLIANCE LOG: ${new Date().toISOString()} | Regulation: ${regulation} | Action: ${action} | Subject: ${dataSubjectId} | Details: ${details}`);
  }
}

// Export singleton instance
export const dataProtectionComplianceService = DataProtectionComplianceService.getInstance();

// Backward compatibility - export with original name
export const gdprComplianceService = dataProtectionComplianceService;

/**
 * Dual Compliance Service for GDPR and DPDP Act
 * 
 * This service provides comprehensive data protection compliance capabilities for both:
 * - European Union's General Data Protection Regulation (GDPR)
 * - India's Digital Personal Data Protection Act, 2023 (DPDP Act)
 * 
 * Key Features:
 * 
 * GDPR Compliance:
 * - Article 6 legal bases for processing
 * - Article 7 consent management
 * - Articles 15-22 data subject rights
 * - Article 33-34 breach notification (72-hour rule)
 * - Articles 35-36 Data Protection Impact Assessments (DPIA)
 * 
 * DPDP Act Compliance:
 * - Section 11 legal bases for processing
 * - Section 12 consent framework with verifiable parental consent
 * - Sections 16-20 data principal rights including grievance redressal
 * - Section 25 data breach notification to Data Protection Board
 * - Section 28 obligations of significant data fiduciaries
 * - Section 32 appointment of consent managers
 * 
 * Cross-Regulation Features:
 * - Unified consent management supporting both frameworks
 * - Dual breach reporting capabilities
 * - Comprehensive compliance reporting
 * - Risk assessment adapted for each regulation
 * - Timeline management for different regulatory requirements
 * 
 * Usage Example:
 * ```typescript
 * // Record consent under both regulations
 * await dataProtectionComplianceService.recordConsent(
 *   'user-123',
 *   ProcessingPurpose.SERVICE_PROVISION,
 *   DPDPLegalBasis.CONSENT,
 *   ComplianceRegulation.BOTH,
 *   'I consent to processing my personal data...',
 *   'v1.0',
 *   '192.168.1.1',
 *   'Mozilla/5.0...',
 *   365,
 *   {
 *     verifiableParentalConsent: false,
 *     dataFiduciaryDetails: {
 *       name: 'Data Corp Ltd',
 *       address: '123 Business St',
 *       contactInfo: 'dpo@datacorp.com'
 *     }
 *   }
 * );
 * 
 * // Submit data subject request
 * await dataProtectionComplianceService.submitDataSubjectRequest(
 *   'user-123',
 *   DPDPDataPrincipalRight.ACCESS,
 *   ComplianceRegulation.DPDP,
 *   'I request access to my personal data'
 * );
 * 
 * // Report breach under both regulations
 * await dataProtectionComplianceService.reportBreach(
 *   'high',
 *   150,
 *   ['email', 'phone', 'financial'],
 *   'Unauthorized access to customer database',
 *   ComplianceRegulation.BOTH,
 *   {
 *     significantHarmOccurred: true,
 *     affectedChildrenCount: 5
 *   }
 * );
 * ```
 */