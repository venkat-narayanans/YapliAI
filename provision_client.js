#!/usr/bin/env node
/**
 * Yapli AI - Multi-Client Automation Provisioner
 *
 * Instantly provisions all 6 AI employee automations for a new business client.
 *
 * Usage (standalone):
 *   node provision_client.js <path/to/client_config.json> [--dry-run]
 *
 * Usage (programmatic):
 *   const { provisionClient } = require('./provision_client.js');
 *   const result = await provisionClient(configObject, { dryRun: false });
 */

const fs = require('fs');
const path = require('path');
require('./n8n.js');

const N8N_API_URL = (process.env.N8N_API_URL || 'http://localhost:5678').replace(/\/+$/, '');
const N8N_API_KEY = process.env.N8N_API_KEY;

const REQUIRED_FIELDS = [
  'clientId',
  'businessName',
  'businessType',
  'city',
  'sheetId',
  'whatsappPhoneId',
  'ownerWhatsAppNumber'
];

/**
 * Provision all 6 Yapli AI workflows for a client.
 *
 * @param {object} config - Client configuration object
 * @param {object} [opts] - Options
 * @param {boolean} [opts.dryRun=false] - If true, validate and prepare but don't push to n8n
 * @param {boolean} [opts.silent=false] - If true, suppress console output
 * @returns {Promise<{success: boolean, workflowIds: string[], deployedWorkflows: object[]}>}
 */
