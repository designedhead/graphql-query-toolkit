# graphql-query-toolkit

A comprehensive GraphQL integration package that provides tRPC-like developer experience with type-safe cache management.

## Features

- 🚀 **tRPC-like API** - Familiar cache management with `utils.notifications.getApps.invalidate()`
- 🛡️ **Type Safety** - Full TypeScript coverage from schema to UI
- ⚡ **Performance** - React Query caching with intelligent invalidation
- 🏗️ **Scalable** - Multi-service support with clean organization
- 🌐 **Multi-Endpoint Support** - Connect to multiple GraphQL APIs with separate type generation
- 🔧 **Developer Experience** - Single command setup and generation
- 📦 **Reusable** - Consistent GraphQL setup across all apps

## Quick Start

### 1. Install the Package

```bash
npm install graphql-query-toolkit

# Or with other package managers
pnpm add graphql-query-toolkit
yarn add graphql-query-toolkit
```

### 2. Setup GraphQL Structure

```bash
# Run the setup command in your app directory
npx graphql-query-toolkit setup --endpoint https://your-api.com/graphql --api-key your-key
```

This creates:
```
src/libs/gql/
├── schemas/           # Your .gql files
├── logic/            # Generated code and config
└── README.md         # Usage documentation
```

### 3. Add Package Scripts

Add to your app's `package.json`:

```json
{
  "scripts": {
    "gql": "graphql-codegen --config src/libs/gql/logic/codegen.ts && pnpm run gql:format",
    "gql:format": "biome format --write src/libs/gql/logic/__gen__/",
    "gql:watch": "graphql-codegen --config src/libs/gql/logic/codegen.ts --watch && pnpm run gql:format"
  }
}
```

### 4. Write GraphQL Queries

Create `.gql` files in `src/libs/gql/schemas/`:

```graphql
# schemas/users.schema.gql
query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
  }
}

mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
  updateUser(id: $id, input: $input) {
    id
    name
    email
  }
}
```

### 5. Generate Code

```bash
pnpm gql
```

### 6. Use in Components

```tsx
import { useGetUserQuery } from '@/libs/gql';
import { useServiceAUtils } from '@/libs/gql/__gen__/service-a/cache-utils';

const UserProfile = ({ userId }: { userId: string }) => {
  const { data, isLoading } = useGetUserQuery({ id: userId });
  const utils = useServiceAUtils();

  const handleRefresh = () => utils.users.getUser.invalidate({ id: userId });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{data?.user?.name}</h1>
      <button onClick={handleRefresh}>Refresh</button>
    </div>
  );
};
```

Note: `useUtils` is still exported as a backwards-compatible alias of the service-specific hook (e.g., `useServiceAUtils`). Prefer the service-specific hook when using multiple endpoints.

## CLI Commands

### Setup Command

```bash
graphql-query-toolkit setup [options]
```

**Options:**
- `--endpoint <url>`: GraphQL endpoint URL
- `--api-key <key>`: API key for authentication  
- `--app-name <name>`: Application name
- `--target <dir>`: Target directory (default: current)

**Examples:**
```bash
# Basic setup
graphql-query-toolkit setup --endpoint https://api.example.com/graphql

# With authentication
graphql-query-toolkit setup --endpoint https://api.example.com/graphql --api-key abc123

# Custom app name
graphql-query-toolkit setup --app-name booking --endpoint https://notification-service.com/graphql
```

## Package Structure

```
graphql-query-toolkit/
├── src/
│   ├── templates/           # Template files for setup
│   │   ├── client.ts.template
│   │   ├── codegen.ts.template
│   │   ├── utils.ts.template
│   │   ├── index.ts.template
│   │   └── README.md.template
│   ├── plugins/            # CodeGen plugins
│   │   ├── cache-utils.plugin.js
│   │   └── cache-utils.template.hbs
│   ├── scripts/
│   │   └── setup.ts        # Main setup script
│   ├── cli.js              # CLI entry point
│   └── index.ts           # Package exports
├── package.json
└── README.md              # This file
```

## Generated App Structure

After running `graphql-query-toolkit setup`, your app will have:

