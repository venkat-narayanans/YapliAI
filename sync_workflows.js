#!/usr/bin/env node
/**
 * Yapli AI - Automated Workflow Synchronizer & Continuous Deployment Engine
 *
 * Keeps all deployed client workflows in sync with local templates.
 * Whenever you modify a workflow template, this synchronizer updates the live
 * n8n workflows automatically without changing their IDs or webhook URLs.
 *
 * Usage:
 *   node sync_workflows.js                  Sync all registered clients
 *   node sync_workflows.js <clientId>       Sync a specific client
 *   node sync_workflows.js --watch          Auto-sync on template file changes
 *   node sync_workflows.js --dry-run        Preview updates without sending to n8n
 */

const fs = require('fs');
const path = require('path');
const { provisionClient } = require('./provision_client.js');
require('./n8n.js');

const REGISTRY_FILE = path.resolve(__dirname, 'clients', 'registry.json');
const TEMPLATES_DIR = path.resolve(__dirname, 'templates');

function loadRegistry() {
  if (!fs.existsSync(REGISTRY_FILE)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
  } catch (err) {
    console.error('Failed to parse clients/registry.json:', err.message);
    return [];
  }
}

async function syncClient(clientConfig, opts = {}) {
  const { dryRun = false } = opts;
  console.log(`\n===============================================================`);
  console.log(`🔄 SYNCING WORKFLOWS FOR: "${clientConfig.businessName}" (${clientConfig.clientId})`);
  console.log(`===============================================================`);

  try {
    const result = await provisionClient(clientConfig, { dryRun });
    if (result.success) {
      console.log(`✅ Client "${clientConfig.businessName}" workflows are synchronized and active!`);
    } else {
      console.warn(`⚠️ Client "${clientConfig.businessName}" sync warning:`, result.error);
    }
    return result;
  } catch (err) {
    console.error(`❌ Sync failed for "${clientConfig.businessName}":`, err.message);
    return { success: false, error: err.message };
  }
}

async function syncAll(targetClientId = null, opts = {}) {
  const registry = loadRegistry();
  if (registry.length === 0) {
    console.log('No clients found in registry.');
    return;
  }

  let clientsToSync = registry;
  if (targetClientId) {
    clientsToSync = registry.filter(c => c.clientId === targetClientId);
    if (clientsToSync.length === 0) {
      console.error(`Client ID "${targetClientId}" not found in registry.`);
      return;
    }
  }

  console.log(`\n🚀 Starting synchronization for ${clientsToSync.length} client(s)...`);
  for (const client of clientsToSync) {
    await syncClient(client, opts);
  }
  console.log(`\n✨ All client workflows synchronized successfully!`);
}

function startWatchMode(opts = {}) {
  console.log('\n===============================================================');
  console.log('👀 YAPLI AI WORKFLOW WATCHER ACTIVE');
  console.log(`   Watching directory: ${TEMPLATES_DIR}`);
  console.log('   Any changes made to templates will auto-update live n8n workflows!');
  console.log('===============================================================\n');

  let debounceTimer = null;
  fs.watch(TEMPLATES_DIR, (eventType, filename) => {
    if (!filename || !filename.endsWith('.json')) return;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      console.log(`\n📝 Detected change in template: ${filename}`);
      console.log('⚡ Propagating updates to all active client workflows...');
      await syncAll(null, opts);
      console.log('\n👀 Resuming watch mode for changes...\n');
    }, 800);
  });
}

// CLI Execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const isWatch = args.includes('--watch');
  const isDryRun = args.includes('--dry-run');
  const targetClientId = args.find(a => !a.startsWith('--'));

  if (isWatch) {
    startWatchMode({ dryRun: isDryRun });
  } else {
    syncAll(targetClientId, { dryRun: isDryRun });
  }
}

module.exports = { syncAll, syncClient, startWatchMode };