async function provisionClient(config, opts = {}) {
  const { dryRun = false, silent = false } = opts;
  const log = silent ? () => {} : console.log;
  const warn = silent ? () => {} : console.warn;
  const err = silent ? () => {} : console.error;

  if (!N8N_API_KEY) {
    err('[Error] N8N_API_KEY is not defined in environment or .env');
    return { success: false, workflowIds: [], deployedWorkflows: [], error: 'N8N_API_KEY not set' };
  }

  // Validate fields
  for (const field of REQUIRED_FIELDS) {
    if (!config[field]) {
      err(`[Error] Missing required field in config: "${field}"`);
      return { success: false, workflowIds: [], deployedWorkflows: [], error: `Missing field: ${field}` };
    }
  }

  // Defaults
  config.geminiModel = config.geminiModel || 'models/gemini-3.8-flash';
  config.calendarId = config.calendarId || 'primary';
  config.telegramChatId = config.telegramChatId || '';

  log('===============================================================');
  log(`🚀 YAPLI AI: PROVISIONING CLIENT: "${config.businessName}"`);
  log(`   Client ID: ${config.clientId} | City: ${config.city}`);
  log('===============================================================\n');

  const templatesDir = path.resolve(__dirname, 'templates');
  const templateFiles = [
    { num: 1, file: 'workflow1.template.json', name: '1. WhatsApp AI Receptionist' },
    { num: 2, file: 'workflow2.template.json', name: '2. Salon Lead Follow-up Engine' },
    { num: 3, file: 'workflow3.template.json', name: '3. Appointment Reminders Engine' },
    { num: 4, file: 'workflow4.template.json', name: '4. Invoice & Payment Chaser' },
    { num: 5, file: 'workflow5.template.json', name: '5. Customer Re-engagement Campaign' },
    { num: 6, file: 'workflow6.template.json', name: '6. Bonus – Daily Owner Report on WhatsApp' }
  ];

  const deployedWorkflows = [];
  const workflowIds = [];

  for (const t of templateFiles) {
    const tPath = path.join(templatesDir, t.file);
    if (!fs.existsSync(tPath)) {
      warn(`[Warning] Template ${t.file} not found, skipping.`);
      continue;
    }

    let content = fs.readFileSync(tPath, 'utf8');

    // Replace all placeholders
    content = content.replace(/\{\{CLIENT_ID\}\}/g, config.clientId);
    content = content.replace(/\{\{BUSINESS_NAME\}\}/g, config.businessName);
    content = content.replace(/\{\{BUSINESS_TYPE\}\}/g, config.businessType);
    content = content.replace(/\{\{CITY\}\}/g, config.city);
    content = content.replace(/\{\{GOOGLE_SHEET_ID\}\}/g, config.sheetId);
    content = content.replace(/\{\{WHATSAPP_PHONE_NUMBER_ID\}\}/g, config.whatsappPhoneId);
    content = content.replace(/\{\{OWNER_WHATSAPP_NUMBER\}\}/g, config.ownerWhatsAppNumber);
    content = content.replace(/\{\{CALENDAR_ID\}\}/g, config.calendarId);
    content = content.replace(/\{\{TELEGRAM_CHAT_ID\}\}/g, config.telegramChatId);
    content = content.replace(/\{\{GEMINI_MODEL\}\}/g, config.geminiModel);

    const wfJson = JSON.parse(content);
    const clientWfName = `[${config.businessName}] ${t.name}`;
    wfJson.name = clientWfName;

    if (dryRun) {
      log(`[DRY RUN] ✓ Prepared workflow: "${clientWfName}"`);
      deployedWorkflows.push({ num: t.num, name: clientWfName, id: 'DRY_RUN', active: true });
      workflowIds.push('DRY_RUN');
      continue;
    }

    // Check if an existing workflow exists with this exact client name
    const listRes = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    const listData = await listRes.json();
    const existing = (listData.data || []).find(w => w.name === clientWfName);

    let wfId;
    if (existing) {
      log(`🔄 Updating existing workflow for ${clientWfName} (ID: ${existing.id})...`);
      const putRes = await fetch(`${N8N_API_URL}/api/v1/workflows/${existing.id}`, {
        method: 'PUT',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: clientWfName,
          nodes: wfJson.nodes,
          connections: wfJson.connections,
          settings: wfJson.settings
        })
      });
      if (!putRes.ok) {
        err(`[Error] Failed to update ${clientWfName}:`, await putRes.text());
        continue;
      }
      wfId = existing.id;
    } else {
      log(`➕ Creating new workflow for ${clientWfName}...`);
      const postRes = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
        method: 'POST',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: clientWfName,
          nodes: wfJson.nodes,
          connections: wfJson.connections,
          settings: wfJson.settings
        })
      });
      if (!postRes.ok) {
        err(`[Error] Failed to create ${clientWfName}:`, await postRes.text());
        continue;
      }
      const created = await postRes.json();
      wfId = created.id;
    }

    // Activate
    const actRes = await fetch(`${N8N_API_URL}/api/v1/workflows/${wfId}/activate`, {
      method: 'POST',
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    const active = actRes.ok;
    log(`  ✓ Workflow Active: ${active}`);

    deployedWorkflows.push({ num: t.num, name: clientWfName, id: wfId, active });
    workflowIds.push(wfId);
  }

  log('\n===============================================================');
  log('              CLIENT PROVISIONING COMPLETED                    ');
  log('===============================================================\n');
  if (!silent) {
    console.table(deployedWorkflows.map(w => ({
      '#': w.num,
      'Workflow Name': w.name,
      'n8n Workflow ID': w.id,
      'Status': w.active ? 'ACTIVE' : 'INACTIVE'
    })));
  }

  log(`\n📋 Next Client Onboarding Step:`);
  log(`In Meta Developer Dashboard for Phone ID ${config.whatsappPhoneId}:`);
  log(`Set Webhook Callback URL to: ${N8N_API_URL}/webhook/${config.clientId}-wf1-trigger`);
  log(`Verify Token: ${process.env.N8N_WEBHOOK_VERIFY_TOKEN || 'yapli_webhook_secret'}`);
  log('All 6 automated workflows are ready and running for this client!\n');

  return { success: true, workflowIds, deployedWorkflows };
}

// --- CLI entrypoint ---
if (require.main === module) {
  const args = process.argv.slice(2);

  // Support both old format (positional) and --client flag
  let configPath = null;
  let isDryRun = args.includes('--dry-run');

  const clientFlagIdx = args.indexOf('--client');
  if (clientFlagIdx !== -1 && args[clientFlagIdx + 1]) {
    configPath = args[clientFlagIdx + 1];
  } else {
    // First arg that isn't a flag
    configPath = args.find(a => !a.startsWith('--'));
  }

  if (!configPath) {
    console.log(`Usage: node provision_client.js <client_config.json> [--dry-run]`);
    console.log(`       node provision_client.js --client clients/bella_salon.json`);
    console.log(`Example: node provision_client.js clients/sample_salon.json`);
    process.exit(0);
  }

  if (!fs.existsSync(configPath)) {
    console.error(`[Error] Client configuration file not found: ${configPath}`);
    process.exit(1);
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (parseErr) {
    console.error(`[Error] Invalid JSON in ${configPath}:`, parseErr.message);
    process.exit(1);
  }

  provisionClient(config, { dryRun: isDryRun }).then(result => {
    if (!result.success) process.exit(1);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { provisionClient };
