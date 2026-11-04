#!/usr/bin/env node
/**
 * Yapli AI - Client Management CLI
 *
 * Manage all your onboarded business clients from one place.
 *
 * Usage:
 *   node clients.js list                    Show all registered clients
 *   node clients.js info <clientId>         Show detailed info for one client
 *   node clients.js activate <clientId>     Activate all workflows for a client
 *   node clients.js deactivate <clientId>   Pause all workflows for a client
 *   node clients.js remove <clientId>       Deactivate + mark as churned
 *   node clients.js stats                   Show aggregate business stats
 */

const fs = require('fs');
const path = require('path');
require('./n8n.js');

const CLIENTS_DIR = path.resolve(__dirname, 'clients');
const REGISTRY_PATH = path.join(CLIENTS_DIR, 'registry.json');
const N8N_API_URL = (process.env.N8N_API_URL || 'http://localhost:5678').replace(/\/+$/, '');
const N8N_API_KEY = process.env.N8N_API_KEY;

// ---------------------------------------------------------------------------
// Registry helpers
// ---------------------------------------------------------------------------

function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveRegistry(registry) {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf8');
}

function findClient(registry, clientId) {
  return registry.find(c => c.clientId === clientId);
}

// ---------------------------------------------------------------------------
// n8n workflow helpers
// ---------------------------------------------------------------------------

