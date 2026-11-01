const fs = require('fs');
require('./n8n.js');

async function testWf5() {
  console.log('--- Triggering Workflow 5: Customer Re-engagement Campaign ---');
  const triggerRes = await fetch('http://localhost:5678/webhook/wf5-test-trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trigger: 'test' })
  });
  console.log('Status:', triggerRes.status);
  const text = await triggerRes.text();
  console.log('Response body:', text);

  const execRes = await fetch('http://localhost:5678/api/v1/executions?limit=1', {
    headers: { 'X-N8N-API-KEY': process.env.N8N_API_KEY }
  });
  const execData = await execRes.json();
  const latest = execData.data[0];
  console.log('Execution ID:', latest.id, 'Status:', latest.status);

  const detailRes = await fetch(`http://localhost:5678/api/v1/executions/${latest.id}?includeData=true`, {
    headers: { 'X-N8N-API-KEY': process.env.N8N_API_KEY }
  });
  const detail = await detailRes.json();
  const runData = detail.data.resultData.runData;
  console.log('\nNode execution summary:');
  for (const n of Object.keys(runData)) {
    console.log(` - ${n}: ${runData[n][0].executionStatus}`);
  }

  if (runData['Gemini Draft Re-engagement']) {
    console.log('\nGemini Re-engagement text:');
    console.log(runData['Gemini Draft Re-engagement'][0].data.main[0][0].json.text);
  }
  if (runData['Send Re-engagement WhatsApp']) {
    console.log('\nWhatsApp Re-engagement result:');
    console.log(JSON.stringify(runData['Send Re-engagement WhatsApp'][0].data.main[0][0].json, null, 2));
  }
  if (runData['Update Customer Campaign Date']) {
    console.log('\nSheet Update result:');
    console.log(JSON.stringify(runData['Update Customer Campaign Date'][0].data.main[0][0].json, null, 2));
  }
}

testWf5().catch(console.error);

