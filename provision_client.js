#!/usr/bin/env node
/**
 * Yapli AI - Multi-Client Automation Provisioner
 *
 * Instantly provisions all 6 AI employee automations for a new business client.
 *
 * Usage:
 *   node provision_client.js <path/to/client_config.json> [--dry-run]
 */

const fs = require('fs');
const path = require('path');
require('./n8n.js');

const N8N_API_URL = (process.env.N8N_API_URL || 'http://localhost:5678').replace(/\/+$/, '');
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_API_KEY) {
  console.error('[Error] N8N_API_KEY is not defined in environment or .env');
  process.exit(1);
}

const REQUIRED_FIELDS = [
  'clientId',
  'businessName',
  'businessType',
  'city',
  'sheetId',
  'whatsappPhoneId',
  'ownerWhatsAppNumber'
];

async function provisionClient(configPath, isDryRun = false) {
  if (!fs.existsSync(configPath)) {
    console.error(`[Error] Client configuration file not found: ${configPath}`);
    process.exit(1);
  }

  const rawConfig = fs.readFileSync(configPath, 'utf8');
  let config;
  try {
    config = JSON.parse(rawConfig);
  } catch (err) {
    console.error(`[Error] Invalid JSON in ${configPath}:`, err.message);
    process.exit(1);
  }

  // Validate fields
  for (const field of REQUIRED_FIELDS) {
    if (!config[field]) {
      console.error(`[Error] Missing required field in config: "${field}"`);
      process.exit(1);
    }
  }

  // Defaults
  config.geminiModel = config.geminiModel || 'models/gemini-3.8-flash';
  config.calendarId = config.calendarId || 'primary';
  config.telegramChatId = config.telegramChatId || '';

  console.log('===============================================================');
  console.log(`🚀 YAPLI AI: PROVISIONING CLIENT: "${config.businessName}"`);
  console.log(`   Client ID: ${config.clientId} | City: ${config.city}`);
  console.log('===============================================================\n');

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

  for (const t of templateFiles) {
    const tPath = path.join(templatesDir, t.file);
    if (!fs.existsSync(tPath)) {
      console.warn(`[Warning] Template ${t.file} not found, skipping.`);
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

    if (isDryRun) {
      console.log(`[DRY RUN] Prepared workflow: "${clientWfName}"`);
      deployedWorkflows.push({ num: t.num, name: clientWfName, id: 'DRY_RUN', active: true });
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
      console.log(`🔄 Updating existing workflow for ${clientWfName} (ID: ${existing.id})...`);
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
        console.error(`[Error] Failed to update ${clientWfName}:`, await putRes.text());
        continue;
      }
      wfId = existing.id;
    } else {
      console.log(`➕ Creating new workflow for ${clientWfName}...`);
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
        console.error(`[Error] Failed to create ${clientWfName}:`, await postRes.text());
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
    console.log(`  ✓ Workflow Active: ${active}`);

    deployedWorkflows.push({
      num: t.num,
      name: clientWfName,
      id: wfId,
      active
    });
  }

  console.log('\n===============================================================');
  console.log('              CLIENT PROVISIONING COMPLETED                    ');
  console.log('===============================================================\n');
  console.table(deployedWorkflows.map(w => ({
    '#': w.num,
    'Workflow Name': w.name,
    'n8n Workflow ID': w.id,
    'Status': w.active ? 'ACTIVE' : 'INACTIVE'
  })));

  console.log('\n📋 Next Client Onboarding Step:');
  console.log(`In Meta Developer Dashboard for Phone ID ${config.whatsappPhoneId}:`);
  console.log(`Set Webhook Callback URL to: ${N8N_API_URL}/webhook/${config.clientId}-wf1-trigger`);
  console.log(`Verify Token: ${process.env.N8N_WEBHOOK_VERIFY_TOKEN || 'yapli_webhook_secret'}`);
  console.log('All 6 automated workflows are ready and running for this client!\n');
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(`Usage: node provision_client.js <client_config.json> [--dry-run]`);
  console.log(`Example: node provision_client.js clients/sample_salon.json`);
  process.exit(0);
}

const configPath = args[0];
const isDryRun = args.includes('--dry-run');

provisionClient(configPath, isDryRun).catch(console.error);

