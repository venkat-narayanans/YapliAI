const fs = require('fs');
require('./n8n.js');

async function testWf6() {
  console.log('--- Triggering Workflow 6: Bonus – Daily Owner Report ---');
  const triggerRes = await fetch('http://localhost:5678/webhook/wf6-test-trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trigger: 'manual' })
  });
  console.log('Status:', triggerRes.status);
  const text = await triggerRes.text();
  console.log('Response body:', text);

  await new Promise(r => setTimeout(r, 4000));

  const execRes = await fetch('http://localhost:5678/api/v1/executions?limit=1', {
    headers: { 'X-N8N-API-KEY': process.env.N8N_API_KEY }
  });
  const execData = await execRes.json();
  const latest = execData.data[0];
  console.log('Execution ID:', latest.id, 'Workflow:', latest.workflowId, 'Status:', latest.status);

  const detailRes = await fetch(`http://localhost:5678/api/v1/executions/${latest.id}?includeData=true`, {
    headers: { 'X-N8N-API-KEY': process.env.N8N_API_KEY }
  });
  const detail = await detailRes.json();
  const runData = detail.data.resultData.runData;

  console.log('\nNode execution summary:');
  for (const n of Object.keys(runData)) {
    console.log(` - ${n}: ${runData[n][0].executionStatus}`);
  }

  if (runData['Build Report']) {
    console.log('\nGenerated Daily Owner Report:');
    console.log(runData['Build Report'][0].data.main[0][0].json.text);
  }

  const sendNode = Object.keys(runData).find(k => k.includes('Send Report'));
  if (sendNode && runData[sendNode]) {
    console.log('\nWhatsApp Delivery:');
    console.log(JSON.stringify(runData[sendNode][0].data.main[0][0].json, null, 2));
  }
}

testWf6().catch(console.error);

