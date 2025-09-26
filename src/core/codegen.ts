import type { CodegenConfig } from '@graphql-codegen/cli';
import dotenv from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface EndpointConfig {
  /** GraphQL schema URL or introspection */
  schema: string;
  /** API headers for schema introspection */
  headers?: Record<string, string>;
  /** Directory for schema files (relative to project root) */
  documentsPath: string;
  /** Gateway endpoint for fetcher */
  gatewayEndpoint: string;
}

export interface CodegenOptions {
  /** Configuration for each endpoint */
  endpoints: {
    [endpointName: string]: EndpointConfig;
  };
  /** Base output directory for generated files */
  baseOutputDir?: string;
  /** React Query version */
  reactQueryVersion?: number;
  /** App name for documentation generation */
  appName?: string;
}

export function createCodegenConfig(options: CodegenOptions): CodegenConfig {
  // Load environment variables
  dotenv.config();

  const { endpoints, baseOutputDir = 'src/libs/gql/__gen__', reactQueryVersion = 5, appName = 'your app' } = options;

  // Create generates config for each endpoint
  const generates: Record<string, any> = {};

  Object.entries(endpoints).forEach(([name, config]) => {
    const outputDir = `${baseOutputDir}/${name}`;
    const pluginsDirectory = `${outputDir}/plugins`;

    // Client preset for each endpoint
    generates[`${outputDir}/`] = {
      preset: 'client',
      schema: { [config.schema]: { headers: config.headers || {} } },
      documents: [config.documentsPath]
    };

    // GraphQL Request plugin
    generates[`${pluginsDirectory}/graphql-request.ts`] = {
      schema: { [config.schema]: { headers: config.headers || {} } },
      documents: [config.documentsPath],
      plugins: ['typescript', 'typescript-operations', 'typescript-graphql-request']
    };

    // React Query plugin with endpoint-specific fetcher
    generates[`${pluginsDirectory}/react-query.ts`] = {
      schema: { [config.schema]: { headers: config.headers || {} } },
      documents: [config.documentsPath],
      plugins: ['typescript', 'typescript-operations', 'typescript-react-query'],
      config: {
        fetcher: `
          function fetcher<TData, TVariables>(query: string, variables?: TVariables, options?: { customHeaders?: Record<string, string>; endpoint?: string } | Record<string, string>) {
            return async (): Promise<TData> => {
              let customHeaders: Record<string, string> = {};
              let endpoint = "${config.gatewayEndpoint}";

              if (options) {
                if ('customHeaders' in options || 'endpoint' in options) {
                  customHeaders = (options as any).customHeaders || {};
                  endpoint = (options as any).endpoint || "${config.gatewayEndpoint}";
                } else {
                  customHeaders = options as Record<string, string>;
                }
              }

              const headers = {
                'Content-Type': 'application/json',
                ...customHeaders,
              };

              const res = await fetch(endpoint, {
                method: "POST",
                headers,
                body: JSON.stringify({ query, variables }),
              });

              const json = await res.json();

              if (json.errors) {
                const { message } = json.errors[0];
                throw message;
              }

              return json.data;
            }
          }
        `,
        reactQueryVersion,
        exposeQueryKeys: true,
        exposeMutationKeys: true,
        exposeDocument: true,
        exposeFetcher: true,
        addSuspenseQuery: true,
        addInfiniteQuery: true,
        rawRequest: false,
        dedupeFragments: true,
        errorType: 'string'
      }
    };

    // Cache utils for each endpoint
    generates[`${outputDir}/cache-utils.ts`] = {
      schema: { [config.schema]: { headers: config.headers || {} } },
      documents: [config.documentsPath],
      plugins: [join(__dirname, '../plugins/cache-utils.plugin.cjs')],
      config: { serviceName: name }
    };
  });

  // Generate a single README for all endpoints (use first endpoint's schema as placeholder)
  const firstEndpoint = Object.values(endpoints)[0];
  const endpointNames = Object.keys(endpoints);

  if (firstEndpoint) {
    generates[`${baseOutputDir}/../README.md`] = {
      schema: { [firstEndpoint.schema]: { headers: firstEndpoint.headers || {} } },
      plugins: [join(__dirname, '../plugins/readme-generator.plugin.cjs')],
      config: {
        appName: endpointNames.length ? `${appName} (Multi-endpoint: ${endpointNames.join(', ')})` : appName,
        endpoints: endpointNames,
        isMultiEndpoint: !!endpointNames.length
      }
    };
  }

  return {
    ignoreNoDocuments: true,
    generates
  };
}
