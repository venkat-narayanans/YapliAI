# YapliAI - Agent Instructions & Project Context

## n8n Automation Environment

- **n8n Instance**: Running locally at `http://localhost:5678`
- **Authentication**: API key configured in `.env` (`N8N_API_KEY`) and MCP config
- **Global MCP Server**: Configured under `n8n` in `~/.gemini/config/mcp_config.json` via `n8n-mcp`
- **CLI & Client Module**: `n8n.js` provides programmatic and CLI access:
  - `node n8n.js list`
  - `node n8n.js get <workflowId>`
  - `node n8n.js create <workflow.json>`
  - `node n8n.js activate <workflowId>`
  - `node n8n.js deactivate <workflowId>`
  - `node n8n.js delete <workflowId>`

## Workflow Construction Best Practices
- Every workflow payload must contain `name`, `nodes` array, `connections` object, and `settings` (e.g. `{ "executionOrder": "v1" }`).
- In `connections`, note that `connections[SourceNodeName].main` is an array of arrays (one array per output index, containing objects `{ "node": "TargetNodeName", "type": "main", "index": 0 }`).

