# Portal Query Package - Architecture & Implementation

This document explains the technical implementation, architecture decisions, and design patterns used in the `@repo/portal-query` package.

## Overview

The `@repo/portal-query` package provides:
- **Type safety** through code generation
- **Developer experience** similar to tRPC
- **Scalability** across multiple services and domains
- **Performance** through intelligent caching
- **Reusability** across all monorepo apps
- **Consistency** through shared configurations

## Package Architecture

### Core Module Design

The package is built around configurable core modules that apps can customize:

```
packages/portal-query/src/
├── core/                    # Configurable core modules
│   ├── codegen.ts          # GraphQL Code Generator factory
│   ├── client.ts           # GraphQL client factory
│   └── utils.ts            # Cache management utilities factory
├── templates/              # App configuration templates
│   ├── client.ts.template
│   ├── codegen.config.ts.template
│   ├── utils.ts.template
│   └── README.md.template
├── scripts/                # CLI and setup utilities
│   └── setup.ts           # App scaffolding script
├── cli.js                  # CLI entry point
└── index.ts               # Package exports
```

### Key Architectural Decisions

#### 1. Factory Pattern for Core Modules

**Decision**: Use factory functions to create configurable instances instead of direct exports.

```typescript
// core/client.ts
export function createGraphQLClient(options: ClientOptions) {
  const client = new GraphQLClient(endpoint, { headers: defaultHeaders });
  return { client, getSdk: (generated) => generated(client) };
}

// In app - client.ts
import { createGraphQLClient } from '@repo/portal-query/core/client';

const { client, getSdk } = createGraphQLClient({
  endpoint: 'https://api.example.com/graphql',
  defaultHeaders: { 'api-key': 'xxx' }
});
```

**Rationale**:
- **Flexibility**: Each app can customize endpoint, headers, error handling
- **Testability**: Easy to mock and test different configurations
- **Reusability**: Same core logic, different configurations
- **Type safety**: Configuration options are typed

#### 2. Template-based App Setup

**Decision**: Use template files with placeholder replacement for app scaffolding.

```typescript
// Template system in scripts/setup.ts
const replacements = {
  '{{GRAPHQL_ENDPOINT}}': options.graphqlEndpoint,
  '{{API_KEY}}': options.apiKey,
  '{{APP_NAME}}': options.appName
};

// Apply to template files
for (const [placeholder, value] of Object.entries(replacements)) {
  content = content.replace(new RegExp(placeholder, 'g'), value);
}
```

**Rationale**:
- **Consistency**: All apps get the same structure and patterns
- **Customization**: Apps can have different endpoints, auth, etc.
- **Maintainability**: Updates to templates propagate to all new setups
- **DX**: Single command setup for new apps

#### 3. CLI-First Approach

**Decision**: Provide CLI tools for setup and management rather than programmatic APIs.

```bash
# Simple setup command
pnpm query-gen setup --endpoint https://api.com/graphql --api-key abc123

# Generated structure is ready to use
pnpm gql  # Run codegen
```

**Rationale**:
- **Developer Experience**: Simple, discoverable commands
- **Consistency**: Same setup process across teams
- **Documentation**: CLI help documents usage patterns
- **Automation**: Easy to integrate into scripts and CI/CD

#### 4. Core Logic Centralization

**Decision**: Keep all GraphQL dependencies and logic in the package, apps only have configuration.

**Package dependencies**:
```json
{
  "dependencies": {
    "@graphql-codegen/cli": "^6.0.0",
    "@graphql-codegen/typescript": "^5.0.0",
    "@tanstack/react-query": "^5.87.1",
    "graphql": "^16.11.0",
    "graphql-request": "^7.2.0"
  }
}
```

**App dependencies** (after migration):
```json
{
  "devDependencies": {
    "@repo/portal-query": "workspace:*"
  }
}
```

**Rationale**:
- **Bundle efficiency**: Shared dependencies across apps
- **Version consistency**: Single source of truth for GraphQL stack versions
- **Maintenance**: Updates only needed in one place
- **App simplicity**: Apps focus on business logic, not GraphQL setup

#### 5. tRPC-like Cache Management

**Decision**: Build utilities that mirror tRPC's cache management API on top of React Query.

```typescript
// Generated utils pattern
const utils = useUtils();

// tRPC-like API
await utils.notifications.getApps.invalidate();
await utils.users.getProfile.refetch();
const data = utils.bookings.getList.getData();
utils.analytics.getMetrics.setData(newData);
```

**Implementation**:
```typescript
export function createUtilsFactory(config: UtilsConfig) {
  return function createUtils(queryClient: QueryClient) {
    // Build utils object dynamically from config
    const utils = {};
    for (const [group, operations] of Object.entries(config.groups)) {
      utils[group] = {};
      for (const operation of operations) {
        utils[group][operation] = {
          invalidate: async (filters?) => { /* ... */ },
          refetch: async (filters?) => { /* ... */ },
          getData: (variables?) => { /* ... */ },
          setData: (data, variables?) => { /* ... */ }
        };
      }
    }
    return utils;
  };
}
```

**Rationale**:
- **Familiar API**: Developers already know tRPC patterns
- **Type safety**: Full TypeScript support with generated types
- **Flexibility**: Works with React Query's powerful caching
- **Performance**: Selective invalidation and optimistic updates

### Generated App Structure

