import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

class DatabaseOptimizationService {
  constructor() {
    this.optimizations = new Map();
    this.indexCreationQueue = [];
  }

  /**
   * Initialize and create all optimized indexes
   */
  async initialize() {
    try {
      logger.info('Starting database optimization...');
      
      await this.createOptimizedIndexes();
      await this.createQueryOptimizations();
      await this.setupIndexMaintenance();
      
      logger.info('Database optimization completed successfully');
    } catch (error) {
      logger.error('Database optimization failed:', error);
      throw error;
    }
  }

  /**
   * Create high-performance compound indexes
   */
  async createOptimizedIndexes() {
    const db = mongoose.connection.db;
    
    // File Collection Optimized Indexes
    const fileIndexes = [
      // Core query patterns - most frequent queries first
      {
        fields: { owner: 1, project: 1, isDeleted: 1, type: 1, createdAt: -1 },
        options: { name: 'files_owner_project_type_date', background: true },
        description: 'Primary file listing with filtering'
      },
      {
        fields: { owner: 1, isDeleted: 1, lastActivity: -1 },
        options: { name: 'files_owner_activity', background: true },
        description: 'Recent files dashboard'
      },
      {
        fields: { project: 1, folder: 1, isDeleted: 1, 'metadata.isFavorite': 1 },
        options: { name: 'files_project_folder_favorites', background: true },
        description: 'Project file browser with favorites'
      },
      {
        fields: { type: 1, size: -1, createdAt: -1 },
        options: { name: 'files_type_size_date', background: true },
        description: 'File type analytics and large file queries'
      },
      {
        fields: { 'sharing.isEnabled': 1, 'sharing.expiresAt': 1, isDeleted: 1 },
        options: { name: 'files_sharing_expiry', background: true },
        description: 'Shared files and expiry cleanup'
      },
      {
        fields: { checksum: 1, owner: 1, isDeleted: 1 },
        options: { name: 'files_deduplication', background: true },
        description: 'File deduplication optimization'
      },
      {
        fields: { 'analytics.viewCount': -1, isDeleted: 1, type: 1 },
        options: { name: 'files_analytics_popular', background: true },
        description: 'Popular files analytics'
      },
      {
        fields: { 'storage.provider': 1, 'storage.uploadId': 1, status: 1 },
        options: { name: 'files_storage_uploads', background: true },
        description: 'Storage provider and upload tracking'
      },
      {
        fields: { uploadedBy: 1, createdAt: -1, isDeleted: 1 },
        options: { name: 'files_uploader_history', background: true },
        description: 'User upload history'
      },
      {
        fields: { tags: 1, type: 1, isDeleted: 1 },
        options: { name: 'files_tags_type', background: true },
        description: 'Tag-based file filtering'
      }
    ];

    // Project Collection Optimized Indexes
    const projectIndexes = [
      {
        fields: { owner: 1, status: 1, priority: 1, lastActivity: -1 },
        options: { name: 'projects_owner_status_priority', background: true },
        description: 'Primary project dashboard'
      },
      {
        fields: { client: 1, status: 1, 'timeline.deliveryDate': 1 },
        options: { name: 'projects_client_delivery', background: true },
        description: 'Client projects with deadlines'
      },
      {
        fields: { category: 1, status: 1, createdAt: -1 },
        options: { name: 'projects_category_status', background: true },
        description: 'Project categorization and filtering'
      },
      {
        fields: { 'sharing.isEnabled': 1, 'sharing.shareToken': 1 },
        options: { name: 'projects_sharing_token', background: true },
        description: 'Shared project access'
      },
      {
        fields: { tags: 1, status: 1, owner: 1 },
        options: { name: 'projects_tags_status', background: true },
        description: 'Tag-based project search'
      }
    ];

    // Folder Collection Optimized Indexes  
    const folderIndexes = [
      {
        fields: { project: 1, parent: 1, isDeleted: 1, depth: 1 },
        options: { name: 'folders_hierarchy_optimized', background: true },
        description: 'Folder hierarchy navigation'
      },
      {
        fields: { owner: 1, project: 1, path: 1 },
        options: { name: 'folders_owner_path', background: true },
        description: 'Folder path resolution'
      },
      {
        fields: { fullPath: 1, project: 1, isDeleted: 1 },
        options: { name: 'folders_fullpath_project', background: true },
        description: 'Full path lookups'
      }
    ];

    // Client Collection Optimized Indexes
    const clientIndexes = [
      {
        fields: { owner: 1, status: 1, lastActivity: -1 },
        options: { name: 'clients_owner_status_activity', background: true },
        description: 'Client management dashboard'
      },
      {
        fields: { email: 1, status: 1 },
        options: { name: 'clients_email_status', background: true },
        description: 'Client lookup and filtering'
      }
    ];

    // User Collection Optimized Indexes
    const userIndexes = [
      {
        fields: { email: 1, isActive: 1 },
        options: { name: 'users_email_active', background: true },
        description: 'User authentication lookup'
      },
      {
        fields: { plan: 1, storageUsed: -1 },
        options: { name: 'users_plan_storage', background: true },
        description: 'Storage analytics by plan'
      }
    ];

    // Create all indexes
    await this.createIndexBatch(db, 'files', fileIndexes);
    await this.createIndexBatch(db, 'projects', projectIndexes);
    await this.createIndexBatch(db, 'folders', folderIndexes);
    await this.createIndexBatch(db, 'clients', clientIndexes);
    await this.createIndexBatch(db, 'users', userIndexes);

    // Create TTL indexes for cleanup
    await this.createTTLIndexes(db);
  }