async function setWorkflowsActive(workflowIds, active) {
  if (!N8N_API_KEY) {
    console.error('[Error] N8N_API_KEY is not set. Cannot manage workflows.');
    return false;
  }

  const action = active ? 'activate' : 'deactivate';
  let allOk = true;

  for (const wfId of workflowIds) {
    if (!wfId || wfId === 'DRY_RUN') continue;
    try {
      const res = await fetch(`${N8N_API_URL}/api/v1/workflows/${wfId}/${action}`, {
        method: 'POST',
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
      if (res.ok) {
        console.log(`  ✓ Workflow ${wfId}: ${active ? 'ACTIVATED' : 'DEACTIVATED'}`);
      } else {
        console.error(`  ✗ Workflow ${wfId}: Failed (HTTP ${res.status})`);
        allOk = false;
      }
    } catch (err) {
      console.error(`  ✗ Workflow ${wfId}: ${err.message}`);
      allOk = false;
    }
  }
  return allOk;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function cmdList() {
  const registry = loadRegistry();

  if (registry.length === 0) {
    console.log('\n  No clients registered yet.');
    console.log('  Run "node onboard.js" to onboard your first client.\n');
    return;
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                        YAPLI AI — CLIENT REGISTRY                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  const STATUS_COLORS = {
    active: '\x1b[32m● ACTIVE\x1b[0m',
    trial: '\x1b[33m◐ TRIAL\x1b[0m',
    paused: '\x1b[90m○ PAUSED\x1b[0m',
    churned: '\x1b[31m✗ CHURNED\x1b[0m'
  };

  console.table(registry.map((c, i) => ({
    '#': i + 1,
    'Client ID': c.clientId,
    'Business': c.businessName,
    'Type': (c.businessType || '').substring(0, 25),
    'City': c.city,
    'Tier': c.tier || '-',
    'Status': c.status || 'unknown',
    'Workflows': (c.workflowIds || []).length,
    'Deployed': c.deployedAt ? new Date(c.deployedAt).toLocaleDateString() : '-'
  })));

  // Summary
  const active = registry.filter(c => c.status === 'active').length;
  const trial = registry.filter(c => c.status === 'trial').length;
  const paused = registry.filter(c => c.status === 'paused').length;
  const churned = registry.filter(c => c.status === 'churned').length;

  console.log(`  Total: ${registry.length} clients | Active: ${active} | Trial: ${trial} | Paused: ${paused} | Churned: ${churned}`);
  console.log('');
}

function cmdInfo(clientId) {
  const registry = loadRegistry();
  const client = findClient(registry, clientId);

  if (!client) {
    console.error(`\n  ✗ Client "${clientId}" not found in registry.`);
    console.log('  Run "node clients.js list" to see all clients.\n');
    return;
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  CLIENT: ${client.businessName.padEnd(49)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Client ID:          ${client.clientId}`);
  console.log(`  Business Name:      ${client.businessName}`);
  console.log(`  Business Type:      ${client.businessType}`);
  console.log(`  City:               ${client.city}`);
  console.log(`  Tier:               ${client.tier || '-'}`);
  console.log(`  Status:             ${(client.status || 'unknown').toUpperCase()}`);
  console.log(`  Deployed At:        ${client.deployedAt || '-'}`);
  console.log('');
  console.log('  ─── Integrations ───');
  console.log(`  WhatsApp Phone ID:  ${client.whatsappPhoneId || '-'}`);
  console.log(`  Owner WhatsApp:     ${client.ownerWhatsAppNumber || '-'}`);
  console.log(`  Google Sheet:       https://docs.google.com/spreadsheets/d/${client.sheetId || 'NOT_SET'}`);
  console.log(`  Telegram Chat ID:   ${client.telegramChatId || '(not set)'}`);
  console.log('');
  console.log('  ─── Workflow IDs ───');
  if (client.workflowIds && client.workflowIds.length > 0) {
    client.workflowIds.forEach((id, i) => {
      console.log(`    WF ${i + 1}: ${id}`);
    });
  } else {
    console.log('    (no workflows deployed yet)');
  }
  console.log('');
  console.log('  ─── Config File ───');
  const configFile = path.join(CLIENTS_DIR, `${client.clientId}.json`);
  console.log(`  ${fs.existsSync(configFile) ? configFile : '(not found)'}`);
  console.log('');

  // Quick actions
  console.log('  ─── Quick Actions ───');
  if (client.status === 'active' || client.status === 'trial') {
    console.log(`  Pause:    node clients.js deactivate ${client.clientId}`);
  }
  if (client.status === 'paused') {
    console.log(`  Resume:   node clients.js activate ${client.clientId}`);
  }
  console.log(`  Remove:   node clients.js remove ${client.clientId}`);
  console.log('');
}

async function cmdActivate(clientId) {
  const registry = loadRegistry();
  const client = findClient(registry, clientId);

  if (!client) {
    console.error(`\n  ✗ Client "${clientId}" not found.\n`);
    return;
  }

  if (!client.workflowIds || client.workflowIds.length === 0) {
    console.log(`\n  ⚠ No workflow IDs stored for "${clientId}".`);
    console.log('  Deploy first: node provision_client.js clients/' + clientId + '.json\n');
    return;
  }

  console.log(`\n  Activating all workflows for "${client.businessName}"...\n`);
  const ok = await setWorkflowsActive(client.workflowIds, true);

  if (ok) {
    client.status = 'active';
    saveRegistry(registry);
    console.log(`\n  ✓ "${client.businessName}" is now ACTIVE.\n`);
  }
}

async function cmdDeactivate(clientId) {
  const registry = loadRegistry();
  const client = findClient(registry, clientId);

  if (!client) {
    console.error(`\n  ✗ Client "${clientId}" not found.\n`);
    return;
  }

  if (!client.workflowIds || client.workflowIds.length === 0) {
    console.log(`\n  ⚠ No workflow IDs stored for "${clientId}". Nothing to deactivate.\n`);
    client.status = 'paused';
    saveRegistry(registry);
    return;
  }

  console.log(`\n  Deactivating all workflows for "${client.businessName}"...\n`);
  const ok = await setWorkflowsActive(client.workflowIds, false);

  client.status = 'paused';
  saveRegistry(registry);
  console.log(`\n  ✓ "${client.businessName}" is now PAUSED.\n`);
}

async function cmdRemove(clientId) {
  const registry = loadRegistry();
  const client = findClient(registry, clientId);

  if (!client) {
    console.error(`\n  ✗ Client "${clientId}" not found.\n`);
    return;
  }

  console.log(`\n  Removing "${client.businessName}" (deactivating workflows)...\n`);

  if (client.workflowIds && client.workflowIds.length > 0) {
    await setWorkflowsActive(client.workflowIds, false);
  }

  client.status = 'churned';
  client.removedAt = new Date().toISOString();
  saveRegistry(registry);
  console.log(`\n  ✓ "${client.businessName}" marked as CHURNED. Workflows deactivated.`);
  console.log('  The client config and registry entry are preserved for records.\n');
}

function cmdStats() {
  const registry = loadRegistry();

  if (registry.length === 0) {
    console.log('\n  No clients registered yet.\n');
    return;
  }

  const active = registry.filter(c => c.status === 'active');
  const trial = registry.filter(c => c.status === 'trial');
  const paused = registry.filter(c => c.status === 'paused');
  const churned = registry.filter(c => c.status === 'churned');

  // Revenue estimates
  const TIER_PRICES = {
    'AI Receptionist': 49,
    'Growth Engine': 99,
    'Full AI Employee': 149,
    '7-Day Free Trial': 0
  };

  let monthlyRevenue = 0;
  for (const c of active) {
    monthlyRevenue += TIER_PRICES[c.tier] || 0;
  }
  let trialPipeline = 0;
  for (const c of trial) {
    trialPipeline += TIER_PRICES[c.tier] || 0;
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                  YAPLI AI — BUSINESS STATS                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Total Clients:       ${registry.length}`);
  console.log(`  Active:              ${active.length}`);
  console.log(`  Trial:               ${trial.length}`);
  console.log(`  Paused:              ${paused.length}`);
  console.log(`  Churned:             ${churned.length}`);
  console.log('');
  console.log(`  Est. Monthly Revenue:  $${monthlyRevenue}/mo`);
  console.log(`  Est. Annual Revenue:   $${monthlyRevenue * 12}/yr`);
  if (trialPipeline > 0) {
    console.log(`  Trial Pipeline Value:  +$${trialPipeline}/mo (${trial.length} clients in trial)`);
  }
  console.log('');

  // By type breakdown
  const byType = {};
  for (const c of registry) {
    const t = c.businessType || 'Unknown';
    byType[t] = (byType[t] || 0) + 1;
  }
  console.log('  ─── Clients by Industry ───');
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${type}: ${count}`);
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// CLI Router
// ---------------------------------------------------------------------------

const [,, command, ...rest] = process.argv;

const USAGE = `
  Yapli AI — Client Management CLI

  Usage:
    node clients.js list                    Show all registered clients
    node clients.js info <clientId>         Show detailed info for one client
    node clients.js activate <clientId>     Activate all workflows for a client
    node clients.js deactivate <clientId>   Pause all workflows for a client
    node clients.js remove <clientId>       Deactivate + mark as churned
    node clients.js stats                   Show aggregate business stats
`;

switch (command) {
  case 'list':
  case 'ls':
    cmdList();
    break;
  case 'info':
  case 'show':
    if (!rest[0]) { console.error('  Usage: node clients.js info <clientId>'); break; }
    cmdInfo(rest[0]);
    break;
  case 'activate':
  case 'resume':
    if (!rest[0]) { console.error('  Usage: node clients.js activate <clientId>'); break; }
    cmdActivate(rest[0]).catch(console.error);
    break;
  case 'deactivate':
  case 'pause':
    if (!rest[0]) { console.error('  Usage: node clients.js deactivate <clientId>'); break; }
    cmdDeactivate(rest[0]).catch(console.error);
    break;
  case 'remove':
  case 'churn':
    if (!rest[0]) { console.error('  Usage: node clients.js remove <clientId>'); break; }
    cmdRemove(rest[0]).catch(console.error);
    break;
  case 'stats':
  case 'dashboard':
    cmdStats();
    break;
  default:
    console.log(USAGE);
}

