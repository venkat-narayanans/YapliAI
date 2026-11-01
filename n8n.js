/**
 * n8n Automation Client & CLI for YapliAI
 */
const fs = require('fs');
const path = require('path');

// Auto-load .env if present
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const N8N_API_URL = (process.env.N8N_API_URL || 'http://localhost:5678').replace(/\/+$/, '');
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_API_KEY) {
  console.warn('[n8n] Warning: N8N_API_KEY is not defined in environment or .env');
}

async function request(endpoint, options = {}) {
  const url = `${N8N_API_URL}/api/v1${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const headers = {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch (err) {
    throw new Error(`[n8n] Non-JSON response (HTTP ${response.status}): ${text}`);
  }

  if (!response.ok) {
    const msg = json.message || JSON.stringify(json);
    throw new Error(`[n8n] Request failed (HTTP ${response.status}): ${msg}`);
  }

  return json;
}

const n8n = {
  // Workflows
  async listWorkflows() {
    const res = await request('/workflows');
    return res.data || res;
  },

  async getWorkflow(id) {
    return await request(`/workflows/${id}`);
  },

  async createWorkflow(workflow) {
    return await request('/workflows', {
      method: 'POST',
      body: JSON.stringify(workflow)
    });
  },

  async updateWorkflow(id, workflow) {
    return await request(`/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(workflow)
    });
  },

  async deleteWorkflow(id) {
    return await request(`/workflows/${id}`, {
      method: 'DELETE'
    });
  },

  async activateWorkflow(id) {
    return await request(`/workflows/${id}/activate`, {
      method: 'POST'
    });
  },

  async deactivateWorkflow(id) {
    return await request(`/workflows/${id}/deactivate`, {
      method: 'POST'
    });
  },

  // Executions
  async listExecutions(includeData = false) {
    const res = await request(`/executions?includeData=${includeData}`);
    return res.data || res;
  },

  async getExecution(id) {
    return await request(`/executions/${id}`);
  },

  // Tags & Credentials
  async listTags() {
    const res = await request('/tags');
    return res.data || res;
  },

  async listCredentials() {
    const res = await request('/credentials');
    return res.data || res;
  }
};

module.exports = n8n;

// CLI usage support
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'list';

  (async () => {
    try {
      if (command === 'list') {
        const workflows = await n8n.listWorkflows();
        console.log(`Found ${workflows.length} workflow(s):`);
        console.table(workflows.map(w => ({ id: w.id, name: w.name, active: w.active })));
      } else if (command === 'get') {
        const id = args[1];
        if (!id) throw new Error('Usage: node n8n.js get <workflowId>');
        const wf = await n8n.getWorkflow(id);
        console.log(JSON.stringify(wf, null, 2));
      } else if (command === 'create') {
        const file = args[1];
        if (!file) throw new Error('Usage: node n8n.js create <workflow.json>');
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        const created = await n8n.createWorkflow(data);
        console.log('Successfully created workflow:');
        console.log(JSON.stringify(created, null, 2));
      } else if (command === 'activate') {
        const id = args[1];
        if (!id) throw new Error('Usage: node n8n.js activate <workflowId>');
        const res = await n8n.activateWorkflow(id);
        console.log(`Workflow ${id} activated:`, res);
      } else if (command === 'deactivate') {
        const id = args[1];
        if (!id) throw new Error('Usage: node n8n.js deactivate <workflowId>');
        const res = await n8n.deactivateWorkflow(id);
        console.log(`Workflow ${id} deactivated:`, res);
      } else if (command === 'delete') {
        const id = args[1];
        if (!id) throw new Error('Usage: node n8n.js delete <workflowId>');
        await n8n.deleteWorkflow(id);
        console.log(`Workflow ${id} deleted successfully.`);
      } else {
        console.log(`Unknown command: ${command}`);
        console.log('Available commands: list, get <id>, create <file.json>, activate <id>, deactivate <id>, delete <id>');
      }
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  })();
}

