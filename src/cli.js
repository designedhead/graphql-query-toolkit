#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simply delegate to the compiled JavaScript setup script
const setupPath = join(__dirname, 'scripts', 'setup.js');
const args = process.argv.slice(2);

const child = spawn('node', [setupPath, ...args], {
  stdio: 'inherit',
  shell: true
});

child.on('error', (error) => {
  console.error('Failed to start setup:', error);
  process.exit(1);
});

child.on('close', (code) => {
  process.exit(code || 0);
});