```
src/libs/gql/
├── schemas/               # Your GraphQL files (.gql)
│   └── example.schema.gql
├── logic/                # Generated code and utilities
│   ├── __gen__/          # Auto-generated types and hooks
│   ├── plugins/          # CodeGen plugins  
│   ├── codegen.ts        # CodeGen configuration
│   ├── client.ts         # GraphQL client setup
│   └── utils.ts          # tRPC-like cache management
├── index.ts              # Main exports
└── README.md            # Usage documentation
```

## Integration with Existing Apps

### Next.js Integration

1. **Add Package Scripts**: Include `gql`, `gql:format`, and `gql:watch` scripts
2. **Update predev Script**: Add `pnpm run gql:watch` to your development workflow
3. **TypeScript Config**: Ensure your `tsconfig.json` includes the generated files
4. **Import Alias**: Set up `@/libs/gql` path mapping

### Development Workflow

```json
{
  "scripts": {
    "predev": "pnpm run variables && pnpm run gql:watch",
    "dev": "next dev --turbopack",
    "gql": "graphql-codegen --config src/libs/gql/logic/codegen.ts && pnpm run gql:format",
    "gql:format": "biome format --write src/libs/gql/logic/__gen__/",
    "gql:watch": "graphql-codegen --config src/libs/gql/logic/codegen.ts --watch && pnpm run gql:format"
  }
}
```

## Configuration Options

### Core Functions

The package exports two main configuration functions:

#### `createCodegenConfig(options: CodegenOptions)`
Creates a GraphQL CodeGen configuration for one or more endpoints with namespaced outputs.

**Options:**
- `endpoints: Record<string, EndpointConfig>` - Object mapping endpoint names to configurations
  - `schema: string` - GraphQL endpoint URL
  - `documentsPath: string` - Path to .gql files for this endpoint
  - `gatewayEndpoint: string` - Runtime endpoint for queries
  - `headers?: Record<string, string>` - Endpoint-specific headers
- `baseOutputDir?: string` - Base output directory (default: `src/libs/gql/__gen__`)
- `reactQueryVersion?: number` - React Query version (default: 5)
- `appName?: string` - App name for documentation

## Complete Setup Example

Here's a complete example showing how to set up multi-endpoint GraphQL with a dynamic gateway:

### 1. Create Dynamic Gateway Route

```typescript
// app/api/gateway/[endpoint]/route.ts
import { NextRequest, NextResponse } from 'next/server';

const ENDPOINTS = {
  serviceA: {
    url: process.env.SERVICE_A_ENDPOINT,
    requiresAuth: true
  },
  serviceB: {
    url: process.env.SERVICE_B_ENDPOINT,
    requiresAuth: false
  }
} as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ endpoint: string }> }
) {
  const { endpoint } = await params;
  const config = ENDPOINTS[endpoint as keyof typeof ENDPOINTS];
  if (!config) {
    return NextResponse.json(
      { error: `Unknown endpoint: ${endpoint}` },
      { status: 400 }
    );
  }

  const { query, variables } = await request.json();
  const headers = config.requiresAuth
    ? await getAuthHeaders(request)
    : { 'Content-Type': 'application/json' };

  const response = await fetch(config.url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables })
  });

  return NextResponse.json(await response.json());
}
```

### 2. Configure GraphQL CodeGen

```typescript
// src/libs/gql/codegen.config.ts
import { createCodegenConfig } from 'graphql-query-toolkit/core/codegen';

const config = createCodegenConfig({
  endpoints: {
    serviceA: {
      schema: process.env.SERVICE_A_ENDPOINT || '',
      documentsPath: 'src/libs/gql/schemas/service-a/*.schema.gql',
      gatewayEndpoint: `${process.env.BASE_URL}/api/gateway/service-a`
    },
    serviceB: {
      schema: process.env.SERVICE_B_ENDPOINT || '',
      documentsPath: 'src/libs/gql/schemas/service-b/*.schema.gql',
      gatewayEndpoint: `${process.env.BASE_URL}/api/gateway/service-b`
    }
  },
  baseOutputDir: 'src/libs/gql/__gen__',
  appName: 'my-app'
});

export default config;
```

### 3. Organize Your Schema Files

```
src/libs/gql/schemas/
├── service-a/
│   ├── users.schema.gql
│   └── products.schema.gql
└── service-b/
    └── locations.schema.gql
```

### 4. Use in Components

