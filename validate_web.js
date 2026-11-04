const fs = require('fs');
const html = fs.readFileSync('web/index.html', 'utf8');

const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let i = 0;
while ((match = scriptRegex.exec(html)) !== null) {
  i++;
  const scriptContent = match[1];
  if (!scriptContent.trim()) continue;
  try {
    new Function(scriptContent);
    console.log('Script #' + i + ': Valid syntax ✅ (' + scriptContent.split('\n').length + ' lines)');
  } catch (err) {
    console.error('Script #' + i + ': SYNTAX ERROR ❌:', err.message);
    const lines = scriptContent.split('\n');
    lines.forEach((l, idx) => {
      console.log((idx + 1) + ': ' + l);
    });
  }
}