  /**
   * Create indexes in batches for better performance
   */
  async createIndexBatch(db, collectionName, indexes) {
    const collection = db.collection(collectionName);
    
    for (const index of indexes) {
      try {
        await collection.createIndex(index.fields, index.options);
        logger.info(`Created index: ${index.options.name} - ${index.description}`);
        
        this.optimizations.set(index.options.name, {
          collection: collectionName,
          fields: index.fields,
          description: index.description,
          createdAt: new Date()
        });
      } catch (error) {
        if (error.code === 85) { // Index already exists
          logger.debug(`Index ${index.options.name} already exists`);
        } else {
          logger.error(`Failed to create index ${index.options.name}:`, error);
        }
      }
    }
  }

  /**
   * Create TTL indexes for automatic cleanup
   */
  async createTTLIndexes(db) {
    const ttlIndexes = [
      {
        collection: 'files',
        fields: { createdAt: 1 },
        options: { 
          expireAfterSeconds: 86400, // 24 hours
          partialFilterExpression: { 
            category: 'temp',
            isDeleted: true 
          },
          name: 'files_temp_cleanup'
        },
        description: 'Auto-cleanup temporary deleted files'
      },
      {
        collection: 'files',
        fields: { 'sharing.expiresAt': 1 },
        options: { 
          expireAfterSeconds: 0, // Expire at specified date
          partialFilterExpression: { 
            'sharing.isEnabled': true 
          },
          name: 'files_sharing_expiry_cleanup'
        },
        description: 'Auto-expire shared file links'
      },
      {
        collection: 'projects',
        fields: { deletedAt: 1 },
        options: { 
          expireAfterSeconds: 2592000, // 30 days
          partialFilterExpression: { 
            status: 'archived' 
          },
          name: 'projects_archive_cleanup'
        },
        description: 'Auto-cleanup archived projects after 30 days'
      }
    ];

    for (const ttlIndex of ttlIndexes) {
      try {
        const collection = db.collection(ttlIndex.collection);
        await collection.createIndex(ttlIndex.fields, ttlIndex.options);
        logger.info(`Created TTL index: ${ttlIndex.options.name} - ${ttlIndex.description}`);
      } catch (error) {
        if (error.code === 85) {
          logger.debug(`TTL index ${ttlIndex.options.name} already exists`);
        } else {
          logger.error(`Failed to create TTL index ${ttlIndex.options.name}:`, error);
        }
      }
    }
  }

  /**
   * Create optimized aggregation pipelines
   */
  async createQueryOptimizations() {
    // Add query hint configurations for common queries
    this.queryHints = {
      filesByProjectAndType: { owner: 1, project: 1, type: 1, createdAt: -1 },
      popularFiles: { 'analytics.viewCount': -1, isDeleted: 1, type: 1 },
      recentActivity: { owner: 1, isDeleted: 1, lastActivity: -1 },
      storageAnalytics: { type: 1, size: -1, createdAt: -1 },
      sharedFiles: { 'sharing.isEnabled': 1, 'sharing.expiresAt': 1, isDeleted: 1 }
    };

    logger.info('Query optimization hints configured');
  }

  /**
   * Get optimized query hint for specific query type
   */
  getQueryHint(queryType) {
    return this.queryHints[queryType] || null;
  }

  /**
   * Setup index maintenance and monitoring
   */
  async setupIndexMaintenance() {
    // Schedule periodic index statistics collection
    setInterval(async () => {
      try {
        await this.collectIndexStats();
      } catch (error) {
        logger.error('Index statistics collection failed:', error);
      }
    }, 3600000); // Every hour

    logger.info('Index maintenance scheduled');
  }

