const fs = require('fs');
const content = fs.readFileSync('app/page.tsx', 'utf8');

// Extract all JSX component usages (uppercase starting tags)
const componentUsages = new Set();
const regex = /<([A-Z][A-Za-z0-9]*)/g;
let match;
while ((match = regex.exec(content)) !== null) {
  componentUsages.add(match[1]);
}

// Extract all defined/imported components
const definedComponents = new Set();

// From imports
const importRegex = /import\s+\{([^}]+)\}/g;
while ((match = importRegex.exec(content)) !== null) {
  match[1].split(',').forEach(function(name) {
    definedComponents.add(name.trim().split(' ')[0]);
  });
}

// type imports
const typeImportRegex = /import\s+type\s+\{([^}]+)\}/g;
while ((match = typeImportRegex.exec(content)) !== null) {
  match[1].split(',').forEach(function(name) {
    definedComponents.add(name.trim().split(' ')[0]);
  });
}

// Function declarations
const funcRegex = /function\s+([A-Z][A-Za-z0-9]*)/g;
while ((match = funcRegex.exec(content)) !== null) {
  definedComponents.add(match[1]);
}

// Const component declarations
const constRegex = /const\s+([A-Z][A-Za-z0-9]*)\s*[:=]/g;
while ((match = constRegex.exec(content)) !== null) {
  definedComponents.add(match[1]);
}

console.log('Components USED in JSX:', Array.from(componentUsages).sort().join(', '));
console.log('\nComponents DEFINED/IMPORTED:', Array.from(definedComponents).sort().join(', '));

// Find undefined ones
const undefined_comps = [];
componentUsages.forEach(function(comp) {
  if (!definedComponents.has(comp)) {
    undefined_comps.push(comp);
  }
});

if (undefined_comps.length > 0) {
  console.log('\n*** UNDEFINED COMPONENTS (likely cause of error #130): ***');
  undefined_comps.forEach(function(comp) {
    // Find line numbers where it's used
    const lines = content.split('\n');
    lines.forEach(function(line, idx) {
      if (line.includes('<' + comp)) {
        console.log('  Line ' + (idx+1) + ': ' + line.trim().substring(0, 100));
      }
    });
  });
} else {
  console.log('\nAll JSX components are properly defined/imported');
}
