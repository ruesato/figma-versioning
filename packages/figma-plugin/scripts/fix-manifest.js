#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const manifestPath = join(__dirname, '../dist/manifest.json');

try {
  let content = readFileSync(manifestPath, 'utf8');
  content = content.replace(/build\/main\.js/g, 'main.js');
  content = content.replace(/build\/ui\.js/g, 'ui.js');
  writeFileSync(manifestPath, content, 'utf8');
  console.log('✓ Fixed manifest.json paths');
} catch (error) {
  console.error('Failed to fix manifest.json:', error.message);
  process.exit(1);
}
