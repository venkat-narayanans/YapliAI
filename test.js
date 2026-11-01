#!/usr/bin/env node
/**
 * Yapli AI - Unified Workflow Test Runner
 * Usage:
 *   node test.js         (Tests all 6 workflows)
 *   node test.js <1-6>   (Tests a specific workflow, e.g. node test.js 1)
 */
require('./n8n.js');

const WORKFLOWS = [
  {
    num: 1,
    name: '1. WhatsApp AI Receptionist',
    id: 'YsCFPr3CQYHlffvQ',
    file: 'test_wf1.js',
    triggerUrl: 'http://localhost:5678/webhook/wf1-test-trigger',
    body: {
      messages: [{ from: process.env.TEST_PHONE_NUMBER || '15551234567', type: 'text', text: { body: 'What are your haircut prices and timings?' } }],
      contacts: [{ profile: { name: process.env.TEST_CONTACT_NAME || 'Sample Customer' } }]
    }
  },
  {
    num: 2,
    name: '2. Salon Lead Follow-up Engine',
    id: 'Z5cp2bh2oiSzQcCD',
    file: 'test_wf2.js',
    triggerUrl: 'http://localhost:5678/webhook/wf2-test-trigger',
    body: { trigger: 'test' }
  },
  {
    num: 3,
    name: '3. Appointment Reminders Engine',
    id: 'jNIyrxx3fa84z8p3',
    file: 'test_wf3.js',
    triggerUrl: 'http://localhost:5678/webhook/wf3-test-trigger',
    body: { trigger: 'test' }
  },
  {
    num: 4,
    name: '4. Invoice & Payment Chaser',
    id: '7LO7LMnl5Ta1KhCe',
    file: 'test_wf4.js',
    triggerUrl: 'http://localhost:5678/webhook/wf4-test-trigger',
    body: { trigger: 'test' }
  },
  {
    num: 5,
    name: '5. Customer Re-engagement Campaign',
    id: '0QMpI5NPzaQmelq1',
    file: 'test_wf5.js',
    triggerUrl: 'http://localhost:5678/webhook/wf5-test-trigger',
    body: { trigger: 'test' }
  },
  {
    num: 6,
    name: '6. Bonus – Daily Owner Report',
    id: 'C5YTaQLs0pygeQ8X',
    file: 'test_wf6.js',
    triggerUrl: 'http://localhost:5678/webhook/wf6-test-trigger',
    body: { trigger: 'test' }
  }
];

async function runTest(wf) {
  console.log(`\n======================================================`);
  console.log(`▶ Running Test for Workflow ${wf.num}: ${wf.name}`);
  console.log(`======================================================`);
  const start = Date.now();
  const res = await fetch(wf.triggerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(wf.body)
  });
  console.log(`Webhook Trigger HTTP: ${res.status}`);

  // Poll for completion
  let exec = null;
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1500));
    const rExec = await fetch(`http://localhost:5678/api/v1/executions?limit=5`, {
      headers: { 'X-N8N-API-KEY': process.env.N8N_API_KEY }
    });
    const jExec = await rExec.json();
    const match = (jExec.data || []).find(e => e.workflowId === wf.id);
    if (match && match.finished) {
      exec = match;
      break;
    }
  }

  if (!exec) {
    console.log(`⚠️ Execution timed out or still running.`);
    return { num: wf.num, name: wf.name, status: 'TIMEOUT', time: `${((Date.now() - start) / 1000).toFixed(1)}s` };
  }

  const dRes = await fetch(`http://localhost:5678/api/v1/executions/${exec.id}?includeData=true`, {
    headers: { 'X-N8N-API-KEY': process.env.N8N_API_KEY }
  });
  const dJson = await dRes.json();
  const runData = dJson.data?.resultData?.runData || {};

  console.log(`Execution ID: ${exec.id} | Status: ${exec.status.toUpperCase()}`);
  console.log('Nodes Executed:');
  for (const n of Object.keys(runData)) {
    console.log(`  ✓ ${n} (${runData[n][0]?.executionStatus || 'done'})`);
  }

  return {
    num: wf.num,
    name: wf.name,
    execId: exec.id,
    status: exec.status.toUpperCase(),
    nodes: Object.keys(runData).length,
    time: `${((Date.now() - start) / 1000).toFixed(1)}s`
  };
}

async function main() {
  const arg = process.argv[2];
  let targets = WORKFLOWS;
  if (arg) {
    const num = parseInt(arg, 10);
    targets = WORKFLOWS.filter(w => w.num === num);
    if (targets.length === 0) {
      console.error(`Invalid workflow number: ${arg}. Valid options are 1 to 6.`);
      process.exit(1);
    }
  }

  const summary = [];
  for (const t of targets) {
    const res = await runTest(t);
    summary.push(res);
  }

  console.log(`\n======================================================`);
  console.log(`                  SUMMARY RESULTS                     `);
  console.log(`======================================================\n`);
  console.table(summary);
}

main().catch(console.error);

