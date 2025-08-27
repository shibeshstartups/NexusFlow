import s3Config from '../config/s3.js';
import { logger } from '../utils/logger.js';

class CloudflareCdnService {
  constructor() {
    this.apiToken = null;
    this.zoneId = null;
    this.baseUrl = 'https://api.cloudflare.com/client/v4';
    this.isInitialized = false;
  }

  /**
   * Initialize CDN service
   */
  initialize() {
    try {
      const cdnConfig = s3Config.getCdnConfig();
      
      if (!cdnConfig.enabled) {
        logger.info('CDN is disabled, skipping CDN service initialization');
        return;
      }

      if (!cdnConfig.apiToken || !cdnConfig.zoneId) {
        throw new Error('CDN is enabled but missing required API token or zone ID');
      }

      this.apiToken = cdnConfig.apiToken;
      this.zoneId = cdnConfig.zoneId;
      this.isInitialized = true;

      logger.info('Cloudflare CDN service initialized successfully', {
        zoneId: this.zoneId,
        hasApiToken: !!this.apiToken
      });

    } catch (error) {
      logger.error('Failed to initialize CDN service:', error);
      throw error;
    }
  }

  /**
   * Make API request to Cloudflare
   */
  async makeApiRequest(endpoint, method = 'GET', data = null) {
    if (!this.isInitialized) {
      this.initialize();
    }

    if (!this.isInitialized) {
      throw new Error('CDN service not properly initialized');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(`Cloudflare API error: ${result.errors?.[0]?.message || response.statusText}`);
      }

      return result;
    } catch (error) {
      logger.error('Cloudflare API request failed:', error);
      throw error;
    }
  }

  /**
   * Purge cache for specific URLs
   */
  async purgeUrls(urls) {
    try {
      if (!Array.isArray(urls) || urls.length === 0) {
        throw new Error('URLs array is required and must not be empty');
      }

      // Cloudflare allows max 30 URLs per purge request
      const batchSize = 30;
      const batches = [];
      
      for (let i = 0; i < urls.length; i += batchSize) {
        batches.push(urls.slice(i, i + batchSize));
      }

      const results = [];
      
      for (const batch of batches) {
        const endpoint = `/zones/${this.zoneId}/purge_cache`;
        const data = { files: batch };
        
        const result = await this.makeApiRequest(endpoint, 'POST', data);
        results.push(result);
        
        logger.info('CDN cache purged for URLs', {
          count: batch.length,
          urls: batch.slice(0, 3) // Log first 3 URLs only
        });
      }

      return {
        success: true,
        purgedUrls: urls.length,
        batchCount: batches.length,
        results
      };

    } catch (error) {
      logger.error('CDN cache purge failed:', error);
      throw error;
    }
  }

  /**
   * Purge cache for specific file keys
   */
  async purgeFileKeys(keys, fileTypes = []) {
    try {
      const urls = [];
      const cdnConfig = s3Config.getCdnConfig();

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const fileType = fileTypes[i] || 'other';

        // Generate CDN URL
        const cdnUrl = s3Config.getCdnUrl(key, { fileType });
        urls.push(cdnUrl);

        // Also purge common image transformations if it's an image
        if (fileType === 'image') {
          const transformations = [
            { width: 150, height: 150, quality: 85 }, // thumbnail small
            { width: 300, height: 300, quality: 85 }, // thumbnail medium
            { width: 600, height: 600, quality: 85 }, // thumbnail large
            { width: 800, quality: 90 }, // common web size
            { width: 1200, quality: 85 }, // high res
          ];

          for (const transform of transformations) {
            const transformedUrl = s3Config.getCdnUrl(key, { 
              fileType, 
              transformations: transform 
            });
            urls.push(transformedUrl);
          }
        }
      }

      return await this.purgeUrls(urls);

    } catch (error) {
      logger.error('Failed to purge file keys:', error);
      throw error;
    }
  }

  /**
   * Purge entire cache (use with caution)
   */
  async purgeEverything() {
    try {
      const endpoint = `/zones/${this.zoneId}/purge_cache`;
      const data = { purge_everything: true };
      
      const result = await this.makeApiRequest(endpoint, 'POST', data);
      
      logger.warn('CDN cache purged entirely', {
        zoneId: this.zoneId,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        result
      };

    } catch (error) {
      logger.error('Failed to purge entire cache:', error);
      throw error;
    }
  }

  /**
   * Get cache analytics
   */
  async getCacheAnalytics(since = '2024-01-01', until = null) {
    try {
      const sinceDate = new Date(since).toISOString();
      const untilDate = until ? new Date(until).toISOString() : new Date().toISOString();

      const endpoint = `/zones/${this.zoneId}/analytics/dashboard`;
      const params = new URLSearchParams({
        since: sinceDate,
        until: untilDate,
        continuous: 'true'
      });

      const result = await this.makeApiRequest(`${endpoint}?${params}`, 'GET');

      const analytics = {
        requests: {
          cached: result.result?.totals?.requests?.cached || 0,
          uncached: result.result?.totals?.requests?.uncached || 0,
          total: result.result?.totals?.requests?.all || 0
        },
        bandwidth: {
          cached: result.result?.totals?.bandwidth?.cached || 0,
          uncached: result.result?.totals?.bandwidth?.uncached || 0,
          total: result.result?.totals?.bandwidth?.all || 0
        },
        cacheHitRatio: 0
      };

      // Calculate cache hit ratio
      if (analytics.requests.total > 0) {
        analytics.cacheHitRatio = (analytics.requests.cached / analytics.requests.total) * 100;
      }

      logger.info('CDN analytics retrieved', {
        period: `${since} to ${until || 'now'}`,
        cacheHitRatio: `${analytics.cacheHitRatio.toFixed(2)}%`,
        totalRequests: analytics.requests.total
      });

      return analytics;

    } catch (error) {
      logger.error('Failed to get cache analytics:', error);
      throw error;
    }
  }

  /**
   * Update cache rules for better optimization
   */
  async updateCacheRules() {
    try {
      // Get existing page rules
      const rulesEndpoint = `/zones/${this.zoneId}/pagerules`;
      const existingRules = await this.makeApiRequest(rulesEndpoint, 'GET');

      const newRules = [
        {
          targets: [{
            target: 'url',
            constraint: {
              operator: 'matches',
              value: '**/files/*'
            }
          }],
          actions: [
            {
              id: 'cache_level',
              value: 'cache_everything'
            },
            {
              id: 'edge_cache_ttl',
              value: 86400 // 24 hours
            },
            {
              id: 'browser_cache_ttl',
              value: 86400 // 24 hours
            }
          ],
          status: 'active'
        },
        {
          targets: [{
            target: 'url',
            constraint: {
              operator: 'matches',
              value: '**/thumbnails/*'
            }
          }],
          actions: [
            {
              id: 'cache_level',
              value: 'cache_everything'
            },
            {
              id: 'edge_cache_ttl',
              value: 604800 // 7 days
            },
            {
              id: 'browser_cache_ttl',
              value: 604800 // 7 days
            }
          ],
          status: 'active'
        }
      ];

      const results = [];
      for (const rule of newRules) {
        const result = await this.makeApiRequest(rulesEndpoint, 'POST', rule);
        results.push(result);
      }

      logger.info('CDN cache rules updated', {
        rulesCreated: results.length
      });

      return {
        success: true,
        rulesCreated: results.length,
        results
      };

    } catch (error) {
      logger.error('Failed to update cache rules:', error);
      throw error;
    }
  }

  /**
   * Check CDN service status
   */
  async getStatus() {
    try {
      if (!this.isInitialized) {
        return {
          enabled: false,
          message: 'CDN service not initialized'
        };
      }

      // Test API connectivity
      const endpoint = `/zones/${this.zoneId}`;
      const result = await this.makeApiRequest(endpoint, 'GET');

      return {
        enabled: true,
        zoneId: this.zoneId,
        zoneName: result.result?.name,
        status: result.result?.status,
        message: 'CDN service operational'
      };

    } catch (error) {
      logger.error('CDN status check failed:', error);
      return {
        enabled: false,
        error: error.message,
        message: 'CDN service unavailable'
      };
    }
  }

  /**
   * Get bandwidth and cost optimization recommendations
   */
  async getOptimizationRecommendations() {
    try {
      const analytics = await this.getCacheAnalytics();
      const recommendations = [];

      // Cache hit ratio recommendations
      if (analytics.cacheHitRatio < 80) {
        recommendations.push({
          type: 'cache_optimization',
          priority: 'high',
          message: `Cache hit ratio is ${analytics.cacheHitRatio.toFixed(1)}%. Consider extending cache TTL for static assets.`,
          action: 'Increase cache TTL for images and videos'
        });
      }

      // Bandwidth optimization
      const bandwidthSavings = analytics.bandwidth.cached;
      const totalBandwidth = analytics.bandwidth.total;
      const savingsPercentage = totalBandwidth > 0 ? (bandwidthSavings / totalBandwidth) * 100 : 0;

      if (savingsPercentage < 70) {
        recommendations.push({
          type: 'bandwidth_optimization',
          priority: 'medium',
          message: `Only ${savingsPercentage.toFixed(1)}% of bandwidth is being saved through caching.`,
          action: 'Enable caching for more file types and increase TTL'
        });
      }

      // Cost optimization
      const monthlySavings = (bandwidthSavings / (1024 * 1024 * 1024)) * 0.045; // Estimated at $0.045/GB
      recommendations.push({
        type: 'cost_savings',
        priority: 'info',
        message: `Estimated monthly bandwidth cost savings: $${monthlySavings.toFixed(2)}`,
        action: 'Continue optimizing cache strategies'
      });

      return {
        analytics,
        recommendations,
        summary: {
          cacheHitRatio: analytics.cacheHitRatio,
          bandwidthSavings: this.formatBytes(bandwidthSavings),
          estimatedMonthlySavings: `$${monthlySavings.toFixed(2)}`
        }
      };

    } catch (error) {
      logger.error('Failed to get optimization recommendations:', error);
      throw error;
    }
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

// Singleton instance
const cloudflareCdnService = new CloudflareCdnService();

export default cloudflareCdnService;