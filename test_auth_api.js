const http = require('http');

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'GET',
      headers
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('==================================================');
  console.log('  🧪 RUNNING AUTHENTICATION & RBAC TEST SUITE');
  console.log('==================================================\n');

  // 1. Health check
  const health = await get('/api/health');
  console.log('1. Health check:', health.status === 200 ? '✅ PASS' : '❌ FAIL', health.body);

  // 2. Admin Login
  const adminLogin = await post('/api/auth/login', { email: 'admin@yapliai.com', password: 'admin123' });
  console.log('2. Admin login:', adminLogin.status === 200 ? '✅ PASS' : '❌ FAIL', adminLogin.body.user);
  const adminToken = adminLogin.body.token;

  // 3. Owner Login (Glow Studio)
  const glowLogin = await post('/api/auth/login', { email: 'owner@glowstudio.com', password: 'glow123' });
  console.log('3. Glow Studio owner login:', glowLogin.status === 200 ? '✅ PASS' : '❌ FAIL', glowLogin.body.user);
  const glowToken = glowLogin.body.token;

  // 4. Verify /api/auth/me
  const meAdmin = await get('/api/auth/me', adminToken);
  console.log('4. Verify /api/auth/me (Admin):', meAdmin.status === 200 && meAdmin.body.user.role === 'admin' ? '✅ PASS' : '❌ FAIL');

  const meGlow = await get('/api/auth/me', glowToken);
  console.log('5. Verify /api/auth/me (Owner):', meGlow.status === 200 && meGlow.body.user.clientId === 'glow_studio' ? '✅ PASS' : '❌ FAIL');

  // 6. RBAC on /api/clients
  const adminClients = await get('/api/clients', adminToken);
  console.log('6. Admin gets all clients:', adminClients.status === 200 && adminClients.body.total >= 3 ? '✅ PASS' : '❌ FAIL', '(total:', adminClients.body.total, ')');

  const glowClients = await get('/api/clients', glowToken);
  console.log('7. Glow owner only gets 1 client:', glowClients.status === 200 && glowClients.body.total === 1 && glowClients.body.clients[0].clientId === 'glow_studio' ? '✅ PASS' : '❌ FAIL', '(total:', glowClients.body.total, ')');

  // 8. Cross-tenant snooping protection on /api/clients/:id
  const glowOwnPortal = await get('/api/clients/glow_studio', glowToken);
  console.log('8. Owner can access their own business config:', glowOwnPortal.status === 200 ? '✅ PASS' : '❌ FAIL');

  const glowOtherPortal = await get('/api/clients/apex_dental', glowToken);
  console.log('9. Owner BLOCKED from other business config:', glowOtherPortal.status === 403 ? '✅ PASS (403 Forbidden)' : '❌ FAIL', glowOtherPortal.body);

  // 10. Admin can access any business config
  const adminApexAccess = await get('/api/clients/apex_dental', adminToken);
  console.log('10. Admin can access any business config:', adminApexAccess.status === 200 ? '✅ PASS' : '❌ FAIL', adminApexAccess.body.businessName);

  // 11. Signup new business owner
  const testEmail = 'owner_' + Date.now() + '@zenithsalon.com';
  const signupRes = await post('/api/auth/signup', {
    name: 'Elena Rostova',
    businessName: 'Zenith Luxury Salon',
    businessType: 'Hair & Beauty Salon',
    city: 'Chennai',
    phone: '+919988776655',
    email: testEmail,
    password: 'password123'
  });
  console.log('11. New business signup:', signupRes.status === 201 ? '✅ PASS' : '❌ FAIL', signupRes.body.user);
  const newOwnerToken = signupRes.body.token;

  // 12. New owner check their portal
  const newOwnerMe = await get('/api/auth/me', newOwnerToken);
  console.log('12. New owner verified in session:', newOwnerMe.status === 200 && newOwnerMe.body.user.businessName === 'Zenith Luxury Salon' ? '✅ PASS' : '❌ FAIL');

  // 13. Invalid login check
  const badLogin = await post('/api/auth/login', { email: 'admin@yapliai.com', password: 'wrongpassword' });
  console.log('13. Reject invalid credentials:', badLogin.status === 401 ? '✅ PASS (401)' : '❌ FAIL');

  console.log('\n==================================================');
  console.log('  🎉 ALL 13 AUTH & RBAC TESTS COMPLETED!');
  console.log('==================================================');
}

runTests().catch(err => console.error('Test suite error:', err));

