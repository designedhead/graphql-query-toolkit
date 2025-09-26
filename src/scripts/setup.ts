#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SetupOptions {
  graphqlEndpoint?: string;
  schemaUrl?: string;
  apiKey?: string;
  gatewayEndpoint?: string;
  appName?: string;
  targetDir?: string;
}

async function updatePackageJsonScripts(targetDir: string) {
  const packageJsonPath = path.join(targetDir, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    console.log('⚠️  No package.json found, skipping script addition');
    return;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    // Check if @repo/portal-query is in devDependencies to use query-codegen
    const hasPortalQuery =
      packageJson.devDependencies?.['@repo/portal-query'] || packageJson.dependencies?.['@repo/portal-query'];

    if (hasPortalQuery) {
      // Use query-codegen which is provided by @repo/portal-query
      packageJson.scripts.gql = 'query-codegen';
      if (!packageJson.scripts['gql:watch']) {
        packageJson.scripts['gql:watch'] = 'query-codegen --watch';
      }
    } else {
      // Use direct graphql-codegen command
      packageJson.scripts.gql = 'graphql-codegen --config src/libs/gql/codegen.config.ts';
      if (!packageJson.scripts['gql:watch']) {
        packageJson.scripts['gql:watch'] = 'graphql-codegen --config src/libs/gql/codegen.config.ts --watch';
      }
    }

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log('📦 Updated package.json with gql scripts');
  } catch (error) {
    console.log('⚠️  Failed to update package.json scripts:', error);
  }
}

export async function setupGraphQLStructure(options: SetupOptions = {}) {
  const {
    graphqlEndpoint = 'https://your-graphql-endpoint.com/graphql',
    schemaUrl = graphqlEndpoint,
    apiKey = 'your-api-key',
    gatewayEndpoint,
    appName = 'your-app',
    targetDir = process.cwd()
  } = options;

  const libsGqlDir = path.join(targetDir, 'src', 'libs', 'gql');
  const schemasDir = path.join(libsGqlDir, 'schemas');

  console.log('🚀 Setting up GraphQL structure with @repo/portal-query...');

  // Create directory structure - only schemas and generated files
  const dirs = [libsGqlDir, schemasDir];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${path.relative(targetDir, dir)}`);
    }
  }

  // Template replacements
  const replacements = {
    '{{GRAPHQL_ENDPOINT}}': graphqlEndpoint,
    '{{GRAPHQL_SCHEMA_URL}}': schemaUrl,
    '{{API_KEY}}': apiKey,
    '{{GATEWAY_ENDPOINT}}': gatewayEndpoint || `\${process.env.BASE_URL}/api/gateway`,
    '{{APP_NAME}}': appName
  };

  // Copy and process template files
  const templateDir = path.join(__dirname, '..', 'templates');
  const templateFiles = [
    { from: 'client.ts.template', to: path.join(libsGqlDir, 'client.ts') },
    { from: 'codegen.config.ts.template', to: path.join(libsGqlDir, 'codegen.config.ts') },
    { from: 'utils.ts.template', to: path.join(libsGqlDir, 'utils.ts') },
    { from: 'index.ts.template', to: path.join(libsGqlDir, 'index.ts') }
  ];

  for (const { from, to } of templateFiles) {
    const templatePath = path.join(templateDir, from);

    if (fs.existsSync(templatePath)) {
      let content = fs.readFileSync(templatePath, 'utf8');

      // Apply replacements
      for (const [placeholder, value] of Object.entries(replacements)) {
        content = content.replace(new RegExp(placeholder, 'g'), value);
      }

      fs.writeFileSync(to, content);
      console.log(`📄 Created file: ${path.relative(targetDir, to)}`);
    }
  }

  // Create example schema file
  const exampleSchemaPath = path.join(schemasDir, 'example.schema.gql');
  if (!fs.existsSync(exampleSchemaPath)) {
    const exampleSchema = `# Example GraphQL Operations
# Replace with your actual queries and mutations

query GetExample {
  # Add your query fields here
}

mutation CreateExample($input: CreateExampleInput!) {
  # Add your mutation fields here
}
`;
    fs.writeFileSync(exampleSchemaPath, exampleSchema);
    console.log(`📄 Created example schema: ${path.relative(targetDir, exampleSchemaPath)}`);
  }

  // Update package.json with gql script
  await updatePackageJsonScripts(targetDir);

  console.log('✅ GraphQL structure setup complete!');
  console.log('');
  console.log('📦 Structure created:');
  console.log('src/libs/gql/');
  console.log('├── schemas/           # Your .gql files');
  console.log('├── codegen.config.ts  # CodeGen configuration (uses @repo/portal-query)');
  console.log('├── client.ts          # GraphQL client (uses @repo/portal-query)');
  console.log('├── utils.ts           # Cache utils (uses @repo/portal-query)');
  console.log('├── index.ts           # Main exports');
  console.log('├── README.md         # Auto-generated documentation (created after pnpm gql)');
  console.log('└── __gen__/          # Generated files (after running codegen)');
  console.log('');
  console.log('Next steps:');
  console.log('1. Add your GraphQL queries to .gql files in src/libs/gql/schemas/');
  console.log('2. Run code generation: pnpm gql');
  console.log('3. Update src/libs/gql/utils.ts with your operations and groups');
  console.log('');
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options: SetupOptions = {};

  // Simple argument parsing
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];

    if (key && value) {
      switch (key) {
        case 'endpoint':
          options.graphqlEndpoint = value;
          break;
        case 'schema':
          options.schemaUrl = value;
          break;
        case 'api-key':
          options.apiKey = value;
          break;
        case 'gateway':
          options.gatewayEndpoint = value;
          break;
        case 'app-name':
          options.appName = value;
          break;
        case 'target':
          options.targetDir = value;
          break;
      }
    }
  }

  (async () => {
    await setupGraphQLStructure(options);
  })();
}
