import { performance } from 'perf_hooks';
import { logger } from '../src/utils/logger.js';

/**
 * Performance Monitoring and Load Testing Utilities
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.activeOperations = new Map();
    this.thresholds = {
      upload: 30000, // 30s max for uploads
      download: 45000, // 45s max for downloads
      zipCreation: 120000, // 2min max for ZIP creation
      integrity: 60000, // 1min max for integrity checks
      apiResponse: 5000 // 5s max for API responses
    };
  }

  /**
   * Start timing an operation
   */
  startTiming(operationId, operationType, metadata = {}) {
    const startTime = performance.now();
    this.activeOperations.set(operationId, {
      type: operationType,
      startTime,
      metadata
    });
    
    logger.info(`Started ${operationType} operation`, {
      operationId,
      metadata
    });
  }

  /**
   * End timing an operation
   */
  endTiming(operationId, result = {}) {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      logger.warn(`Operation ${operationId} not found in active operations`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - operation.startTime;
    const threshold = this.thresholds[operation.type] || 10000;

    const metric = {
      operationId,
      type: operation.type,
      duration,
      threshold,
      exceedsThreshold: duration > threshold,
      startTime: operation.startTime,
      endTime,
      metadata: operation.metadata,
      result
    };

    // Store metric
    if (!this.metrics.has(operation.type)) {
      this.metrics.set(operation.type, []);
    }
    this.metrics.get(operation.type).push(metric);

    // Remove from active operations
    this.activeOperations.delete(operationId);

    // Log performance
    if (metric.exceedsThreshold) {
      logger.warn(`${operation.type} operation exceeded threshold`, {
        operationId,
        duration: `${Math.round(duration)}ms`,
        threshold: `${threshold}ms`,
        metadata: operation.metadata
      });
    } else {
      logger.info(`${operation.type} operation completed`, {
        operationId,
        duration: `${Math.round(duration)}ms`,
        metadata: operation.metadata
      });
    }

    return metric;
  }

  /**
   * Get performance statistics
   */
  getStats(operationType = null) {
    const stats = {};

    const processMetrics = (metrics, type) => {
      if (metrics.length === 0) return null;

      const durations = metrics.map(m => m.duration);
      const exceedCount = metrics.filter(m => m.exceedsThreshold).length;

      return {
        type,
        count: metrics.length,
        totalDuration: durations.reduce((sum, d) => sum + d, 0),
        averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        medianDuration: durations.sort()[Math.floor(durations.length / 2)],
        thresholdExceeded: exceedCount,
        thresholdExceededPercent: (exceedCount / metrics.length) * 100,
        recentMetrics: metrics.slice(-10) // Last 10 operations
      };
    };

    if (operationType && this.metrics.has(operationType)) {
      return processMetrics(this.metrics.get(operationType), operationType);
    }

    for (const [type, metrics] of this.metrics.entries()) {
      stats[type] = processMetrics(metrics, type);
    }

    return stats;
  }

  /**
   * Clear old metrics (keep last 1000 per type)
   */
  cleanupMetrics() {
    for (const [type, metrics] of this.metrics.entries()) {
      if (metrics.length > 1000) {
        this.metrics.set(type, metrics.slice(-1000));
      }
    }
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const stats = this.getStats();
    const activeOps = Array.from(this.activeOperations.entries()).map(([id, op]) => ({
      id,
      type: op.type,
      duration: performance.now() - op.startTime,
      metadata: op.metadata
    }));

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalOperations: Object.values(stats).reduce((sum, s) => sum + (s?.count || 0), 0),
        activeOperations: activeOps.length,
        averagePerformance: this.calculateOverallPerformance(stats)
      },
      operationTypes: stats,
      activeOperations: activeOps,
      alerts: this.generateAlerts(stats, activeOps)
    };
  }

  /**
   * Calculate overall performance score
   */
  calculateOverallPerformance(stats) {
    let totalOps = 0;
    let totalExceeded = 0;

    for (const stat of Object.values(stats)) {
      if (stat) {
        totalOps += stat.count;
        totalExceeded += stat.thresholdExceeded;
      }
    }

    const successRate = totalOps > 0 ? ((totalOps - totalExceeded) / totalOps) * 100 : 100;
    return {
      successRate,
      grade: this.getPerformanceGrade(successRate)
    };
  }

  /**
   * Get performance grade
   */
  getPerformanceGrade(successRate) {
    if (successRate >= 95) return 'A+';
    if (successRate >= 90) return 'A';
    if (successRate >= 85) return 'B+';
    if (successRate >= 80) return 'B';
    if (successRate >= 70) return 'C';
    return 'D';
  }

  /**
   * Generate performance alerts
   */
  generateAlerts(stats, activeOps) {
    const alerts = [];

    // Check for long-running operations
    const longRunning = activeOps.filter(op => op.duration > (this.thresholds[op.type] || 10000));
    if (longRunning.length > 0) {
      alerts.push({
        type: 'LONG_RUNNING_OPERATIONS',
        severity: 'warning',
        message: `${longRunning.length} operations running longer than expected`,
        operations: longRunning
      });
    }

    // Check for high failure rates
    for (const [type, stat] of Object.entries(stats)) {
      if (stat && stat.thresholdExceededPercent > 20) {
        alerts.push({
          type: 'HIGH_FAILURE_RATE',
          severity: 'critical',
          message: `${type} operations have ${stat.thresholdExceededPercent.toFixed(1)}% failure rate`,
          operationType: type,
          details: stat
        });
      }
    }

    // Check for performance degradation
    for (const [type, stat] of Object.entries(stats)) {
      if (stat && stat.recentMetrics.length >= 5) {
        const recentAvg = stat.recentMetrics.slice(-5).reduce((sum, m) => sum + m.duration, 0) / 5;
        if (recentAvg > stat.averageDuration * 1.5) {
          alerts.push({
            type: 'PERFORMANCE_DEGRADATION',
            severity: 'warning',
            message: `${type} operations showing performance degradation`,
            operationType: type,
            recentAverage: recentAvg,
            overallAverage: stat.averageDuration
          });
        }
      }
    }

    return alerts;
  }
}