```tsx
// Import from generated endpoint-specific hooks
import { useUsersQuery } from '@/libs/gql/__gen__/service-a/plugins/react-query';
import { useLocationsQuery } from '@/libs/gql/__gen__/service-b/plugins/react-query';

function MyComponent() {
  const { data: users } = useUsersQuery({ first: 10 });
  const { data: locations } = useLocationsQuery();

  return (
    <div>
      <h2>Users: {users?.users?.length || 0}</h2>
      <h2>Locations: {locations?.locations?.length || 0}</h2>
    </div>
  );
}
```

## Advanced Usage

### Single Endpoint Configuration

For single GraphQL endpoint, simply pass one endpoint in the endpoints object:

```typescript
// src/libs/gql/codegen.config.ts
import { createCodegenConfig } from 'graphql-query-toolkit/core/codegen';

const config = createCodegenConfig({
  endpoints: {
    main: {
      schema: 'https://your-api.com/graphql',
      documentsPath: 'src/libs/gql/schemas/*.schema.gql',
      gatewayEndpoint: `${process.env.BASE_URL}/api/gateway`,
      headers: {
        'Authorization': `Bearer ${process.env.GRAPHQL_TOKEN}`,
        'api-key': process.env.API_KEY
      }
    }
  },
  baseOutputDir: 'src/libs/gql/__gen__',
  appName: 'your-app'
});

export default config;
```

### Multi-Endpoint GraphQL Setup

For applications that need to connect to multiple GraphQL endpoints (or even just one), use `createCodegenConfig`:

```typescript
// src/libs/gql/codegen.config.ts
import { createCodegenConfig } from 'graphql-query-toolkit/core/codegen';

const config = createCodegenConfig({
  endpoints: {
    service-a: {
      schema: process.env.SERVICE_A_ENDPOINT || '',
      documentsPath: 'src/libs/gql/schemas/service-a/*.schema.gql',
      gatewayEndpoint: `${process.env.BASE_URL}/api/gateway`,
      headers: {
        'Authorization': `Bearer ${process.env.SERVICE_A_TOKEN}`
      }
    },
    service-b: {
      schema: process.env.SERVICE_B_ENDPOINT || "",
      documentsPath: 'src/libs/gql/schemas/service-b/*.schema.gql',
      gatewayEndpoint: `${process.env.BASE_URL}/api/service-b-gateway`,
      headers: {
        // Add service-B-specific headers
      }
    }
  },
  baseOutputDir: 'src/libs/gql/__gen__',
  appName: 'booking'
});

export default config;
```

**Directory Structure for Multi-Endpoint:**
```
schemas/
├── service-a/
│   ├── users.schema.gql
│   └── products.schema.gql
└── service-b/
    └── locations.schema.gql
```

**Generated Structure (Multi-Endpoint):**
```
__gen__/
├── service-a/
│   ├── plugins/
│   │   ├── react-query.ts
│   │   └── graphql-request.ts
│   └── [other generated files]
└── service-b/
    ├── plugins/
    │   ├── react-query.ts
    │   └── graphql-request.ts
    └── [other generated files]
```

**Generated Structure (Single Endpoint):**
```
__gen__/
└── main/
    ├── plugins/
    │   ├── react-query.ts
    │   └── graphql-request.ts
    └── [other generated files]
```

**Usage in Components:**
```tsx
// Multi-endpoint: Import from specific endpoints
import { useUsersQuery } from '@/libs/gql/__gen__/service-a/plugins/react-query';
import { useLocationsQuery } from '@/libs/gql/__gen__/service-b/plugins/react-query';

const MultiEndpointComponent = () => {
  const { data: userData } = useUsersQuery({ first: 10 });
  const { data: locationData } = useLocationsQuery();

  return (
    <div>
      <h2>Users from Service A: {userData?.users?.length || 0}</h2>
      <h2>Locations from Service B: {locationData?.locations?.length || 0}</h2>
    </div>
  );
};
```

```tsx
// Single endpoint: Import from your named endpoint
import { useUsersQuery } from '@/libs/gql/__gen__/main/plugins/react-query';

const SingleEndpointComponent = () => {
  const { data: userData } = useUsersQuery({ first: 10 });

  return (
    <div>
      <h2>Users: {userData?.users?.length || 0}</h2>
    </div>
  );
};
```

### Custom Utils Organization

