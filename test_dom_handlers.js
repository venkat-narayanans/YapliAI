const fs = require('fs');
const html = fs.readFileSync('web/index.html', 'utf8');

// 1. Extract all onclick handlers
const onclickRegex = /onclick="([^"]+)"/g;
let match;
const onclicks = new Set();
while ((match = onclickRegex.exec(html)) !== null) {
  onclicks.add(match[1]);
}

console.log('=== CHECKING ONCLICK HANDLERS (' + onclicks.size + ' unique) ===');

// Extract function names from onclicks (e.g. setMode('website') -> setMode)
const calledFuncs = new Set();
onclicks.forEach(expr => {
  const funcMatch = expr.match(/^([a-zA-Z0-9_]+)\s*\(/);
  if (funcMatch) calledFuncs.add(funcMatch[1]);
});

// Extract defined functions from script
const scriptContent = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi).join('\n');
const funcDefRegex = /function\s+([a-zA-Z0-9_]+)\s*\(/g;
const definedFuncs = new Set();
while ((match = funcDefRegex.exec(scriptContent)) !== null) {
  definedFuncs.add(match[1]);
}

let missingFuncs = 0;
calledFuncs.forEach(fn => {
  if (definedFuncs.has(fn)) {
    console.log('  ✓ ' + fn + '() is defined');
  } else {
    console.error('  ✗ MISSING FUNCTION: ' + fn + '() is called in HTML but not defined!');
    missingFuncs++;
  }
});

// 2. Extract all document.getElementById calls from script
console.log('\n=== CHECKING getElementById CALLS ===');
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
const DYNAMIC_IDS = new Set(['typing-indicator']);
referencedIds.forEach(id => {
  if (definedIds.has(id) || DYNAMIC_IDS.has(id)) {
    console.log('  ✓ ID #' + id + ' exists ' + (DYNAMIC_IDS.has(id) ? '(dynamic element)' : 'in HTML'));
  } else {
    console.error('  ✗ MISSING ID: #' + id + ' referenced in JS but NOT in HTML!');
    missingIds++;
  }
});

console.log('\n=== SUMMARY ===');
console.log('Missing Functions:', missingFuncs);
console.log('Missing DOM IDs:', missingIds);

if (missingFuncs === 0 && missingIds === 0) {
  console.log('\nALL BUTTONS AND DOM REFERENCES VERIFIED 100% HEALTHY! 🎉');
} else {
  process.exit(1);
}
