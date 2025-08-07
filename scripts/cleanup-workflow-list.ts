import { cleanupOldWorkflowList, listWorkflows } from '../src/lib/workflows';

async function main() {
  console.log('Starting workflow list cleanup...');

  try {
    // First, get current list for verification
    console.log('\nFetching current workflow list...');
    const beforeList = await listWorkflows();
    console.log(`Current list has ${beforeList.length} workflows`);

    // Remove old list
    await cleanupOldWorkflowList();

    // Verify new list generation
    console.log('\nVerifying new list generation...');
    const afterList = await listWorkflows();
    console.log(`New list has ${afterList.length} workflows`);

    // Compare results
    console.log('\nResults comparison:');
    console.log('Before cleanup:', beforeList.length, 'workflows');
    console.log('After cleanup:', afterList.length, 'workflows');
    console.log('Workflow IDs preserved:', afterList.every(w => beforeList.some(b => b.id === w.id)));

    console.log('\n✅ Cleanup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  }
}

main(); 