  /**
   * Collect index usage statistics
   */
  async collectIndexStats() {
    try {
      const db = mongoose.connection.db;
      const collections = ['files', 'projects', 'folders', 'clients', 'users'];
      
      for (const collectionName of collections) {
        const collection = db.collection(collectionName);
        const stats = await collection.aggregate([
          { $indexStats: {} }
        ]).toArray();
        
        // Log index usage for monitoring
        stats.forEach(stat => {
          if (stat.accesses.ops < 10) {
            logger.warn(`Low usage index detected: ${stat.name} in ${collectionName}`, {
              operations: stat.accesses.ops,
              since: stat.accesses.since
            });
          }
        });
      }
    } catch (error) {
      logger.error('Failed to collect index statistics:', error);
    }
  }

  /**
   * Get database performance metrics
   */
  async getPerformanceMetrics() {
    try {
      const db = mongoose.connection.db;
      const adminDb = db.admin();
      
      // Get server status
      const serverStatus = await adminDb.serverStatus();
      
      // Get database stats
      const dbStats = await db.stats();
      
      return {
        connections: {
          current: serverStatus.connections.current,
          available: serverStatus.connections.available
        },
        memory: {
          resident: serverStatus.mem.resident,
          virtual: serverStatus.mem.virtual,
          mapped: serverStatus.mem.mapped
        },
        operations: {
          insert: serverStatus.opcounters.insert,
          query: serverStatus.opcounters.query,
          update: serverStatus.opcounters.update,
          delete: serverStatus.opcounters.delete
        },
        database: {
          collections: dbStats.collections,
          objects: dbStats.objects,
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexSize: dbStats.indexSize
        },
        optimizations: Array.from(this.optimizations.values())
      };
    } catch (error) {
      logger.error('Failed to get performance metrics:', error);
      throw error;
    }
  }

  /**
   * Analyze slow queries and suggest optimizations
   */
  async analyzeSlowQueries() {
    try {
      const db = mongoose.connection.db;
      
      // Enable profiling for slow operations (> 100ms)
      await db.command({ profile: 2, slowms: 100 });
      
      // Get profiling data
      const profilingData = await db.collection('system.profile')
        .find({})
        .sort({ ts: -1 })
        .limit(100)
        .toArray();
      
      const suggestions = [];
      
      profilingData.forEach(profile => {
        if (profile.millis > 500) { // Very slow queries
          suggestions.push({
            namespace: profile.ns,
            duration: profile.millis,
            command: profile.command,
            suggestion: this.generateOptimizationSuggestion(profile)
          });
        }
      });
      
      return suggestions;
    } catch (error) {
      logger.error('Failed to analyze slow queries:', error);
      return [];
    }
  }

  /**
   * Generate optimization suggestions for slow queries
   */
  generateOptimizationSuggestion(profile) {
    const suggestions = [];
    
    if (profile.planSummary && profile.planSummary.includes('COLLSCAN')) {
      suggestions.push('Add index for fields used in query filter');
    }
    
    if (profile.docsExamined > profile.docsReturned * 10) {
      suggestions.push('Optimize query selectivity - too many documents examined');
    }
    
    if (profile.millis > 1000) {
      suggestions.push('Consider breaking down complex aggregation into smaller operations');
    }
    
    return suggestions.length > 0 ? suggestions.join('; ') : 'Review query structure and indexing strategy';
  }

  /**
   * Drop unused indexes to free up space
   */
  async dropUnusedIndexes(dryRun = true) {
    try {
      const db = mongoose.connection.db;
      const collections = ['files', 'projects', 'folders', 'clients', 'users'];
      const unusedIndexes = [];
      
      for (const collectionName of collections) {
        const collection = db.collection(collectionName);
        const stats = await collection.aggregate([{ $indexStats: {} }]).toArray();
        
        stats.forEach(stat => {
          if (stat.accesses.ops === 0 && !stat.name.startsWith('_id')) {
            unusedIndexes.push({
              collection: collectionName,
              index: stat.name,
              size: stat.size || 0
            });
          }
        });
      }
      
      if (dryRun) {
        logger.info('Unused indexes found (dry run):', unusedIndexes);
        return unusedIndexes;
      }
      
      // Actually drop unused indexes
      for (const unused of unusedIndexes) {
        try {
          await db.collection(unused.collection).dropIndex(unused.index);
          logger.info(`Dropped unused index: ${unused.index} from ${unused.collection}`);
        } catch (error) {
          logger.error(`Failed to drop index ${unused.index}:`, error);
        }
      }
      
      return unusedIndexes;
    } catch (error) {
      logger.error('Failed to analyze unused indexes:', error);
      return [];
    }
  }
}

// Singleton instance
const databaseOptimizationService = new DatabaseOptimizationService();

export default databaseOptimizationService;
