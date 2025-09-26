import { GraphQLClient } from 'graphql-request';

export interface ClientOptions {
  /** GraphQL endpoint URL */
  endpoint: string;
  /** Default headers to include with requests */
  defaultHeaders?: Record<string, string>;
}

export function createGraphQLClient(options: ClientOptions) {
  const { endpoint, defaultHeaders = {} } = options;

  // Create GraphQL client
  const graphQLClient = new GraphQLClient(endpoint, {
    headers: defaultHeaders
  });

  return {
    client: graphQLClient,
    // Helper to get SDK when generated files are available
    getSdk: <T extends Record<string, any>>(getSdkFn: (client: GraphQLClient) => T): T => {
      return getSdkFn(graphQLClient);
    }
  };
}
