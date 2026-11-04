#!/usr/bin/env node
/**
 * Yapli AI - Interactive Client Onboarding CLI
 *
 * Walks you through onboarding a new business client with interactive prompts.
 * Auto-creates the client config, registers in the client registry,
 * and optionally deploys all 6 workflows to n8n.
 *
 * Usage:
 *   node onboard.js              (Interactive mode)
 *   node onboard.js --dry-run    (Validate only, don't deploy to n8n)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CLIENTS_DIR = path.resolve(__dirname, 'clients');
const REGISTRY_PATH = path.join(CLIENTS_DIR, 'registry.json');
const SHEET_TEMPLATE_URL = 'https://docs.google.com/spreadsheets/d/YOUR_MASTER_TEMPLATE_ID/copy';

// Ensure clients directory exists
if (!fs.existsSync(CLIENTS_DIR)) fs.mkdirSync(CLIENTS_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 40);
}

function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    fs.writeFileSync(REGISTRY_PATH, '[]', 'utf8');
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveRegistry(registry) {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf8');
}

function ask(rl, question, defaultVal) {
  const suffix = defaultVal ? ` (${defaultVal})` : '';
  return new Promise(resolve => {
    rl.question(`  ${question}${suffix}: `, answer => {
      const val = answer.trim();
      resolve(val || defaultVal || '');
    });
  });
}

function askChoice(rl, question, choices) {
  return new Promise(resolve => {
    console.log(`\n  ${question}`);
    choices.forEach((c, i) => console.log(`    ${i + 1}. ${c}`));
    rl.question(`  Enter number [1-${choices.length}]: `, answer => {
      const idx = parseInt(answer.trim(), 10) - 1;
      resolve(choices[idx] || choices[0]);
    });
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║              YAPLI AI — NEW CLIENT ONBOARDING               ║');
  console.log('║         Answer 5 questions to deploy a new client           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // --- Step 1: Business Info ---
  console.log('  ─── Step 1 of 5: Business Details ───');
  const businessName = await ask(rl, '📍 Business Name');
  if (!businessName) {
    console.error('\n  ✗ Business name is required. Aborting.\n');
    rl.close();
    process.exit(1);
  }

  const businessType = await askChoice(rl, '🏢 Business Type:', [
    'Hair & Beauty Salon',
    'Medical Clinic / Hospital',
    'Dental Clinic',
    'Gym & Fitness Studio',
    'Real Estate Agency',
    'Coaching / Tutoring Centre',
    'Auto Repair / Service Centre',
    'Restaurant / Café',
    'Consulting / Professional Services',
    'Other'
  ]);

  let customType = '';
  if (businessType === 'Other') {
    customType = await ask(rl, '  Specify the business type');
  }
  const finalBusinessType = businessType === 'Other' ? (customType || 'General Business') : businessType;

  const city = await ask(rl, '🌆 City', 'Chennai');

  // --- Step 2: WhatsApp ---
  console.log('\n  ─── Step 2 of 5: WhatsApp Setup ───');
  console.log('  (Get these from developers.facebook.com → WhatsApp → API Setup)');
  const whatsappPhoneId = await ask(rl, '📱 WhatsApp Phone Number ID');
  if (!whatsappPhoneId) {
    console.error('\n  ✗ WhatsApp Phone Number ID is required. Aborting.\n');
    rl.close();
    process.exit(1);
  }

  // --- Step 3: Owner Contact ---
  console.log('\n  ─── Step 3 of 5: Owner Contact ───');
  const ownerWhatsAppNumber = await ask(rl, '📞 Owner\'s WhatsApp Number (e.g. 15551234567)');
  if (!ownerWhatsAppNumber) {
    console.error('\n  ✗ Owner WhatsApp number is required. Aborting.\n');
    rl.close();
    process.exit(1);
  }

  // --- Step 4: Google Sheet ---
  console.log('\n  ─── Step 4 of 5: Google Sheet CRM ───');
  console.log(`  💡 Tip: Duplicate the master template and paste the Sheet ID here.`);
  console.log(`     Template: ${SHEET_TEMPLATE_URL}`);
  const sheetId = await ask(rl, '📊 Google Sheet ID');
  if (!sheetId) {
    console.error('\n  ✗ Google Sheet ID is required. Aborting.\n');
    rl.close();
    process.exit(1);
  }

  // --- Step 5: Optionals ---
  console.log('\n  ─── Step 5 of 5: Optional Integrations ───');
  const telegramChatId = await ask(rl, '🔔 Telegram Chat ID for owner alerts (optional, press Enter to skip)', '');
  const calendarId = await ask(rl, '📅 Google Calendar ID', 'primary');

  // --- Step 6: Pricing Tier ---
  const tier = await askChoice(rl, '💰 Pricing Tier:', [
    'Tier 1: AI Receptionist ($49/mo)',
    'Tier 2: Growth Engine ($99/mo)',
    'Tier 3: Full AI Employee ($149/mo)',
    '7-Day Free Trial'
  ]);

  rl.close();

  // --- Build Config ---
  const clientId = slugify(businessName);
  const config = {
    clientId,
    businessName,
    businessType: finalBusinessType,
    city,
    sheetId,
    whatsappPhoneId,
    ownerWhatsAppNumber,
    telegramChatId,
    calendarId,
    geminiModel: 'models/gemini-3.8-flash'
  };

  // --- Write client config file ---
  const configPath = path.join(CLIENTS_DIR, `${clientId}.json`);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  console.log(`\n  ✓ Client config saved: ${configPath}`);

  // --- Register in registry ---
  const registry = loadRegistry();
  const existingIdx = registry.findIndex(c => c.clientId === clientId);
  const registryEntry = {
    clientId,
    businessName,
    businessType: finalBusinessType,
    city,
    sheetId,
    whatsappPhoneId,
    ownerWhatsAppNumber,
    tier: tier.replace(/^Tier \d: /, '').replace(/ \(.*\)$/, ''),
    status: tier.includes('Free Trial') ? 'trial' : 'active',
    deployedAt: new Date().toISOString(),
    workflowIds: []
  };

  if (existingIdx >= 0) {
    registry[existingIdx] = { ...registry[existingIdx], ...registryEntry };
    console.log(`  ✓ Updated existing registry entry for "${clientId}"`);
  } else {
    registry.push(registryEntry);
    console.log(`  ✓ Added to client registry (${registry.length} total clients)`);
  }

  // --- Deploy to n8n ---
  console.log('');
  if (isDryRun) {
    console.log('  ── DRY RUN: Validating without deploying ──');
  } else {
    console.log('  ── Deploying 6 workflows to n8n ──');
  }

  let result = { success: false, workflowIds: [] };
  try {
    const { provisionClient } = require('./provision_client.js');
    result = await provisionClient(config, { dryRun: isDryRun });
  } catch (deployErr) {
    console.error(`\n  ⚠ Deployment error: ${deployErr.message}`);
    console.log('  Client config was saved. You can deploy later with:');
    console.log(`  node provision_client.js ${configPath}\n`);
  }

  // Save workflow IDs to registry
  if (result.workflowIds && result.workflowIds.length > 0) {
    registryEntry.workflowIds = result.workflowIds;
  }
  if (existingIdx >= 0) {
    registry[existingIdx] = registryEntry;
  } else {
    registry[registry.length - 1] = registryEntry;
  }
  saveRegistry(registry);

  // --- Print Summary ---
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                  ONBOARDING COMPLETE ✓                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Business:      ${businessName}`);
  console.log(`  Client ID:     ${clientId}`);
  console.log(`  Type:          ${finalBusinessType}`);
  console.log(`  City:          ${city}`);
  console.log(`  Tier:          ${tier}`);
  console.log(`  Status:        ${registryEntry.status.toUpperCase()}`);
  console.log(`  Config File:   ${configPath}`);
  console.log(`  Sheet ID:      ${sheetId}`);
  console.log(`  Workflows:     ${result.workflowIds.length} deployed`);
  console.log('');
  console.log('  ─── Next Steps ───');
  console.log('');
  console.log('  1. GOOGLE SHEET: Share the client\'s Google Sheet with them');
  console.log(`     https://docs.google.com/spreadsheets/d/${sheetId}`);
  console.log('     → They fill in Business Info tab (FAQs, prices, hours)');
  console.log('     → They fill in AI Settings tab (tone, language, greeting)');
  console.log('');
  console.log('  2. META WEBHOOK: In developers.facebook.com:');
  console.log(`     Callback URL: https://YOUR_DOMAIN/webhook/${clientId}-wf1-trigger`);
  console.log('     Verify Token: yapli_webhook_secret');
  console.log('     Subscribe to: messages');
  console.log('');
  console.log('  3. TEST: Send a WhatsApp message to the business number');
  console.log('     and verify the AI responds within 5 seconds.');
  console.log('');
  console.log('  4. MANAGE: Run "node clients.js list" to see all clients');
  console.log('');
}

main().catch(err => {
  console.error('Onboarding failed:', err);
  process.exit(1);
});

