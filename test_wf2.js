const fs = require('fs');
require('./n8n.js');

async function testWf2() {
  console.log('--- Triggering Workflow 2: Salon Lead Follow-up Engine ---');
  const triggerRes = await fetch('http://localhost:5678/webhook/wf2-test-trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trigger: 'manual' })
  });
  console.log('Status:', triggerRes.status);
  const text = await triggerRes.text();
  console.log('Response body:', text);

  // Check latest execution
  const execRes = await fetch('http://localhost:5678/api/v1/executions?limit=1', {
    headers: { 'X-N8N-API-KEY': process.env.N8N_API_KEY }
  });
  const execData = await execRes.json();
  const latest = execData.data[0];
  console.log('Latest Execution:', latest);

  // Fetch execution details
  const detailRes = await fetch(`http://localhost:5678/api/v1/executions/${latest.id}?includeData=true`, {
    headers: { 'X-N8N-API-KEY': process.env.N8N_API_KEY }
  });
  const detail = await detailRes.json();
  const runData = detail.data.resultData.runData;
  console.log('\nExecuted Nodes:');
  for (const nodeName of Object.keys(runData)) {
    const runs = runData[nodeName];
    const status = runs[0].executionStatus || 'success';
    const err = runs[0].error ? JSON.stringify(runs[0].error.message) : '';
    console.log(` - ${nodeName}: ${status} ${err}`);
  }

  if (runData['Gemini Draft Follow-up']) {
    console.log('\nGemini Generated Text:');
    console.log(JSON.stringify(runData['Gemini Draft Follow-up'][0].data.main[0][0].json, null, 2));
  }
  if (runData['Send WhatsApp Follow-up']) {
    console.log('\nWhatsApp Send Output:');
    console.log(JSON.stringify(runData['Send WhatsApp Follow-up'][0].data.main[0][0].json, null, 2));
  }
}

testWf2().catch(console.error);