Update `utils.ts` to match your service structure:

```typescript
export const createUtils = (queryClient: QueryClient) => ({
  users: {
    getUser: { /* ... */ },
    updateUser: { /* ... */ }
  },
  notifications: {
    getList: { /* ... */ },
    markAsRead: { /* ... */ }
  }
});
```

## Benefits

### For Development Teams
- **Unified API**: One function handles single or multiple endpoints
- **Type Safety**: Full TypeScript coverage from schema to UI
- **Familiar API**: tRPC-like patterns developers already know
- **Fast Setup**: Single command creates entire structure
- **Simplified Migration**: Easy to add endpoints without changing API

### For Applications
- **Performance**: Intelligent caching with React Query
- **Developer Experience**: Auto-completion and type checking
- **Scalability**: Start with one endpoint, easily add more
- **Maintainability**: Generated code reduces manual maintenance
- **Flexibility**: Each endpoint gets its own namespace and configuration

## Troubleshooting

### Common Issues

**Setup command not found:**
```bash
# Make sure the package is installed globally or use npx
npm install -g graphql-query-toolkit

# Or use npx directly
npx graphql-query-toolkit setup
```

**TypeScript errors after generation:**
```bash
# Ensure all dependencies are installed
pnpm install

# Re-run generation
pnpm gql
```

**Import path errors (Single Endpoint):**
```tsx
// Use the main index export
import { useGetUserQuery } from '@/libs/gql';

// Not the generated files directly
import { useGetUserQuery } from '@/libs/gql/logic/__gen__/plugins/react-query'; // ❌
```

**Import path errors:**
```tsx
// Multi-endpoint: Import from specific endpoint plugins
import { useUsersQuery } from '@/libs/gql/__gen__/service-a/plugins/react-query'; // ✅
import { useLocationsQuery } from '@/libs/gql/__gen__/service-b/plugins/react-query'; // ✅

// Single endpoint: Import from your named endpoint
import { useUsersQuery } from '@/libs/gql/__gen__/main/plugins/react-query'; // ✅

// Don't mix endpoint imports
import { useUsersQuery, useLocationsQuery } from '@/libs/gql'; // ❌
```

**CSP Issues with External APIs (Dynamic Gateway Approach):**
```typescript
// Create a single dynamic API route to handle multiple endpoints
// app/api/gateway/[endpoint]/route.ts
const ENDPOINTS = {
  service-a: { url: process.env.SERVICE_A_ENDPOINT, requiresAuth: true },
  service-b: { url: 'https://external-api.com/graphql', requiresAuth: false }
};

export async function POST(request: NextRequest, { params }: { params: { endpoint: string } }) {
  const config = ENDPOINTS[params.endpoint];
  if (!config) return NextResponse.json({ error: 'Unknown endpoint' }, { status: 400 });

  const body = await request.json();
  const headers = config.requiresAuth ? await getAuthHeaders(request) : { 'Content-Type': 'application/json' };

  const response = await fetch(config.url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  return NextResponse.json(await response.json());
}

// Then use in your codegen config
endpoints: {
  service-a: { gatewayEndpoint: '/api/gateway/service-a', ... },
  service-b: { gatewayEndpoint: '/api/gateway/service-b', ... }
}
```

**Benefits of Dynamic Gateway:**
- ✅ Single route handler for all GraphQL endpoints
- ✅ Centralized authentication logic
- ✅ Easy to add new endpoints without creating new files
- ✅ Consistent error handling across all endpoints
- ✅ Better maintainability and code organization

## Quick Start Summary

1. **Create a dynamic gateway**: `app/api/gateway/[endpoint]/route.ts`
2. **Configure endpoints**: Use `createCodegenConfig` with multiple endpoints
3. **Organize schemas**: Put `.schema.gql` files in endpoint-specific folders
4. **Generate code**: Run `pnpm gql`
5. **Use in components**: Import from endpoint-specific generated hooks

**Key Benefits:**
- 🌐 One gateway route handles all GraphQL endpoints
- 🔐 Centralized authentication per endpoint
- 📁 Organized schema files by service
- 🤖 Fully typed React Query hooks per endpoint
- ⚡ Easy to add new endpoints without new route files

For more detailed usage instructions, see the generated `README.md` in your app's `src/libs/gql/` directory.