/**
 * Load Testing Utilities
 */
class LoadTester {
  constructor(performanceMonitor) {
    this.monitor = performanceMonitor;
    this.testResults = [];
  }

  /**
   * Simulate bulk file upload load
   */
  async simulateUploadLoad(options = {}) {
    const {
      concurrentUploads = 10,
      filesPerUpload = 5,
      fileSizeKB = 100,
      duration = 60000 // 1 minute
    } = options;

    logger.info('Starting upload load test', options);
    const testId = `upload-load-${Date.now()}`;
    const startTime = Date.now();
    const results = {
      testId,
      type: 'upload_load',
      options,
      startTime,
      operations: [],
      errors: []
    };

    const workers = [];
    
    // Create concurrent upload workers
    for (let i = 0; i < concurrentUploads; i++) {
      workers.push(this.uploadWorker(i, filesPerUpload, fileSizeKB, duration, results));
    }

    // Wait for all workers to complete
    await Promise.allSettled(workers);

    results.endTime = Date.now();
    results.totalDuration = results.endTime - results.startTime;
    results.summary = this.analyzeBulkResults(results);

    this.testResults.push(results);
    return results;
  }

  /**
   * Upload worker for load testing
   */
  async uploadWorker(workerId, filesPerUpload, fileSizeKB, duration, results) {
    const workerStartTime = Date.now();
    let operationCount = 0;

    while (Date.now() - workerStartTime < duration) {
      const operationId = `worker-${workerId}-op-${operationCount}`;
      
      try {
        this.monitor.startTiming(operationId, 'upload', {
          workerId,
          filesCount: filesPerUpload,
          fileSize: fileSizeKB * 1024
        });

        // Simulate file upload processing time
        await this.simulateUploadProcessing(filesPerUpload, fileSizeKB);

        const metric = this.monitor.endTiming(operationId, { success: true });
        results.operations.push(metric);

        operationCount++;
        
        // Brief pause between operations
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        this.monitor.endTiming(operationId, { success: false, error: error.message });
        results.errors.push({
          workerId,
          operationId,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }

    logger.info(`Upload worker ${workerId} completed ${operationCount} operations`);
  }

  /**
   * Simulate download load
   */
  async simulateDownloadLoad(options = {}) {
    const {
      concurrentDownloads = 5,
      filesPerDownload = 20,
      zipSizeMB = 50,
      duration = 120000 // 2 minutes
    } = options;

    logger.info('Starting download load test', options);
    const testId = `download-load-${Date.now()}`;
    const startTime = Date.now();
    const results = {
      testId,
      type: 'download_load',
      options,
      startTime,
      operations: [],
      errors: []
    };

    const workers = [];
    
    for (let i = 0; i < concurrentDownloads; i++) {
      workers.push(this.downloadWorker(i, filesPerDownload, zipSizeMB, duration, results));
    }

    await Promise.allSettled(workers);

    results.endTime = Date.now();
    results.totalDuration = results.endTime - results.startTime;
    results.summary = this.analyzeBulkResults(results);

    this.testResults.push(results);
    return results;
  }

  /**
   * Download worker for load testing
   */
  async downloadWorker(workerId, filesPerDownload, zipSizeMB, duration, results) {
    const workerStartTime = Date.now();
    let operationCount = 0;

    while (Date.now() - workerStartTime < duration) {
      const operationId = `download-worker-${workerId}-op-${operationCount}`;
      
      try {
        this.monitor.startTiming(operationId, 'download', {
          workerId,
          filesCount: filesPerDownload,
          expectedZipSize: zipSizeMB * 1024 * 1024
        });

        // Simulate ZIP creation and download time
        await this.simulateZipCreation(filesPerDownload, zipSizeMB);

        const metric = this.monitor.endTiming(operationId, { success: true });
        results.operations.push(metric);

        operationCount++;
        
        // Pause between downloads
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        this.monitor.endTiming(operationId, { success: false, error: error.message });
        results.errors.push({
          workerId,
          operationId,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }

    logger.info(`Download worker ${workerId} completed ${operationCount} operations`);
  }

  /**
   * Simulate upload processing time
   */
  async simulateUploadProcessing(fileCount, fileSizeKB) {
    // Base processing time + file-dependent time
    const baseTime = 200; // 200ms base
    const perFileTime = 50; // 50ms per file
    const sizeTime = fileSizeKB * 0.1; // 0.1ms per KB
    
    const processingTime = baseTime + (fileCount * perFileTime) + sizeTime;
    
    // Add some random variation (±20%)
    const variation = processingTime * 0.2 * (Math.random() - 0.5);
    const finalTime = Math.max(100, processingTime + variation);

    await new Promise(resolve => setTimeout(resolve, finalTime));

    // Simulate occasional failures
    if (Math.random() < 0.02) { // 2% failure rate
      throw new Error('Simulated upload failure');
    }
  }

  /**
   * Simulate ZIP creation time
   */
  async simulateZipCreation(fileCount, zipSizeMB) {
    // ZIP creation is more intensive
    const baseTime = 500; // 500ms base
    const perFileTime = 20; // 20ms per file
    const sizeTime = zipSizeMB * 100; // 100ms per MB
    
    const processingTime = baseTime + (fileCount * perFileTime) + sizeTime;
    
    // More variation for ZIP creation (±30%)
    const variation = processingTime * 0.3 * (Math.random() - 0.5);
    const finalTime = Math.max(500, processingTime + variation);

    await new Promise(resolve => setTimeout(resolve, finalTime));

    // Simulate failures (network, storage, etc.)
    if (Math.random() < 0.03) { // 3% failure rate
      throw new Error('Simulated ZIP creation failure');
    }
  }

  /**
   * Analyze bulk test results
   */
  analyzeBulkResults(results) {
    const operations = results.operations.filter(op => op);
    const errors = results.errors;
    
    if (operations.length === 0) {
      return { status: 'no_operations' };
    }

    const durations = operations.map(op => op.duration);
    const successfulOps = operations.filter(op => op.result?.success).length;
    
    return {
      totalOperations: operations.length,
      successfulOperations: successfulOps,
      failedOperations: errors.length,
      successRate: (successfulOps / (successfulOps + errors.length)) * 100,
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      throughput: operations.length / (results.totalDuration / 1000), // ops per second
      recommendedMaxConcurrency: this.calculateRecommendedConcurrency(results)
    };
  }

  /**
   * Calculate recommended concurrency based on results
   */
  calculateRecommendedConcurrency(results) {
    const { summary } = results;
    const { successRate, throughput } = summary;
    
    // If success rate is high and throughput is good, can handle more
    if (successRate > 95 && throughput > 5) {
      return Math.ceil(results.options.concurrentUploads * 1.2);
    }
    
    // If success rate is poor, reduce concurrency
    if (successRate < 85) {
      return Math.floor(results.options.concurrentUploads * 0.7);
    }
    
    return results.options.concurrentUploads;
  }

  /**
   * Generate load test report
   */
  generateLoadTestReport() {
    return {
      timestamp: new Date().toISOString(),
      totalTests: this.testResults.length,
      tests: this.testResults.map(test => ({
        testId: test.testId,
        type: test.type,
        duration: test.totalDuration,
        summary: test.summary
      })),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Analyze upload tests
    const uploadTests = this.testResults.filter(t => t.type === 'upload_load');
    if (uploadTests.length > 0) {
      const avgSuccessRate = uploadTests.reduce((sum, t) => sum + t.summary.successRate, 0) / uploadTests.length;
      
      if (avgSuccessRate < 90) {
        recommendations.push({
          type: 'upload_optimization',
          priority: 'high',
          message: 'Upload success rate is below 90%. Consider implementing retry logic and connection pooling.',
          details: { averageSuccessRate: avgSuccessRate }
        });
      }
      
      const avgThroughput = uploadTests.reduce((sum, t) => sum + t.summary.throughput, 0) / uploadTests.length;
      if (avgThroughput < 2) {
        recommendations.push({
          type: 'upload_throughput',
          priority: 'medium',
          message: 'Upload throughput is low. Consider optimizing file processing pipeline.',
          details: { averageThroughput: avgThroughput }
        });
      }
    }
    
    // Analyze download tests
    const downloadTests = this.testResults.filter(t => t.type === 'download_load');
    if (downloadTests.length > 0) {
      const avgDuration = downloadTests.reduce((sum, t) => sum + t.summary.averageDuration, 0) / downloadTests.length;
      
      if (avgDuration > 60000) { // > 1 minute
        recommendations.push({
          type: 'download_performance',
          priority: 'high',
          message: 'Download operations are taking too long. Consider background processing for large files.',
          details: { averageDuration: avgDuration }
        });
      }
    }
    
    return recommendations;
  }
}

// Create singleton instances
export const performanceMonitor = new PerformanceMonitor();
export const loadTester = new LoadTester(performanceMonitor);

// Cleanup metrics every hour
setInterval(() => {
  performanceMonitor.cleanupMetrics();
}, 60 * 60 * 1000);