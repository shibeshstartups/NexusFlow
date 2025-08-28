// Simple R2 connectivity test
import { S3Client, CreateBucketCommand, HeadBucketCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testR2Connection() {
  console.log('🚀 Testing Cloudflare R2 Connection...\n');

  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  console.log('Configuration:');
  console.log(`Account ID: ${accountId}`);
  console.log(`Bucket Name: ${bucketName}`);
  console.log(`Access Key: ${accessKeyId?.substring(0, 8)}...`);
  console.log(`Endpoint: https://${accountId}.r2.cloudflarestorage.com\n`);

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    console.error('❌ Missing required environment variables');
    return;
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  try {
    console.log('1. Testing bucket access...');
    
    try {
      const headCommand = new HeadBucketCommand({ Bucket: bucketName });
      await client.send(headCommand);
      console.log('✅ Bucket exists and is accessible');
    } catch (error) {
      if (error.name === 'NotFound') {
        console.log('⚠️  Bucket not found, creating...');
        const createCommand = new CreateBucketCommand({ Bucket: bucketName });
        await client.send(createCommand);
        console.log('✅ Bucket created successfully');
      } else {
        throw error;
      }
    }

    console.log('\n2. Testing file upload...');
    const testKey = `test-${Date.now()}.txt`;
    const testContent = 'Hello from R2!';
    
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain'
    });

    const result = await client.send(putCommand);
    console.log('✅ File uploaded successfully');
    console.log(`ETag: ${result.ETag}`);

    console.log('\n🎉 R2 Connection Test PASSED!');
    console.log('Your R2 credentials are working correctly.');

  } catch (error) {
    console.error('\n❌ R2 Connection Test FAILED');
    console.error('Error:', error.message);
    
    if (error.name === 'InvalidAccessKeyId') {
      console.error('💡 Check your access key ID');
    } else if (error.name === 'SignatureDoesNotMatch') {
      console.error('💡 Check your secret access key');
    } else if (error.name === 'AccessDenied') {
      console.error('💡 Check your R2 permissions');
    }
  }
}

testR2Connection();