import { jest } from '@jest/globals';

// Global test environment setup
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/nexusflow-test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.R2_ACCESS_KEY_ID = 'test-access-key';
process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.R2_BUCKET_NAME = 'test-bucket';
process.env.R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods in tests to reduce noise
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test helpers
global.testHelpers = {
  // Mock user factory
  createMockUser: (overrides = {}) => ({
    _id: '507f1f77bcf86cd799439011',
    username: 'testuser',
    email: 'test@example.com',
    storageQuota: 1024 * 1024 * 1024, // 1GB
    storageUsed: 0,
    ...overrides
  }),

  // Mock project factory
  createMockProject: (overrides = {}) => ({
    _id: '507f1f77bcf86cd799439012',
    name: 'Test Project',
    owner: '507f1f77bcf86cd799439011',
    description: 'Test project',
    ...overrides
  }),

  // Mock folder factory
  createMockFolder: (overrides = {}) => ({
    _id: '507f1f77bcf86cd799439013',
    name: 'Test Folder',
    owner: '507f1f77bcf86cd799439011',
    project: '507f1f77bcf86cd799439012',
    fullPath: 'Test Folder',
    level: 0,
    ...overrides
  }),

  // Mock file factory
  createMockFile: (overrides = {}) => ({
    _id: '507f1f77bcf86cd799439014',
    filename: 'test.txt',
    originalName: 'test.txt',
    owner: '507f1f77bcf86cd799439011',
    project: '507f1f77bcf86cd799439012',
    size: 1024,
    storage: {
      key: 'test/test.txt',
      bucket: 'test-bucket',
      url: 'https://test.r2.cloudflarestorage.com/test/test.txt'
    },
    createdAt: new Date(),
    ...overrides
  }),

  // Generate large file list for testing
  createLargeFileList: (count = 100, sizeKB = 1024) => {
    return Array.from({ length: count }, (_, i) => ({
      _id: `507f1f77bcf86cd79943${i.toString().padStart(4, '0')}`,
      filename: `file${i}.txt`,
      originalName: `file${i}.txt`,
      owner: '507f1f77bcf86cd799439011',
      project: '507f1f77bcf86cd799439012',
      size: sizeKB * 1024,
      storage: {
        key: `test/file${i}.txt`,
        bucket: 'test-bucket'
      },
      createdAt: new Date()
    }));
  },

  // Mock stream factory
  createMockStream: (data = 'test content') => {
    const { Readable } = require('stream');
    const stream = new Readable();
    stream.push(data);
    stream.push(null);
    
    // Add mock methods for testing
    stream.pipe = jest.fn().mockReturnValue(stream);
    stream.on = jest.fn().mockImplementation((event, callback) => {
      if (event === 'end') {
        setTimeout(callback, 10);
      }
      return stream;
    });
    
    return stream;
  },

  // Wait for async operations
  waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock performance timing
  mockPerformanceTiming: (duration = 1000) => {
    const mockTiming = {
      startTime: performance.now(),
      endTime: performance.now() + duration,
      duration
    };
    return mockTiming;
  }
};

// Global mocks for external services
jest.mock('../src/services/r2Storage.js', () => ({
  __esModule: true,
  default: {
    uploadFile: jest.fn().mockResolvedValue({
      location: 'https://test.r2.cloudflarestorage.com/test/file.txt',
      etag: 'mock-etag',
      key: 'test/file.txt'
    }),
    downloadFile: jest.fn().mockResolvedValue({
      buffer: Buffer.from('test content'),
      contentType: 'text/plain'
    }),
    downloadFileStream: jest.fn().mockResolvedValue(
      global.testHelpers.createMockStream()
    ),
    deleteFile: jest.fn().mockResolvedValue({ success: true }),
    getFileMetadata: jest.fn().mockResolvedValue({
      size: 1024,
      contentType: 'text/plain'
    }),
    generatePresignedUrl: jest.fn().mockResolvedValue({
      url: 'https://test.r2.cloudflarestorage.com/signed-url',
      expiresAt: new Date(Date.now() + 3600000)
    })
  }
}));

jest.mock('../src/services/redisService.js', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    flushall: jest.fn(),
    disconnect: jest.fn()
  }
}));

jest.mock('../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock mongoose models
jest.mock('../src/models/User.js', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    deleteMany: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn()
  }
}));

jest.mock('../src/models/Project.js', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    deleteMany: jest.fn()
  }
}));

jest.mock('../src/models/Folder.js', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    insertMany: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    updateOne: jest.fn(),
    deleteMany: jest.fn()
  }
}));

jest.mock('../src/models/File.js', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    insertMany: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    updateOne: jest.fn(),
    deleteMany: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn()
  }
}));

// Performance measurement helpers
global.measurePerformance = {
  start: () => performance.now(),
  end: (startTime) => performance.now() - startTime,
  expectWithinThreshold: (duration, threshold, operation = 'operation') => {
    expect(duration).toBeLessThan(threshold);
    if (duration > threshold * 0.8) {
      console.warn(`${operation} took ${duration}ms, approaching threshold of ${threshold}ms`);
    }
  }
};

// Memory usage tracking for performance tests
global.trackMemoryUsage = () => {
  const usage = process.memoryUsage();
  return {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    external: Math.round(usage.external / 1024 / 1024),
    rss: Math.round(usage.rss / 1024 / 1024)
  };
};

// Custom matchers for testing
expect.extend({
  toBeWithinPercentage(received, expected, percentage) {
    const tolerance = expected * (percentage / 100);
    const pass = Math.abs(received - expected) <= tolerance;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be within ${percentage}% of ${expected}`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be within ${percentage}% of ${expected}`,
        pass: false
      };
    }
  },

  toHaveValidIntegrityScore(received) {
    const score = received.results?.integrityScore;
    const pass = typeof score === 'number' && score >= 0 && score <= 100;
    
    if (pass) {
      return {
        message: () => `expected integrity score ${score} to be invalid`,
        pass: true
      };
    } else {
      return {
        message: () => `expected integrity score to be between 0 and 100, but got ${score}`,
        pass: false
      };
    }
  }
});

// Test database cleanup
beforeEach(async () => {
  // Reset all mocks before each test
  jest.clearAllMocks();
});

afterAll(async () => {
  // Cleanup and close connections
  if (global.console !== originalConsole) {
    global.console = originalConsole;
  }
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in tests, but log the error
});

export default {};