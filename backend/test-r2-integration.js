// Quick test script to verify R2 integration
// Run with: node test-r2-integration.js

import dotenv from 'dotenv';
import s3Config from './src/config/s3.js';
import r2StorageService from './src/services/r2Storage.js';

dotenv.config();

async function testR2Integration() {
  console.log('🚀 Testing Cloudflare R2 Integration...\n');

  try {
    // Test 1: Initialize configuration
    console.log('1. Initializing R2 configuration...');
    const config = s3Config.getConfig();
    console.log('✅ Configuration loaded');
    console.log(`   Bucket: ${config.bucket}`);
    console.log(`   Region: ${config.region}`);
    console.log(`   Endpoint: ${config.endpoint}\n`);

    // Test 2: Initialize R2 service
    console.log('2. Initializing R2 storage service...');
    await r2StorageService.initialize();
    console.log('✅ R2 service initialized\n');

    // Test 3: Validate connection
    console.log('3. Validating R2 connection...');
    await s3Config.validateConnection();
    console.log('✅ R2 connection validated\n');

    // Test 4: Test file operations (create a small test file)
    console.log('4. Testing file operations...');
    const testContent = Buffer.from('Hello from NexusFlow R2 Integration Test!');
    const testKey = 'test/integration-test.txt';

    // Upload test file
    console.log('   Uploading test file...');
    const uploadResult = await r2StorageService.uploadFile(testContent, testKey, {
      contentType: 'text/plain',
      metadata: {
        test: 'true',
        timestamp: new Date().toISOString()
      }
    });
    console.log('✅ Test file uploaded');
    console.log(`   Key: ${uploadResult.key}`);
    console.log(`   Size: ${uploadResult.size} bytes`);
    console.log(`   ETag: ${uploadResult.etag}\n`);

    // Get file metadata
    console.log('   Getting file metadata...');
    const metadata = await r2StorageService.getFileMetadata(testKey);
    console.log('✅ File metadata retrieved');
    console.log(`   Size: ${metadata.size} bytes`);
    console.log(`   Content-Type: ${metadata.contentType}\n`);

    // Generate presigned URL
    console.log('   Generating presigned URL...');
    const presignedUrl = await r2StorageService.generatePresignedUrl(testKey, 'getObject', 300);
    console.log('✅ Presigned URL generated');
    console.log(`   URL: ${presignedUrl.url.substring(0, 100)}...`);
    console.log(`   Expires: ${presignedUrl.expiresAt}\n`);

    // Download test file
    console.log('   Downloading test file...');
    const downloadResult = await r2StorageService.downloadFile(testKey);
    console.log('✅ Test file downloaded');
    console.log(`   Content: ${downloadResult.buffer.toString()}\n`);

    // Clean up test file
    console.log('   Cleaning up test file...');
    await r2StorageService.deleteFile(testKey);
    console.log('✅ Test file deleted\n');

    console.log('🎉 All tests passed! R2 integration is working correctly.\n');
    console.log('📋 Summary:');
    console.log('   ✅ Configuration loaded');
    console.log('   ✅ Service initialized');
    console.log('   ✅ Connection validated');
    console.log('   ✅ Upload working');
    console.log('   ✅ Metadata retrieval working');
    console.log('   ✅ Presigned URLs working');
    console.log('   ✅ Download working');
    console.log('   ✅ Delete working');
    console.log('\n🚀 Your application is ready for production file storage with Cloudflare R2!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check your .env file has correct R2 credentials');
    console.error('   2. Verify your Cloudflare account ID and bucket name');
    console.error('   3. Ensure your R2 API token has proper permissions');
    console.error('   4. Check that your bucket exists and is accessible');
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testR2Integration().catch(console.error);
}

export default testR2Integration;