After running `pnpm query-gen setup`, apps get this clean structure:

```
src/libs/gql/
├── schemas/              # Your .gql files (version controlled)
│   └── example.schema.gql
├── __gen__/             # Generated files (gitignored)
│   ├── index.ts
│   ├── graphql.ts
│   └── ...
├── client.ts           # Uses @repo/portal-query/core/client
├── codegen.config.ts   # Uses @repo/portal-query/core/codegen
├── utils.ts           # Uses @repo/portal-query/core/utils
├── index.ts           # App exports
└── README.md          # App-specific usage guide
```

**Benefits**:
- **Clean separation**: Only config and generated files in apps
- **Upgradeable**: Package updates improve all apps
- **Consistent**: Same patterns across all applications
- **Minimal**: Apps contain only what they need

### Type System Integration

**Decision**: Use TypeScript's module system for clean type exports.

```typescript
// Package exports (packages/portal-query/src/index.ts)
export { createCodegenConfig } from './core/codegen';
export type { CodegenOptions } from './core/codegen';
export { createGraphQLClient } from './core/client';
export type { ClientOptions } from './core/client';

// App usage
import { createGraphQLClient } from '@repo/portal-query/core/client';
import type { CodegenOptions } from '@repo/portal-query';
```

**Rationale**:
- **Tree shaking**: Apps only bundle what they import
- **Type safety**: Full TypeScript coverage from package to app
- **IDE support**: Excellent autocomplete and error checking
- **Namespace cleanliness**: Clear distinction between package and app code

### Development Workflow Integration

**Decision**: Integrate seamlessly with existing monorepo tooling.

```json
// App package.json scripts
{
  "gql": "pnpm --filter=@repo/portal-query exec graphql-codegen --config ../../apps/booking/src/libs/gql/codegen.config.ts",
  "gql:watch": "pnpm --filter=@repo/portal-query exec graphql-codegen --config ../../apps/booking/src/libs/gql/codegen.config.ts --watch",
  "query-gen": "query-gen"
}
```

**Benefits**:
- **Monorepo consistency**: Same commands across all apps
- **Dependency management**: Commands run with package's dependencies
- **Watch mode**: Development-friendly regeneration
- **CI/CD ready**: Easy to integrate into build pipelines

### Performance Considerations

#### Bundle Optimization
- **Tree-shaking**: Core modules are imported individually
- **Code splitting**: Templates generate separate client/server patterns
- **Minimal runtime**: Only React Query and GraphQL Request as peer deps

#### Runtime Performance
- **React Query caching**: Built-in intelligent caching layer
- **Selective invalidation**: Target specific cache entries
- **Background refetching**: Keep data fresh without blocking UI
- **Request deduplication**: Automatic duplicate request elimination

#### Build Performance
- **Shared dependencies**: Package manages all GraphQL tooling
- **Parallel generation**: Multiple apps can generate simultaneously
- **Incremental builds**: Only regenerate when schema files change

## Migration Strategy

### From Manual GraphQL Setup

1. **Install package**: `pnpm add @repo/portal-query`
2. **Backup existing**: Move current GraphQL code to backup folder
3. **Run setup**: `pnpm query-gen setup --endpoint <url> --api-key <key>`
4. **Migrate queries**: Copy .gql files to schemas/ folder
5. **Update imports**: Change imports to use new generated files
6. **Remove dependencies**: Clean up package.json dependencies
7. **Test**: Verify functionality with new setup

### From Other GraphQL Solutions

1. **Schema extraction**: Convert existing queries to .gql format
2. **Dependency audit**: Remove conflicting GraphQL packages
3. **Component updates**: Update components to use new hook patterns
4. **Cache migration**: Migrate existing cache patterns to utils system
5. **Type migration**: Update TypeScript imports to use generated types

## Trade-offs and Limitations

### Benefits
✅ **Consistency**: Same GraphQL experience across all apps
✅ **Maintainability**: Single place to update GraphQL stack
✅ **Developer Experience**: tRPC-like API with familiar patterns
✅ **Type Safety**: Full TypeScript coverage end-to-end
✅ **Performance**: React Query caching with intelligent invalidation
✅ **Scalability**: Easy to add new apps and services

### Trade-offs
⚠️ **Package coupling**: Apps depend on package for GraphQL functionality
⚠️ **CLI dependency**: Setup requires CLI tools and templates
⚠️ **Learning curve**: Developers need to understand package patterns
⚠️ **Debugging complexity**: Errors might span package and app code

### Limitations
❌ **Template flexibility**: Apps must follow package structure patterns
❌ **Version coupling**: All apps use same GraphQL dependency versions
❌ **Customization depth**: Deep customizations might require package changes
❌ **Migration effort**: Existing apps require migration to new patterns

## Future Improvements

### 1. Automatic Utils Generation
Generate cache utils automatically from GraphQL operations, eliminating manual configuration.

### 2. Multi-Schema Support
Support for federated GraphQL schemas and schema stitching.

### 3. Real-time Features
Add GraphQL subscription support with WebSocket integration.

### 4. Performance Monitoring
Built-in metrics for query performance and cache hit rates.

### 5. Advanced Caching
Implement normalized caching and cross-query data sharing.

### 6. Development Tools
Enhanced developer tools for schema exploration and cache debugging.

This architecture provides a solid foundation for GraphQL integration across the monorepo while maintaining flexibility for app-specific needs.