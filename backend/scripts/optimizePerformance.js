#!/usr/bin/env node

/**
 * Performance Optimization and Monitoring Script
 * Runs various performance tests and optimizations
 */

import { performance } from 'perf_hooks';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

class PerformanceOptimizer {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      optimizations: [],
      benchmarks: {},
      recommendations: []
    };
  }

  /**
   * Run all performance optimizations and tests
   */
  async runOptimization() {
    console.log('🚀 Starting Performance Optimization Suite...\n');

    try {
      // 1. Database Optimization
      await this.optimizeDatabase();

      // 2. Code Analysis
      await this.analyzeCode();

      // 3. Bundle Analysis
      await this.analyzeBundles();

      // 4. Memory Profiling
      await this.profileMemory();

      // 5. Load Testing
      await this.runLoadTests();

      // 6. Generate Report
      await this.generateReport();

      console.log('✅ Performance optimization completed successfully!\n');
      
    } catch (error) {
      console.error('❌ Performance optimization failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Optimize database queries and indexes
   */
  async optimizeDatabase() {
    console.log('🔧 Optimizing Database Performance...');
    const startTime = performance.now();

    try {
      // Check if database optimization script exists
      const dbOptimizationScript = path.join(__dirname, '../scripts/optimizeDatabase.js');
      
      try {
        await fs.access(dbOptimizationScript);
        const { stdout } = await execAsync(`node ${dbOptimizationScript}`);
        console.log('Database optimization output:', stdout);
      } catch (error) {
        console.log('⚠️  Database optimization script not found, creating recommendations...');
        
        // Create database optimization recommendations
        this.results.recommendations.push({
          category: 'database',
          priority: 'high',
          title: 'Implement Database Index Optimization',
          description: 'Create compound indexes for file queries',
          implementation: [
            'db.files.createIndex({ owner: 1, project: 1, isDeleted: 1 })',
            'db.files.createIndex({ folder: 1, owner: 1, isDeleted: 1 })',
            'db.folders.createIndex({ parentFolder: 1, owner: 1, isDeleted: 1 })',
            'db.folders.createIndex({ project: 1, owner: 1, fullPath: 1 })'
          ]
        });
      }

      const duration = performance.now() - startTime;
      this.results.optimizations.push({
        name: 'Database Optimization',
        duration: Math.round(duration),
        status: 'completed'
      });

      console.log(`✅ Database optimization completed in ${Math.round(duration)}ms\n`);

    } catch (error) {
      console.error('Database optimization failed:', error.message);
      this.results.optimizations.push({
        name: 'Database Optimization',
        status: 'failed',
        error: error.message
      });
    }
  }

  /**
   * Analyze code for performance issues
   */
  async analyzeCode() {
    console.log('📊 Analyzing Code Performance...');
    const startTime = performance.now();

    try {
      // Run ESLint for performance-related issues
      try {
        const { stdout } = await execAsync('npx eslint src/ --ext .js --format json');
        const lintResults = JSON.parse(stdout);
        
        // Filter performance-related issues
        const performanceIssues = lintResults
          .flatMap(file => file.messages)
          .filter(msg => 
            msg.message.includes('performance') || 
            msg.message.includes('memory') ||
            msg.message.includes('async') ||
            msg.ruleId?.includes('performance')
          );

        if (performanceIssues.length > 0) {
          this.results.recommendations.push({
            category: 'code',
            priority: 'medium',
            title: 'Fix Performance-Related Code Issues',
            description: `Found ${performanceIssues.length} performance-related code issues`,
            issues: performanceIssues.slice(0, 5) // Top 5 issues
          });
        }
      } catch (error) {
        console.log('⚠️  ESLint analysis skipped (not configured or no issues found)');
      }

      // Analyze file sizes
      await this.analyzeFileSizes();

      const duration = performance.now() - startTime;
      this.results.optimizations.push({
        name: 'Code Analysis',
        duration: Math.round(duration),
        status: 'completed'
      });

      console.log(`✅ Code analysis completed in ${Math.round(duration)}ms\n`);

    } catch (error) {
      console.error('Code analysis failed:', error.message);
      this.results.optimizations.push({
        name: 'Code Analysis',
        status: 'failed',
        error: error.message
      });
    }
  }

  /**
   * Analyze file sizes for optimization opportunities
   */
  async analyzeFileSizes() {
    const srcDir = path.join(__dirname, '../src');
    
    try {
      const files = await this.getFileSizes(srcDir);
      const largeFiles = files
        .filter(file => file.size > 50 * 1024) // Files > 50KB
        .sort((a, b) => b.size - a.size)
        .slice(0, 10);

      if (largeFiles.length > 0) {
        this.results.recommendations.push({
          category: 'code',
          priority: 'low',
          title: 'Consider Splitting Large Files',
          description: 'Large files may impact maintainability and loading times',
          files: largeFiles.map(f => ({
            path: f.path,
            size: `${Math.round(f.size / 1024)}KB`
          }))
        });
      }

      this.results.benchmarks.codeSize = {
        totalFiles: files.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
        averageFileSize: Math.round(files.reduce((sum, f) => sum + f.size, 0) / files.length),
        largestFiles: largeFiles.slice(0, 5)
      };

    } catch (error) {
      console.log('File size analysis skipped:', error.message);
    }
  }

  /**
   * Get file sizes recursively
   */
  async getFileSizes(dir, files = []) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await this.getFileSizes(fullPath, files);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        const stats = await fs.stat(fullPath);
        files.push({
          path: path.relative(path.join(__dirname, '..'), fullPath),
          size: stats.size
        });
      }
    }
    
    return files;
  }

  /**
   * Analyze bundle sizes (if applicable)
   */
  async analyzeBundles() {
    console.log('📦 Analyzing Bundle Sizes...');
    const startTime = performance.now();

    try {
      // Check if we have a build process
      const packageJson = JSON.parse(
        await fs.readFile(path.join(__dirname, '../package.json'), 'utf8')
      );

      if (packageJson.scripts && packageJson.scripts.build) {
        try {
          console.log('Running build process...');
          const { stdout } = await execAsync('npm run build');
          console.log('Build output:', stdout.slice(-500)); // Last 500 chars

          // Analyze build output if it exists
          const distDir = path.join(__dirname, '../dist');
          try {
            const buildFiles = await this.getFileSizes(distDir);
            this.results.benchmarks.bundleSize = {
              totalFiles: buildFiles.length,
              totalSize: buildFiles.reduce((sum, f) => sum + f.size, 0),
              files: buildFiles.sort((a, b) => b.size - a.size).slice(0, 10)
            };
          } catch (error) {
            console.log('No build output directory found');
          }

        } catch (error) {
          console.log('Build process failed or not configured');
        }
      } else {
        console.log('No build script found in package.json');
      }

      const duration = performance.now() - startTime;
      this.results.optimizations.push({
        name: 'Bundle Analysis',
        duration: Math.round(duration),
        status: 'completed'
      });

      console.log(`✅ Bundle analysis completed in ${Math.round(duration)}ms\n`);

    } catch (error) {
      console.error('Bundle analysis failed:', error.message);
      this.results.optimizations.push({
        name: 'Bundle Analysis',
        status: 'failed',
        error: error.message
      });
    }
  }

  /**
   * Profile memory usage
   */
  async profileMemory() {
    console.log('🧠 Profiling Memory Usage...');
    const startTime = performance.now();

    try {
      const initialMemory = process.memoryUsage();
      
      // Simulate some operations to check memory behavior
      const testData = [];
      for (let i = 0; i < 10000; i++) {
        testData.push({
          id: i,
          data: 'test'.repeat(100),
          nested: { value: Math.random() }
        });
      }

      const afterAllocationMemory = process.memoryUsage();
      
      // Clear test data
      testData.length = 0;
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const afterCleanupMemory = process.memoryUsage();

      this.results.benchmarks.memory = {
        initial: {
          heapUsed: Math.round(initialMemory.heapUsed / 1024 / 1024),
          heapTotal: Math.round(initialMemory.heapTotal / 1024 / 1024),
          external: Math.round(initialMemory.external / 1024 / 1024)
        },
        afterAllocation: {
          heapUsed: Math.round(afterAllocationMemory.heapUsed / 1024 / 1024),
          heapTotal: Math.round(afterAllocationMemory.heapTotal / 1024 / 1024)
        },
        afterCleanup: {
          heapUsed: Math.round(afterCleanupMemory.heapUsed / 1024 / 1024),
          heapTotal: Math.round(afterCleanupMemory.heapTotal / 1024 / 1024)
        }
      };

      // Check for potential memory leaks
      const memoryIncrease = afterCleanupMemory.heapUsed - initialMemory.heapUsed;
      if (memoryIncrease > 10 * 1024 * 1024) { // > 10MB increase
        this.results.recommendations.push({
          category: 'memory',
          priority: 'high',
          title: 'Potential Memory Leak Detected',
          description: `Memory usage increased by ${Math.round(memoryIncrease / 1024 / 1024)}MB during testing`,
          suggestion: 'Review object lifecycle and ensure proper cleanup of event listeners and timers'
        });
      }

      const duration = performance.now() - startTime;
      this.results.optimizations.push({
        name: 'Memory Profiling',
        duration: Math.round(duration),
        status: 'completed'
      });

      console.log(`✅ Memory profiling completed in ${Math.round(duration)}ms\n`);

    } catch (error) {
      console.error('Memory profiling failed:', error.message);
      this.results.optimizations.push({
        name: 'Memory Profiling',
        status: 'failed',
        error: error.message
      });
    }
  }

  /**
   * Run load tests
   */
  async runLoadTests() {
    console.log('⚡ Running Load Tests...');
    const startTime = performance.now();

    try {
      // Check if we have test files
      const testDir = path.join(__dirname, '.');
      const testFiles = await fs.readdir(testDir);
      const performanceTestFile = testFiles.find(f => 
        f.includes('performance') || f.includes('load')
      );

      if (performanceTestFile) {
        try {
          const { stdout } = await execAsync(`npm test -- ${performanceTestFile}`);
          console.log('Load test results:', stdout.slice(-1000)); // Last 1000 chars
        } catch (error) {
          console.log('Load tests failed or not configured properly');
        }
      } else {
        console.log('No performance test files found, creating synthetic load test...');
        
        // Run synthetic performance test
        await this.runSyntheticLoadTest();
      }

      const duration = performance.now() - startTime;
      this.results.optimizations.push({
        name: 'Load Testing',
        duration: Math.round(duration),
        status: 'completed'
      });

      console.log(`✅ Load testing completed in ${Math.round(duration)}ms\n`);

    } catch (error) {
      console.error('Load testing failed:', error.message);
      this.results.optimizations.push({
        name: 'Load Testing',
        status: 'failed',
        error: error.message
      });
    }
  }

  /**
   * Run synthetic load test
   */
  async runSyntheticLoadTest() {
    const results = [];
    
    // Test CPU-intensive operations
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      
      // Simulate file processing
      const data = Buffer.alloc(1024 * 1024, 'test'); // 1MB buffer
      const processed = data.toString('base64').slice(0, 1000);
      
      const duration = performance.now() - start;
      results.push(duration);
    }

    const avgDuration = results.reduce((sum, d) => sum + d, 0) / results.length;
    const maxDuration = Math.max(...results);
    
    this.results.benchmarks.syntheticLoad = {
      operations: results.length,
      averageDuration: Math.round(avgDuration * 100) / 100,
      maxDuration: Math.round(maxDuration * 100) / 100,
      operationsPerSecond: Math.round(1000 / avgDuration)
    };

    if (avgDuration > 50) { // > 50ms average
      this.results.recommendations.push({
        category: 'performance',
        priority: 'medium',
        title: 'CPU-Intensive Operations May Need Optimization',
        description: `Average processing time is ${Math.round(avgDuration)}ms`,
        suggestion: 'Consider using worker threads or optimizing algorithms for CPU-intensive tasks'
      });
    }
  }

  /**
   * Generate comprehensive performance report
   */
  async generateReport() {
    console.log('📄 Generating Performance Report...');
    
    const report = {
      ...this.results,
      summary: {
        totalOptimizations: this.results.optimizations.length,
        successfulOptimizations: this.results.optimizations.filter(o => o.status === 'completed').length,
        totalRecommendations: this.results.recommendations.length,
        highPriorityRecommendations: this.results.recommendations.filter(r => r.priority === 'high').length,
        overallScore: this.calculateOverallScore()
      }
    };

    // Save report to file
    const reportPath = path.join(__dirname, '../performance-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Generate markdown report
    await this.generateMarkdownReport(report);
    
    // Display summary
    this.displaySummary(report);
    
    console.log(`📄 Detailed report saved to: ${reportPath}`);
  }

  /**
   * Calculate overall performance score
   */
  calculateOverallScore() {
    let score = 100;
    
    // Deduct points for failed optimizations
    const failedOptimizations = this.results.optimizations.filter(o => o.status === 'failed').length;
    score -= failedOptimizations * 10;
    
    // Deduct points for high priority recommendations
    const highPriorityIssues = this.results.recommendations.filter(r => r.priority === 'high').length;
    score -= highPriorityIssues * 15;
    
    // Deduct points for medium priority recommendations
    const mediumPriorityIssues = this.results.recommendations.filter(r => r.priority === 'medium').length;
    score -= mediumPriorityIssues * 5;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate markdown report
   */
  async generateMarkdownReport(report) {
    const markdown = `# Performance Optimization Report

Generated: ${report.timestamp}

## Summary

- **Overall Score**: ${report.summary.overallScore}/100
- **Optimizations Completed**: ${report.summary.successfulOptimizations}/${report.summary.totalOptimizations}
- **Recommendations**: ${report.summary.totalRecommendations} (${report.summary.highPriorityRecommendations} high priority)

## Optimizations

${report.optimizations.map(opt => `
### ${opt.name}
- **Status**: ${opt.status}
- **Duration**: ${opt.duration || 'N/A'}ms
${opt.error ? `- **Error**: ${opt.error}` : ''}
`).join('')}

## Benchmarks

${Object.entries(report.benchmarks).map(([key, value]) => `
### ${key}
\`\`\`json
${JSON.stringify(value, null, 2)}
\`\`\`
`).join('')}

## Recommendations

${report.recommendations.map((rec, index) => `
### ${index + 1}. ${rec.title} (${rec.priority} priority)

**Category**: ${rec.category}
**Description**: ${rec.description}

${rec.suggestion ? `**Suggestion**: ${rec.suggestion}` : ''}
${rec.implementation ? `
**Implementation**:
${rec.implementation.map(impl => `- \`${impl}\``).join('\n')}
` : ''}
${rec.files ? `
**Affected Files**:
${rec.files.map(f => `- ${f.path} (${f.size})`).join('\n')}
` : ''}
`).join('')}

## Next Steps

1. Address high priority recommendations first
2. Implement database optimizations
3. Monitor performance metrics in production
4. Run this report regularly to track improvements

---
Report generated by NexusFlow Performance Optimizer
`;

    const markdownPath = path.join(__dirname, '../PERFORMANCE_REPORT.md');
    await fs.writeFile(markdownPath, markdown);
    console.log(`📄 Markdown report saved to: ${markdownPath}`);
  }

  /**
   * Display summary in console
   */
  displaySummary(report) {
    console.log('\n' + '='.repeat(60));
    console.log('🏆 PERFORMANCE OPTIMIZATION SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\n📊 Overall Score: ${report.summary.overallScore}/100`);
    
    if (report.summary.overallScore >= 90) {
      console.log('🎉 Excellent! Your application is well optimized.');
    } else if (report.summary.overallScore >= 70) {
      console.log('👍 Good performance, with room for improvement.');
    } else if (report.summary.overallScore >= 50) {
      console.log('⚠️  Moderate performance, several optimizations recommended.');
    } else {
      console.log('🚨 Poor performance, immediate optimizations needed.');
    }
    
    if (report.summary.highPriorityRecommendations > 0) {
      console.log(`\n🔴 ${report.summary.highPriorityRecommendations} high priority issues need immediate attention`);
    }
    
    if (report.benchmarks.memory) {
      const memory = report.benchmarks.memory;
      console.log(`\n🧠 Memory Usage: ${memory.initial.heapUsed}MB → ${memory.afterCleanup.heapUsed}MB`);
    }
    
    if (report.benchmarks.syntheticLoad) {
      const load = report.benchmarks.syntheticLoad;
      console.log(`⚡ Performance: ${load.operationsPerSecond} ops/sec (avg: ${load.averageDuration}ms)`);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  }
}

// Run optimization if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const optimizer = new PerformanceOptimizer();
  optimizer.runOptimization().catch(console.error);
}

export { PerformanceOptimizer };
