const fs = require('fs');

function validateFile(filePath) {
  console.log(`\n==============================================`);
  console.log(`🔍 Validating Scripts in: ${filePath}`);
  console.log(`==============================================`);
  const html = fs.readFileSync(filePath, 'utf8');

  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let i = 0;
  let errors = 0;

  while ((match = scriptRegex.exec(html)) !== null) {
    i++;
    const scriptContent = match[1];
    if (!scriptContent.trim()) continue;
    try {
      new Function(scriptContent);
      console.log(`  Script #${i}: Valid syntax ✅ (${scriptContent.split('\n').length} lines)`);
    } catch (err) {
      console.error(`  Script #${i}: SYNTAX ERROR ❌:`, err.message);
      errors++;
      const lines = scriptContent.split('\n');
      lines.forEach((l, idx) => {
        console.log(`${idx + 1}: ${l}`);
      });
    }
  }

  return errors;
}

const err1 = validateFile('web/index.html');
const err2 = validateFile('admin/index.html');

if (err1 === 0 && err2 === 0) {
  console.log('\n🎉 ALL SCRIPTS IN CLIENT PORTAL & ADMIN PORTAL COMPILED WITH ZERO ERRORS!');
  process.exit(0);
} else {
  console.error('\n❌ Validation failed with errors.');
  process.exit(1);
}
