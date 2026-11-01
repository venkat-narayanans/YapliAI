const fs = require('fs');
require('./n8n.js');

async function testWf1Webhook() {
  console.log('--- Triggering Workflow 1 via Manual Webhook Trigger ---');

  const payload = {
    messages: [
      {
        from: process.env.TEST_PHONE_NUMBER || '15551234567',
        id: 'wamid.' + Date.now(),
        timestamp: Math.floor(Date.now() / 1000).toString(),
        type: 'text',
        text: { body: 'Hi, what are your haircut prices and timings? Can I book an appointment?' }
      }
    ],
    contacts: [
      { profile: { name: process.env.TEST_CONTACT_NAME || 'Sample Customer' } }
    ]
  };

  const res = await fetch('http://localhost:5678/webhook/wf1-test-trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  console.log('Webhook Response Status:', res.status);
  const text = await res.text();
  console.log('Webhook Response Body:', text);

  // Fetch execution
  const execRes = await fetch('http://localhost:5678/api/v1/executions?limit=1', {
    headers: { 'X-N8N-API-KEY': process.env.N8N_API_KEY }
  });
  const execData = await execRes.json();
  const latest = execData.data[0];
  console.log('Execution ID:', latest.id, 'Workflow:', latest.workflowId, 'Status:', latest.status, 'Finished:', latest.finished);

  const detailRes = await fetch(`http://localhost:5678/api/v1/executions/${latest.id}?includeData=true`, {
    headers: { 'X-N8N-API-KEY': process.env.N8N_API_KEY }
  });
  const detail = await detailRes.json();
  const runData = detail.data.resultData.runData;

  console.log('\nNode execution summary:');
  for (const n of Object.keys(runData)) {
    console.log(` - ${n}: ${runData[n][0].executionStatus}`);
  }

  if (runData['AI Receptionist']) {
    console.log('\nAI Receptionist Output:');
    console.log(runData['AI Receptionist'][0].data.main[0][0].json.output);
  }

  if (runData['Send WhatsApp Reply']) {
    console.log('\nWhatsApp Reply Result:');
    console.log(JSON.stringify(runData['Send WhatsApp Reply'][0].data.main[0][0].json, null, 2));
  }

  if (runData['Business Info']) {
    console.log('\nBusiness Info Tool Call:');
    console.log(JSON.stringify(runData['Business Info'][0].data, null, 2).slice(0, 300));
  }

  if (runData['Save Lead']) {
    console.log('\nSave Lead Tool Call:');
    console.log(JSON.stringify(runData['Save Lead'][0].data, null, 2));
  }
}

testWf1Webhook().catch(console.error);
