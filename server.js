const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const WEB_DIR = path.join(__dirname, 'web');
const REGISTRY_PATH = path.join(__dirname, 'clients', 'registry.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ---------------------------------------------------------------------------
// Registry helpers
// ---------------------------------------------------------------------------

function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveRegistry(registry) {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// Parse request body
// ---------------------------------------------------------------------------

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function jsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// API Router
// ---------------------------------------------------------------------------

async function handleApi(req, res, pathname) {
  // GET /api/health
  if (pathname === '/api/health' && req.method === 'GET') {
    return jsonResponse(res, 200, {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  }

  // GET /api/clients
  if (pathname === '/api/clients' && req.method === 'GET') {
    const registry = loadRegistry();
    return jsonResponse(res, 200, {
      total: registry.length,
      active: registry.filter(c => c.status === 'active').length,
      trial: registry.filter(c => c.status === 'trial').length,
      clients: registry
    });
  }

  // GET /api/clients/:id
  const clientMatch = pathname.match(/^\/api\/clients\/([a-z0-9_]+)$/);
  if (clientMatch && req.method === 'GET') {
    const registry = loadRegistry();
    const client = registry.find(c => c.clientId === clientMatch[1]);
    if (!client) return jsonResponse(res, 404, { error: 'Client not found' });
    return jsonResponse(res, 200, client);
  }

  // POST /api/clients  (create new client config + register)
  if (pathname === '/api/clients' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const required = ['businessName', 'businessType', 'city', 'sheetId', 'whatsappPhoneId', 'ownerWhatsAppNumber'];
      for (const field of required) {
        if (!body[field]) return jsonResponse(res, 400, { error: `Missing required field: ${field}` });
      }

      const clientId = body.clientId || body.businessName
        .toLowerCase()
        .replace(/['']/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 40);

      const config = {
        clientId,
        businessName: body.businessName,
        businessType: body.businessType,
        city: body.city,
        sheetId: body.sheetId,
        whatsappPhoneId: body.whatsappPhoneId,
        ownerWhatsAppNumber: body.ownerWhatsAppNumber,
        telegramChatId: body.telegramChatId || '',
        calendarId: body.calendarId || 'primary',
        geminiModel: body.geminiModel || 'models/gemini-3.8-flash'
      };

      // Save config file
      const configPath = path.join(__dirname, 'clients', `${clientId}.json`);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

      // Register
      const registry = loadRegistry();
      const existingIdx = registry.findIndex(c => c.clientId === clientId);
      const entry = {
        clientId,
        businessName: body.businessName,
        businessType: body.businessType,
        city: body.city,
        sheetId: body.sheetId,
        whatsappPhoneId: body.whatsappPhoneId,
        ownerWhatsAppNumber: body.ownerWhatsAppNumber,
        tier: body.tier || 'Full AI Employee',
        status: body.status || 'active',
        deployedAt: new Date().toISOString(),
        workflowIds: []
      };

      if (existingIdx >= 0) {
        registry[existingIdx] = { ...registry[existingIdx], ...entry };
      } else {
        registry.push(entry);
      }
      saveRegistry(registry);

      return jsonResponse(res, 201, { message: 'Client created', clientId, configPath });
    } catch (err) {
      return jsonResponse(res, 400, { error: err.message });
    }
  }

  // PATCH /api/clients/:id  (update status, tier, etc.)
  if (clientMatch && req.method === 'PATCH') {
    try {
      const body = await parseBody(req);
      const registry = loadRegistry();
      const idx = registry.findIndex(c => c.clientId === clientMatch[1]);
      if (idx < 0) return jsonResponse(res, 404, { error: 'Client not found' });

      // Only allow updating safe fields
      const ALLOWED = ['status', 'tier', 'businessName', 'city', 'businessType', 'telegramChatId'];
      for (const key of ALLOWED) {
        if (body[key] !== undefined) registry[idx][key] = body[key];
      }
      if (body.status) registry[idx].updatedAt = new Date().toISOString();

      saveRegistry(registry);
      return jsonResponse(res, 200, { message: 'Client updated', client: registry[idx] });
    } catch (err) {
      return jsonResponse(res, 400, { error: err.message });
    }
  }

  // GET /api/stats
  if (pathname === '/api/stats' && req.method === 'GET') {
    const registry = loadRegistry();
    const TIER_PRICES = { 'AI Receptionist': 49, 'Growth Engine': 99, 'Full AI Employee': 149 };
    let monthlyRevenue = 0;
    for (const c of registry.filter(c => c.status === 'active')) {
      monthlyRevenue += TIER_PRICES[c.tier] || 0;
    }

    return jsonResponse(res, 200, {
      totalClients: registry.length,
      active: registry.filter(c => c.status === 'active').length,
      trial: registry.filter(c => c.status === 'trial').length,
      paused: registry.filter(c => c.status === 'paused').length,
      churned: registry.filter(c => c.status === 'churned').length,
      estimatedMonthlyRevenue: monthlyRevenue,
      estimatedAnnualRevenue: monthlyRevenue * 12
    });
  }

  return null; // Not an API route
}

// ---------------------------------------------------------------------------
// HTTP Server
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = url.pathname;

  // --- API Routes ---
  if (pathname.startsWith('/api/')) {
    const apiResult = await handleApi(req, res, pathname);
    if (apiResult === null) {
      jsonResponse(res, 404, { error: 'API endpoint not found' });
    }
    return;
  }

  // --- Static File Serving ---
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(WEB_DIR, safePath);

  // Security check: ensure path stays within WEB_DIR
  if (!filePath.startsWith(WEB_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA routing
      const indexPath = path.join(WEB_DIR, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        }
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  🚀 Yapli AI Platform Server Running!`);
  console.log(`  🌐 Website & Dashboard:  http://localhost:${PORT}`);
  console.log(`  📡 Health Endpoint:      http://localhost:${PORT}/api/health`);
  console.log(`  👥 Clients API:          http://localhost:${PORT}/api/clients`);
  console.log(`  📊 Stats API:            http://localhost:${PORT}/api/stats`);
  console.log(`======================================================\n`);
});
