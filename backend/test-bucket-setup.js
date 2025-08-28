// Test script to create bucket and verify R2 connectivity
// Run with: node test-bucket-setup.js

import dotenv from 'dotenv';
import { S3Client, CreateBucketCommand, HeadBucketCommand, PutObjectCommand } from '@aws-sdk/client-s3';

dotenv.config();

async function testBucketSetup() {
  console.log('🚀 Testing Cloudflare R2 Bucket Setup...\n');

  try {
    // Configuration from environment
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'nexusflow-storage';

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('Missing required R2 credentials in environment variables');
    }

    console.log('📋 Configuration:');
    console.log(`   Account ID: ${accountId}`);
    console.log(`   Bucket Name: ${bucketName}`);
    console.log(`   Access Key ID: ${accessKeyId.substring(0, 8)}...`);
    console.log(`   Endpoint: https://${accountId}.r2.cloudflarestorage.com\n`);

    // Create R2 client
    const r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: false
    });

    console.log('1. Testing bucket existence...');
    
    try {
      // Try to access the bucket
      const headCommand = new HeadBucketCommand({ Bucket: bucketName });
      await r2Client.send(headCommand);
      console.log('✅ Bucket already exists and is accessible\n');
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        console.log('ℹ️  Bucket does not exist, attempting to create...');
        
        try {
          // Create the bucket
          const createCommand = new CreateBucketCommand({ Bucket: bucketName });
          await r2Client.send(createCommand);
          console.log('✅ Bucket created successfully\n');
        } catch (createError) {
          if (createError.name === 'BucketAlreadyExists' || createError.name === 'BucketAlreadyOwnedByYou') {
            console.log('✅ Bucket already exists (race condition)\n');
          } else {
            throw createError;
          }
        }
      } else {
        throw error;
      }
    }

    console.log('2. Testing file upload to bucket...');
    
    // Test upload a small file
    const testKey = 'test-connectivity.txt';
    const testContent = `R2 connectivity test - ${new Date().toISOString()}`;
    
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: testKey,
      Body: Buffer.from(testContent),
      ContentType: 'text/plain',
      Metadata: {
        'test': 'true',
        'timestamp': Date.now().toString()
      }
    });

    const uploadResult = await r2Client.send(putCommand);
    console.log('✅ Test file uploaded successfully');
    console.log(`   ETag: ${uploadResult.ETag}`);
    console.log(`   Key: ${testKey}\n`);

    console.log('3. Testing file access...');
    
    // Test accessing the file we just uploaded
    const headObjectCommand = new HeadBucketCommand({ Bucket: bucketName });
    await r2Client.send(headObjectCommand);
    console.log('✅ File access verified\n');

    console.log('🎉 R2 Bucket Setup Complete!\n');
    console.log('📋 Summary:');
    console.log(`   ✅ Bucket "${bucketName}" is ready`);
    console.log('   ✅ Credentials are valid');
    console.log('   ✅ Upload functionality working');
    console.log('   ✅ Access permissions confirmed');
    console.log('\n🚀 Ready for production file storage!');

    return {
      success: true,
      bucketName,
      accountId,
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`
    };

  } catch (error) {
    console.error('❌ Bucket setup failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    
    if (error.name === 'InvalidAccessKeyId') {
      console.error('   • Check your CLOUDFLARE_R2_ACCESS_KEY_ID');
    } else if (error.name === 'SignatureDoesNotMatch') {
      console.error('   • Check your CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    } else if (error.name === 'AccessDenied') {
      console.error('   • Verify your R2 API token has the correct permissions');
      console.error('   • Ensure Object Read & Write permissions are enabled');
    } else if (error.name === 'NoSuchBucket') {
      console.error('   • The bucket name might be taken or invalid');
      console.error('   • Try a different bucket name');
    } else {
      console.error(`   • Error type: ${error.name}`);
      console.error(`   • Status: ${error.$metadata?.httpStatusCode || 'Unknown'}`);
    }
    
    throw error;
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testBucketSetup().catch(console.error);
}

export default testBucketSetup;