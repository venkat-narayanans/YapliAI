const ngrok = require('ngrok');

const NGROK_TOKEN = process.env.NGROK_TOKEN || '';
const PORT = process.env.PORT || 5678;

async function startTunnel() {
  try {
    if (!NGROK_TOKEN) {
      console.warn('Warning: NGROK_TOKEN environment variable not set.');
    }
    console.log(`Connecting ngrok tunnel to port ${PORT}...`);
    const url = await ngrok.connect({
      authtoken: NGROK_TOKEN,
      addr: PORT
    });

    console.log(`\n======================================================`);
    console.log(`  🚀 Ngrok Public Tunnel Active!`);
    console.log(`  🔗 Public HTTPS URL: ${url}`);
    console.log(`  📥 WhatsApp Webhook: ${url}/webhook/whatsapp`);
    console.log(`======================================================\n`);

    return url;
  } catch (err) {
    console.error('Failed to start ngrok tunnel:', err);
  }
}

if (require.main === module) {
  startTunnel();
}

module.exports = { startTunnel };
