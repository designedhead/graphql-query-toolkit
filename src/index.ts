// Main exports for @repo/portal-query package

// Re-export commonly used types from dependencies
export type { CodegenConfig } from '@graphql-codegen/cli';
export type { QueryClient } from '@tanstack/react-query';
export type { ClientOptions } from './core/client.js';
export { createGraphQLClient } from './core/client.js';
export type { CodegenOptions, EndpointConfig } from './core/codegen.js';
// Core functionality exports
export { createCodegenConfig } from './core/codegen.js';
export type {
  QueryKeyFactory,
  UtilsConfig
} from './core/utils.js';
export { createQueryKeys, createUtilsFactory, createUtilsHook } from './core/utils.js';
// Setup script export
export { setupGraphQLStructure } from './scripts/setup.js';
