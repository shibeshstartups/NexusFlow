import { auditLogger, AuditEventType, AuditSeverity } from './auditLogger';

// Define permissions for different operations
export enum Permission {
  // File operations
  FILE_READ = 'file:read',
  FILE_WRITE = 'file:write',
  FILE_DELETE = 'file:delete',
  FILE_SHARE = 'file:share',
  FILE_DOWNLOAD = 'file:download',
  
  // Folder operations
  FOLDER_CREATE = 'folder:create',
  FOLDER_READ = 'folder:read', 
  FOLDER_WRITE = 'folder:write',
  FOLDER_DELETE = 'folder:delete',
  
  // Project operations
  PROJECT_CREATE = 'project:create',
  PROJECT_READ = 'project:read',
  PROJECT_WRITE = 'project:write',
  PROJECT_DELETE = 'project:delete',
  PROJECT_MANAGE = 'project:manage',
  
  // User management
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',
  USER_IMPERSONATE = 'user:impersonate',
  
  // Security operations
  SECURITY_AUDIT = 'security:audit',
  SECURITY_CONFIG = 'security:config',
  ENCRYPTION_MANAGE = 'encryption:manage',
  
  // Compliance operations
  COMPLIANCE_VIEW = 'compliance:view',
  COMPLIANCE_MANAGE = 'compliance:manage',
  
  // System administration
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_BACKUP = 'system:backup',
  SYSTEM_MONITOR = 'system:monitor',
}

// Predefined roles with specific permission sets
export enum Role {
  GUEST = 'guest',
  USER = 'user',
  CONTRIBUTOR = 'contributor', 
  PROJECT_MANAGER = 'project_manager',
  ADMIN = 'admin',
  SECURITY_OFFICER = 'security_officer',
  COMPLIANCE_OFFICER = 'compliance_officer',
  SYSTEM_ADMIN = 'system_admin',
  SUPER_ADMIN = 'super_admin',
}

// Resource types for fine-grained access control
export enum ResourceType {
  FILE = 'file',
  FOLDER = 'folder', 
  PROJECT = 'project',
  USER = 'user',
  SYSTEM = 'system',
  COMPLIANCE = 'compliance',
}

// Access context for dynamic permissions
export interface AccessContext {
  userId: string;
  userRoles: Role[];
  resourceType: ResourceType;
  resourceId?: string;
  resourceOwner?: string;
  projectId?: string;
  ipAddress?: string;
  timeOfAccess?: Date;
  sessionId?: string;
}

// Permission grant/deny reasons for audit
export interface AccessDecision {
  granted: boolean;
  reason: string;
  appliedPolicies: string[];
  requiredPermission: Permission;
  evaluatedAt: Date;
}

// Role definition with permissions and constraints
export interface RoleDefinition {
  name: Role;
  displayName: string;
  description: string;
  permissions: Permission[];
  constraints: RoleConstraint[];
  inheritsFrom?: Role[];
  maxUsers?: number;
  requiresApproval: boolean;
}

// Constraints on role usage
export interface RoleConstraint {
  type: 'time' | 'ip' | 'mfa' | 'approval' | 'temporary';
  condition: string;
  value: unknown;
}

// User role assignments with metadata
export interface UserRoleAssignment {
  userId: string;
  role: Role;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
  constraints: RoleConstraint[];
  active: boolean;
  reason: string;
}

// Policy for dynamic access control
export interface AccessPolicy {
  id: string;
  name: string;
  description: string;
  resourceType: ResourceType;
  conditions: PolicyCondition[];
  effect: 'allow' | 'deny';
  priority: number; // Higher priority policies evaluated first
}

export interface PolicyCondition {
  field: string; // e.g., 'user.role', 'resource.owner', 'time.hour'
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: unknown;
}

