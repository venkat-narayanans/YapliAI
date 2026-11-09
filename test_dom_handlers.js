const fs = require('fs');

function testDomHandlers(filePath, options = {}) {
  console.log(`\n======================================================`);
  console.log(`🔍 Testing DOM Handlers & IDs: ${filePath}`);
  console.log(`======================================================`);
  const html = fs.readFileSync(filePath, 'utf8');

  // 1. Extract all onclick handlers
  const onclickRegex = /onclick="([^"]+)"/g;
  let match;
  const onclicks = new Set();
  while ((match = onclickRegex.exec(html)) !== null) {
    onclicks.add(match[1]);
  }

  console.log(`=== CHECKING ONCLICK HANDLERS (${onclicks.size} unique) ===`);

  // Extract function names from onclicks (e.g. setMode('website') -> setMode)
  const calledFuncs = new Set();
  onclicks.forEach(expr => {
    const funcMatch = expr.match(/^([a-zA-Z0-9_]+)\s*\(/);
    if (funcMatch) calledFuncs.add(funcMatch[1]);
  });

  // Extract defined functions from script
  const scriptTags = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || [];
  const scriptContent = scriptTags.join('\n');
  const funcDefRegex = /function\s+([a-zA-Z0-9_]+)\s*\(/g;
  const definedFuncs = new Set();
  while ((match = funcDefRegex.exec(scriptContent)) !== null) {
    definedFuncs.add(match[1]);
  }

  let missingFuncs = 0;
  calledFuncs.forEach(fn => {
    if (definedFuncs.has(fn)) {
      console.log(`  ✓ ${fn}() is defined`);
    } else {
      console.error(`  ✗ MISSING FUNCTION: ${fn}() is called in HTML but not defined!`);
      missingFuncs++;
    }
  });

  // 2. Extract all document.getElementById calls from script
  console.log(`\n=== CHECKING getElementById CALLS ===`);
  const getElemRegex = /getElementById\(['"]([^'"]+)['"]\)/g;
  const referencedIds = new Set();
  while ((match = getElemRegex.exec(scriptContent)) !== null) {
    referencedIds.add(match[1]);
  }

  // Extract all IDs from HTML
  const idRegex = /\bid=["']([^"']+)["']/g;
  const definedIds = new Set();
  while ((match = idRegex.exec(html)) !== null) {
    definedIds.add(match[1]);
  }

  let missingIds = 0;
  const dynamicIds = options.dynamicIds || new Set(['typing-indicator']);
  referencedIds.forEach(id => {
    if (definedIds.has(id) || dynamicIds.has(id)) {
      console.log(`  ✓ ID #${id} exists ${dynamicIds.has(id) ? '(dynamic element)' : 'in HTML'}`);
    } else {
      console.error(`  ✗ MISSING ID: #${id} referenced in JS but NOT in HTML!`);
      missingIds++;
    }
  });

  console.log(`\n=== SUMMARY FOR ${filePath} ===`);
  console.log(`Missing Functions: ${missingFuncs}`);
  console.log(`Missing DOM IDs: ${missingIds}`);

  return { missingFuncs, missingIds };
}

const r1 = testDomHandlers('web/index.html', { dynamicIds: new Set(['typing-indicator']) });
const r2 = testDomHandlers('admin/index.html', { dynamicIds: new Set() });

if (r1.missingFuncs === 0 && r1.missingIds === 0 && r2.missingFuncs === 0 && r2.missingIds === 0) {
  console.log('\n🎉 ALL BUTTONS, SCRIPTS, AND DOM IDS VERIFIED 100% HEALTHY ACROSS BOTH PORTALS!');
  process.exit(0);
} else {
  console.error('\n❌ DOM handler tests failed.');
  process.exit(1);
}
