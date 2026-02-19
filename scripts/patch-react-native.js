#!/usr/bin/env node
/**
 * Patch React Native graphicsConversions.h to replace std::format with sprintf
 * This fixes the C++20 compilation error with NDK 26.1.10909125
 */

const fs = require('fs');
const path = require('path');

const headerPath = path.join(
  __dirname,
  '../node_modules/react-native/ReactCommon/react/renderer/core/graphicsConversions.h'
);

try {
  let content = fs.readFileSync(headerPath, 'utf8');
  
  // Check if already patched
  if (content.includes('sprintf(buffer, "%g%%"')) {
    console.log('✓ graphicsConversions.h already patched');
    process.exit(0);
  }
  
  // Replace std::format with sprintf
  const oldCode = 'return std::format("{}%", dimension.value);';
  const newCode = `char buffer[32];
      sprintf(buffer, "%g%%", (double)dimension.value);
      return std::string(buffer);`;
  
  if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(headerPath, content, 'utf8');
    console.log('✓ Patched graphicsConversions.h: replaced std::format with sprintf');
  } else {
    console.log('⚠ Could not find std::format pattern in graphicsConversions.h');
  }
} catch (error) {
  console.error('✗ Error patching graphicsConversions.h:', error.message);
  process.exit(1);
}