export class RBACService {
  private static instance: RBACService;
  private roleDefinitions = new Map<Role, RoleDefinition>();
  private userRoles = new Map<string, UserRoleAssignment[]>();
  private accessPolicies = new Map<string, AccessPolicy>();
  private permissionCache = new Map<string, { permissions: Permission[]; timestamp: number }>();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.initializeStandardRoles();
    this.initializeDefaultPolicies();
  }

  public static getInstance(): RBACService {
    if (!RBACService.instance) {
      RBACService.instance = new RBACService();
    }
    return RBACService.instance;
  }

  /**
   * Check if user has specific permission for resource
   */
  public async checkPermission(
    context: AccessContext,
    permission: Permission
  ): Promise<AccessDecision> {
    const startTime = new Date();
    
    try {
      // Get user permissions (with caching)
      const userPermissions = await this.getUserPermissions(context.userId);
      
      // Check direct permission
      if (userPermissions.includes(permission)) {
        const decision = {
          granted: true,
          reason: 'Direct permission granted',
          appliedPolicies: ['direct_permission'],
          requiredPermission: permission,
          evaluatedAt: startTime,
        };
        
        await this.auditAccessDecision(context, decision);
        return decision;
      }
      
      // Evaluate access policies
      const policyDecision = await this.evaluateAccessPolicies(context, permission);
      
      await this.auditAccessDecision(context, policyDecision);
      return policyDecision;
      
    } catch (error) {
      const decision = {
        granted: false,
        reason: `Access evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        appliedPolicies: [],
        requiredPermission: permission,
        evaluatedAt: startTime,
      };
      
      await this.auditAccessDecision(context, decision);
      return decision;
    }
  }

  /**
   * Assign role to user
   */
  public async assignRole(
    userId: string,
    role: Role,
    assignedBy: string,
    reason: string,
    expiresAt?: Date,
    constraints: RoleConstraint[] = []
  ): Promise<void> {
    const roleDefinition = this.roleDefinitions.get(role);
    if (!roleDefinition) {
      throw new Error(`Role not found: ${role}`);
    }

    // Check if assigner has permission to assign this role
    const assignerContext: AccessContext = {
      userId: assignedBy,
      userRoles: await this.getUserRoles(assignedBy),
      resourceType: ResourceType.USER,
      resourceId: userId,
    };
    
    const canAssign = await this.checkPermission(assignerContext, Permission.USER_WRITE);
    if (!canAssign.granted) {
      throw new Error('Insufficient permissions to assign role');
    }

    // Create role assignment
    const assignment: UserRoleAssignment = {
      userId,
      role,
      assignedBy,
      assignedAt: new Date(),
      expiresAt,
      constraints,
      active: true,
      reason,
    };

    // Store assignment
    const userAssignments = this.userRoles.get(userId) || [];
    userAssignments.push(assignment);
    this.userRoles.set(userId, userAssignments);

    // Clear permission cache for user
    this.clearUserCache(userId);

    // Audit role assignment
    await auditLogger.logEvent(
      AuditEventType.PERMISSION_GRANT,
      'Role assigned to user',
      'success',
      {
        targetUserId: userId,
        role,
        assignedBy,
        reason,
        expiresAt: expiresAt?.toISOString(),
        constraints: constraints.length,
      },
      {
        userId: assignedBy,
        severity: AuditSeverity.MEDIUM,
        resource: `user_${userId}`,
      }
    );
  }

  /**
   * Revoke role from user
   */
  public async revokeRole(
    userId: string,
    role: Role,
    revokedBy: string,
    reason: string
  ): Promise<void> {
    const userAssignments = this.userRoles.get(userId) || [];
    const assignment = userAssignments.find(a => a.role === role && a.active);
    
    if (!assignment) {
      throw new Error(`User does not have role: ${role}`);
    }

    // Deactivate assignment
    assignment.active = false;

    // Clear permission cache
    this.clearUserCache(userId);

    // Audit role revocation
    await auditLogger.logEvent(
      AuditEventType.PERMISSION_REVOKE,
      'Role revoked from user',
      'success',
      {
        targetUserId: userId,
        role,
        revokedBy,
        reason,
      },
      {
        userId: revokedBy,
        severity: AuditSeverity.MEDIUM,
        resource: `user_${userId}`,
      }
    );
  }

  /**
   * Get user's current roles
   */
  public async getUserRoles(userId: string): Promise<Role[]> {
    const assignments = this.userRoles.get(userId) || [];
    return assignments
      .filter(a => a.active && (!a.expiresAt || a.expiresAt > new Date()))
      .map(a => a.role);
  }

  /**
   * Get user's effective permissions
   */
  public async getUserPermissions(userId: string): Promise<Permission[]> {
    // Check cache first
    const cached = this.permissionCache.get(userId);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.permissions;
    }

    const roles = await this.getUserRoles(userId);
    const permissions = new Set<Permission>();

    // Collect permissions from all roles
    for (const role of roles) {
      const roleDefinition = this.roleDefinitions.get(role);
      if (roleDefinition) {
        roleDefinition.permissions.forEach(p => permissions.add(p));
        
        // Include inherited permissions
        if (roleDefinition.inheritsFrom) {
          for (const inheritedRole of roleDefinition.inheritsFrom) {
            const inheritedDef = this.roleDefinitions.get(inheritedRole);
            if (inheritedDef) {
              inheritedDef.permissions.forEach(p => permissions.add(p));
            }
          }
        }
      }
    }

    const userPermissions = Array.from(permissions);
    
    // Cache the result
    this.permissionCache.set(userId, {
      permissions: userPermissions,
      timestamp: Date.now(),
    });

    return userPermissions;
  }

  /**
   * Create custom access policy
   */
  public createAccessPolicy(policy: AccessPolicy): void {
    this.accessPolicies.set(policy.id, policy);
  }

  /**
   * Generate RBAC compliance report
   */
  public generateRBACReport(): {
    usersSummary: {
      totalUsers: number;
      usersByRole: Record<string, number>;
      usersWithExpiredRoles: number;
      usersWithConstraints: number;
    };
    rolesSummary: {
      totalRoles: number;
      rolesWithConstraints: number;
      averagePermissionsPerRole: number;
    };
    permissions: {
      totalPermissions: number;
      mostCommonPermissions: Array<{ permission: Permission; userCount: number }>;
    };
    policies: {
      totalPolicies: number;
      allowPolicies: number;
      denyPolicies: number;
    };
    securityMetrics: {
      principleOfLeastPrivilege: number; // Score 0-100
      roleSegregation: number; // Score 0-100
      temporaryAccess: number; // Percentage of roles with expiration
    };
  } {
    const allUserAssignments = Array.from(this.userRoles.values()).flat();
    const activeAssignments = allUserAssignments.filter(a => a.active);
    const policies = Array.from(this.accessPolicies.values());

    // Calculate users by role
    const usersByRole: Record<string, number> = {};
    activeAssignments.forEach(assignment => {
      usersByRole[assignment.role] = (usersByRole[assignment.role] || 0) + 1;
    });

    // Calculate expired roles
    const expiredRoles = activeAssignments.filter(
      a => a.expiresAt && a.expiresAt < new Date()
    ).length;

    // Calculate users with constraints
    const usersWithConstraints = activeAssignments.filter(
      a => a.constraints.length > 0
    ).length;

    // Calculate permission statistics
    const permissionCounts = new Map<Permission, number>();
    this.roleDefinitions.forEach(role => {
      role.permissions.forEach(permission => {
        const currentCount = permissionCounts.get(permission) || 0;
        const roleUserCount = usersByRole[role.name] || 0;
        permissionCounts.set(permission, currentCount + roleUserCount);
      });
    });

    const mostCommonPermissions = Array.from(permissionCounts.entries())
      .map(([permission, userCount]) => ({ permission, userCount }))
      .sort((a, b) => b.userCount - a.userCount)
      .slice(0, 10);

    // Calculate security metrics
    const totalUsers = new Set(activeAssignments.map(a => a.userId)).size;
    const rolesWithExpiration = activeAssignments.filter(a => a.expiresAt).length;
    const temporaryAccessPercentage = totalUsers > 0 ? (rolesWithExpiration / totalUsers) * 100 : 0;

    return {
      usersSummary: {
        totalUsers,
        usersByRole,
        usersWithExpiredRoles: expiredRoles,
        usersWithConstraints,
      },
      rolesSummary: {
        totalRoles: this.roleDefinitions.size,
        rolesWithConstraints: Array.from(this.roleDefinitions.values()).filter(
          r => r.constraints.length > 0
        ).length,
        averagePermissionsPerRole: Array.from(this.roleDefinitions.values())
          .reduce((sum, role) => sum + role.permissions.length, 0) / this.roleDefinitions.size,
      },
      permissions: {
        totalPermissions: Object.keys(Permission).length,
        mostCommonPermissions,
      },
      policies: {
        totalPolicies: policies.length,
        allowPolicies: policies.filter(p => p.effect === 'allow').length,
        denyPolicies: policies.filter(p => p.effect === 'deny').length,
      },
      securityMetrics: {
        principleOfLeastPrivilege: this.calculateLeastPrivilegeScore(),
        roleSegregation: this.calculateRoleSegregationScore(),
        temporaryAccess: temporaryAccessPercentage,
      },
    };
  }

  // Private methods

  private initializeStandardRoles(): void {
    const standardRoles: RoleDefinition[] = [
      {
        name: Role.GUEST,
        displayName: 'Guest',
        description: 'Read-only access to public resources',
        permissions: [Permission.FILE_READ, Permission.FOLDER_READ],
        constraints: [],
        requiresApproval: false,
      },
      {
        name: Role.USER,
        displayName: 'User',
        description: 'Basic user with file and folder operations',
        permissions: [
          Permission.FILE_READ, Permission.FILE_WRITE, Permission.FILE_DOWNLOAD,
          Permission.FOLDER_READ, Permission.FOLDER_CREATE,
        ],
        constraints: [],
        inheritsFrom: [Role.GUEST],
        requiresApproval: false,
      },
      {
        name: Role.CONTRIBUTOR,
        displayName: 'Contributor',
        description: 'Can contribute to projects and share files',
        permissions: [
          Permission.FILE_SHARE, Permission.PROJECT_READ, Permission.PROJECT_WRITE,
        ],
        constraints: [],
        inheritsFrom: [Role.USER],
        requiresApproval: false,
      },
      {
        name: Role.PROJECT_MANAGER,
        displayName: 'Project Manager',
        description: 'Can manage projects and team members',
        permissions: [
          Permission.PROJECT_CREATE, Permission.PROJECT_MANAGE,
          Permission.USER_READ, Permission.FOLDER_DELETE,
        ],
        constraints: [],
        inheritsFrom: [Role.CONTRIBUTOR],
        requiresApproval: true,
      },
      {
        name: Role.ADMIN,
        displayName: 'Administrator',
        description: 'System administration capabilities',
        permissions: [
          Permission.USER_WRITE, Permission.USER_DELETE,
          Permission.SYSTEM_MONITOR, Permission.FILE_DELETE,
        ],
        constraints: [
          { type: 'mfa', condition: 'required', value: true },
        ],
        inheritsFrom: [Role.PROJECT_MANAGER],
        requiresApproval: true,
      },
      {
        name: Role.SECURITY_OFFICER,
        displayName: 'Security Officer',
        description: 'Security and compliance oversight',
        permissions: [
          Permission.SECURITY_AUDIT, Permission.SECURITY_CONFIG,
          Permission.ENCRYPTION_MANAGE, Permission.COMPLIANCE_VIEW,
        ],
        constraints: [
          { type: 'mfa', condition: 'required', value: true },
          { type: 'ip', condition: 'whitelist', value: ['10.0.0.0/8'] },
        ],
        inheritsFrom: [Role.ADMIN],
        requiresApproval: true,
      },
      {
        name: Role.SUPER_ADMIN,
        displayName: 'Super Administrator',
        description: 'Full system access',
        permissions: [
          Permission.SYSTEM_ADMIN, Permission.USER_IMPERSONATE,
          Permission.COMPLIANCE_MANAGE, Permission.SYSTEM_BACKUP,
        ],
        constraints: [
          { type: 'mfa', condition: 'required', value: true },
          { type: 'approval', condition: 'required', value: true },
          { type: 'time', condition: 'business_hours', value: true },
        ],
        inheritsFrom: [Role.SECURITY_OFFICER],
        maxUsers: 2,
        requiresApproval: true,
      },
    ];

    standardRoles.forEach(role => {
      this.roleDefinitions.set(role.name, role);
    });
  }

  private initializeDefaultPolicies(): void {
    const defaultPolicies: AccessPolicy[] = [
      {
        id: 'resource_owner_full_access',
        name: 'Resource Owner Full Access',
        description: 'Resource owners have full access to their resources',
        resourceType: ResourceType.FILE,
        conditions: [
          { field: 'resource.owner', operator: 'equals', value: 'user.id' },
        ],
        effect: 'allow',
        priority: 100,
      },
      {
        id: 'project_member_access',
        name: 'Project Member Access',
        description: 'Project members can access project resources',
        resourceType: ResourceType.PROJECT,
        conditions: [
          { field: 'user.projectMemberships', operator: 'contains', value: 'resource.id' },
        ],
        effect: 'allow',
        priority: 90,
      },
      {
        id: 'business_hours_restriction',
        name: 'Business Hours Restriction',
        description: 'Restrict sensitive operations to business hours',
        resourceType: ResourceType.SYSTEM,
        conditions: [
          { field: 'time.hour', operator: 'less_than', value: 8 },
          { field: 'time.hour', operator: 'greater_than', value: 18 },
        ],
        effect: 'deny',
        priority: 80,
      },
    ];

    defaultPolicies.forEach(policy => {
      this.accessPolicies.set(policy.id, policy);
    });
  }

  private async evaluateAccessPolicies(
    context: AccessContext,
    permission: Permission
  ): Promise<AccessDecision> {
    const policies = Array.from(this.accessPolicies.values())
      .filter(p => p.resourceType === context.resourceType)
      .sort((a, b) => b.priority - a.priority);

    const appliedPolicies: string[] = [];

    for (const policy of policies) {
      const matches = this.evaluatePolicyConditions(policy.conditions, context);
      
      if (matches) {
        appliedPolicies.push(policy.id);
        
        if (policy.effect === 'deny') {
          return {
            granted: false,
            reason: `Access denied by policy: ${policy.name}`,
            appliedPolicies,
            requiredPermission: permission,
            evaluatedAt: new Date(),
          };
        } else if (policy.effect === 'allow') {
          return {
            granted: true,
            reason: `Access allowed by policy: ${policy.name}`,
            appliedPolicies,
            requiredPermission: permission,
            evaluatedAt: new Date(),
          };
        }
      }
    }

    // Default deny if no policies match
    return {
      granted: false,
      reason: 'No matching policies found - default deny',
      appliedPolicies,
      requiredPermission: permission,
      evaluatedAt: new Date(),
    };
  }

  private evaluatePolicyConditions(
    conditions: PolicyCondition[],
    context: AccessContext
  ): boolean {
    return conditions.every(condition => {
      const fieldValue = this.getContextFieldValue(condition.field, context);
      return this.evaluateCondition(fieldValue, condition.operator, condition.value);
    });
  }

  private getContextFieldValue(field: string, context: AccessContext): unknown {
    const parts = field.split('.');
    
    if (parts[0] === 'user') {
      if (parts[1] === 'id') return context.userId;
      if (parts[1] === 'roles') return context.userRoles;
    }
    
    if (parts[0] === 'resource') {
      if (parts[1] === 'owner') return context.resourceOwner;
      if (parts[1] === 'id') return context.resourceId;
    }
    
    if (parts[0] === 'time') {
      const now = context.timeOfAccess || new Date();
      if (parts[1] === 'hour') return now.getHours();
    }

    return undefined;
  }

  private evaluateCondition(
    fieldValue: unknown,
    operator: string,
    conditionValue: unknown
  ): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === conditionValue;
      case 'contains':
        return Array.isArray(fieldValue) && fieldValue.includes(conditionValue);
      case 'greater_than':
        return typeof fieldValue === 'number' && fieldValue > (conditionValue as number);
      case 'less_than':
        return typeof fieldValue === 'number' && fieldValue < (conditionValue as number);
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      case 'not_in':
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
      default:
        return false;
    }
  }

  private async auditAccessDecision(
    context: AccessContext,
    decision: AccessDecision
  ): Promise<void> {
    await auditLogger.logEvent(
      decision.granted ? AuditEventType.DATA_ACCESS : AuditEventType.LOGIN_FAILED,
      `Access ${decision.granted ? 'granted' : 'denied'}`,
      decision.granted ? 'success' : 'failure',
      {
        permission: decision.requiredPermission,
        reason: decision.reason,
        resourceType: context.resourceType,
        resourceId: context.resourceId,
        appliedPolicies: decision.appliedPolicies,
      },
      {
        userId: context.userId,
        severity: decision.granted ? AuditSeverity.LOW : AuditSeverity.MEDIUM,
        ipAddress: context.ipAddress,
        sessionId: context.sessionId,
        resource: context.resourceId,
      }
    );
  }

  private clearUserCache(userId: string): void {
    this.permissionCache.delete(userId);
  }

  private calculateLeastPrivilegeScore(): number {
    // Simplified calculation - in production this would be more sophisticated
    const roles = Array.from(this.roleDefinitions.values());
    const avgPermissionsPerRole = roles.reduce((sum, role) => sum + role.permissions.length, 0) / roles.length;
    
    // Lower average permissions per role = higher score
    return Math.max(0, 100 - (avgPermissionsPerRole * 2));
  }

  private calculateRoleSegregationScore(): number {
    // Check for proper role inheritance and separation
    const roles = Array.from(this.roleDefinitions.values());
    const rolesWithInheritance = roles.filter(r => r.inheritsFrom?.length).length;
    
    return Math.min(100, (rolesWithInheritance / roles.length) * 100);
  }
}

// Export singleton instance
export const rbacService = RBACService.getInstance();