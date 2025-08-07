import { config } from 'dotenv';
import { join } from 'path';
import { testKVConnection } from '../src/lib/workflows';

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') });

function validateEnv() {
  const required = ['KV_REST_API_URL', 'KV_REST_API_TOKEN'];
  const missing = required.filter(key => !process.env[key]);
  
  console.log('Environment Variables (.env.local):');
  console.log('KV_REST_API_URL:', process.env.KV_REST_API_URL ? '✓ Set' : '✗ Missing');
  console.log('KV_REST_API_TOKEN:', process.env.KV_REST_API_TOKEN ? '✓ Set' : '✗ Missing');
  
  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:', missing.join(', '));
    console.log('\nPlease ensure you have a .env.local file in the project root with these variables:');
    console.log(`
KV_REST_API_URL="https://your-url.upstash.io"
KV_REST_API_TOKEN="your-token"
    `);
    return false;
  }
  
  return true;
}

async function main() {
  console.log('Validating environment...\n');
  
  if (!validateEnv()) {
    process.exit(1);
  }

  console.log('\nTesting KV connection...');
  
  try {
    const result = await testKVConnection();
    if (result.success) {
      console.log('\n✅ KV connection test passed!');
      process.exit(0);
    } else {
      console.error('\n❌ KV connection test failed:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ KV connection test failed with error:', error);
    process.exit(1);
  }
}

main(); 