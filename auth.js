const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USERS_PATH = path.join(__dirname, 'clients', 'users.json');
const REGISTRY_PATH = path.join(__dirname, 'clients', 'registry.json');
const AUTH_SECRET = process.env.AUTH_SECRET || 'yapli_secret_key_2026_auth_token_signature';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

function signToken(payload) {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days
  const body = base64UrlEncode(JSON.stringify({ ...payload, exp }));
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(body));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// User Persistence & Seed
// ---------------------------------------------------------------------------

function loadUsers() {
  if (!fs.existsSync(USERS_PATH)) {
    const defaultUsers = seedDefaultUsers();
    saveUsers(defaultUsers);
    return defaultUsers;
  }
  try {
    return JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveUsers(users) {
  const dir = path.dirname(USERS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), 'utf8');
}

function seedDefaultUsers() {
  const adminSalt = generateSalt();
  const glowSalt = generateSalt();
  const apexSalt = generateSalt();

  return [
    {
      id: 'usr_admin_001',
      name: 'Venkat (Admin)',
      email: 'admin@yapliai.com',
      role: 'admin', // Full agency access: Agency Hub + any business dashboard
      salt: adminSalt,
      passwordHash: hashPassword('admin123', adminSalt),
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_owner_glow',
      name: 'Sarah (Glow Studio)',
      email: 'owner@glowstudio.com',
      role: 'owner', // Business Owner: only Glow Studio portal
      clientId: 'glow_studio',
      businessName: 'Glow Studio',
      salt: glowSalt,
      passwordHash: hashPassword('glow123', glowSalt),
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_owner_apex',
      name: 'Dr. Rajesh (Apex Dental)',
      email: 'owner@apexdental.com',
      role: 'owner', // Business Owner: only Apex Dental portal
      clientId: 'apex_dental',
      businessName: 'Apex Dental Clinic',
      salt: apexSalt,
      passwordHash: hashPassword('apex123', apexSalt),
      createdAt: new Date().toISOString()
    }
  ];
}

// ---------------------------------------------------------------------------
// Auth Operations
// ---------------------------------------------------------------------------

function authenticate(email, password) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  const users = loadUsers();
  const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    throw new Error('Invalid email or password');
  }

  const userSafe = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    clientId: user.clientId || null,
    businessName: user.businessName || null
  };

  const token = signToken(userSafe);
  return { token, user: userSafe };
}

function registerOwner({ name, email, password, businessName, businessType, city, phone }) {
  if (!name || !email || !password || !businessName) {
    throw new Error('Name, email, password, and business name are required');
  }

  const users = loadUsers();
  if (users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
    throw new Error('An account with this email already exists');
  }

  // Generate safe client ID
  const clientId = 'client_' + businessName
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 30) + '_' + Math.floor(100 + Math.random() * 900);

  // Register client in clients/registry.json if not present
  let registry = [];
  if (fs.existsSync(REGISTRY_PATH)) {
    try {
      registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
    } catch {
      registry = [];
    }
  }

  const newClientEntry = {
    clientId,
    businessName: businessName.trim(),
    businessType: businessType || 'General Business',
    city: city || 'City',
    sheetId: 'PROVISIONING_PENDING',
    whatsappPhoneId: phone || 'PENDING_SETUP',
    ownerWhatsAppNumber: phone || '',
    tier: 'Growth Engine',
    status: 'trial',
    deployedAt: new Date().toISOString(),
    workflowIds: ['wf1_trial', 'wf2_trial']
  };

  registry.push(newClientEntry);
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf8');

  // Create client config file
  const configPath = path.join(__dirname, 'clients', `${clientId}.json`);
  fs.writeFileSync(configPath, JSON.stringify({
    ...newClientEntry,
    telegramChatId: '',
    calendarId: 'primary',
    geminiModel: 'models/gemini-3.8-flash'
  }, null, 2), 'utf8');

  // Create User
  const salt = generateSalt();
  const newUser = {
    id: 'usr_' + Date.now(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: 'owner',
    clientId,
    businessName: businessName.trim(),
    salt,
    passwordHash: hashPassword(password, salt),
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  const userSafe = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    clientId: newUser.clientId,
    businessName: newUser.businessName
  };

  const token = signToken(userSafe);
  return { token, user: userSafe };
}

module.exports = {
  loadUsers,
  authenticate,
  registerOwner,
  verifyToken,
  seedDefaultUsers
};

