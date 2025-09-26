#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runCodegen(options = {}) {
  const { watch = false, config = 'src/libs/gql/codegen.config.ts', format = true } = options;

  // Resolve config path relative to caller's working directory
  const configPath = resolve(process.cwd(), config);

  if (!existsSync(configPath)) {
    console.error(`❌ Config file not found: ${configPath}`);
    process.exit(1);
  }

  // Path to graphql-codegen in our node_modules
  const codegenPath = join(__dirname, '..', '..', 'node_modules', '.bin', 'graphql-codegen');

  // Build arguments
  const args = ['--config', configPath];
  if (watch) {
    args.push('--watch');
  }

  console.log(`🚀 Running GraphQL CodeGen${watch ? ' (watch mode)' : ''}...`);
  console.log(`📄 Config: ${configPath}`);

  // Run codegen
  const codegen = spawn(codegenPath, args, {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd() // Important: run from the app directory
  });

  return new Promise((resolve, reject) => {
    codegen.on('close', async (code) => {
      if (code === 0) {
        // Format generated files if requested and not in watch mode
        if (format && !watch) {
          await formatGeneratedFiles();
        }
        resolve();
      } else {
        reject(new Error(`GraphQL CodeGen failed with code ${code}`));
      }
    });

    codegen.on('error', (error) => {
      console.error('❌ Failed to start GraphQL CodeGen:', error);
      reject(error);
    });
  });
}

async function formatGeneratedFiles() {
  const genDir = join(process.cwd(), 'src/libs/gql/__gen__');

  if (!existsSync(genDir)) {
    console.log('ℹ️  No __gen__ directory to format');
    return;
  }

  console.log('🎨 Formatting and organizing imports in generated files...');

  const biome = spawn('biome', ['check', '--write', genDir], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
  });

  return new Promise((resolve) => {
    biome.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Generated files formatted');
      } else {
        console.log('⚠️  Formatting failed or biome not available');
      }
      resolve();
    });

    biome.on('error', () => {
      console.log('⚠️  Biome not available, skipping formatting');
      resolve();
    });
  });
}

// CLI usage
const args = process.argv.slice(2);

const options = {};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--watch' || arg === '-w') {
    options.watch = true;
  } else if (arg === '--config' || arg === '-c') {
    options.config = args[i + 1];
    i++; // Skip next arg as it's the config value
  } else if (arg === '--no-format') {
    options.format = false;
  }
}

try {
  await runCodegen(options);
  if (!options.watch) {
    console.log('✅ GraphQL CodeGen completed successfully');
  }
} catch (error) {
  console.error('❌ GraphQL CodeGen failed:', error);
  process.exit(1);
}
