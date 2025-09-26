import { type QueryClient, useQueryClient } from '@tanstack/react-query';

export interface QueryKeyFactory {
  [key: string]: (variables?: any) => string[];
}

export interface UtilsConfig {
  queryKeys: QueryKeyFactory;
  groups: Record<string, string[]>; // group name -> operation names
}

export function createQueryKeys(operations: string[]): QueryKeyFactory {
  const keys: QueryKeyFactory = {};

  for (const operationName of operations) {
    keys[operationName] = (variables?: any) => (variables === undefined ? [operationName] : [operationName, variables]);
  }

  return keys;
}

export function createUtilsFactory(config: UtilsConfig) {
  const { queryKeys, groups } = config;

  return function createUtils(queryClient: QueryClient) {
    const utils: Record<string, any> = {};

    // Create utils for each group
    for (const [groupName, operationNames] of Object.entries(groups)) {
      utils[groupName] = {};

      for (const operationName of operationNames) {
        const camelCaseName = operationName.charAt(0).toLowerCase() + operationName.slice(1);

        utils[groupName][camelCaseName] = {
          /**
           * Invalidates all queries for this operation
           */
          invalidate: async (filters?: Record<string, any>) => {
            if (filters && Object.keys(filters).length > 0) {
              await queryClient.invalidateQueries({
                queryKey: [operationName],
                predicate: (query) => {
                  const variables = query.queryKey[1] as Record<string, any> | undefined;
                  return Object.entries(filters).every(([key, value]) => variables?.[key] === value);
                }
              });
            } else {
              await queryClient.invalidateQueries({
                queryKey: [operationName]
              });
            }
          },

          /**
           * Refetch all queries for this operation
           */
          refetch: async (filters?: Record<string, any>) => {
            if (filters && Object.keys(filters).length > 0) {
              await queryClient.refetchQueries({
                queryKey: [operationName],
                predicate: (query) => {
                  const variables = query.queryKey[1] as Record<string, any> | undefined;
                  return Object.entries(filters).every(([key, value]) => variables?.[key] === value);
                }
              });
            } else {
              await queryClient.refetchQueries({
                queryKey: [operationName]
              });
            }
          },

          /**
           * Get cached data for this operation
           */
          getData: (variables?: any) => {
            return queryClient.getQueryData(queryKeys[operationName](variables));
          },

          /**
           * Set data for this operation
           */
          setData: (data: any | ((old: any) => any), variables?: any) => {
            queryClient.setQueryData(queryKeys[operationName](variables), data);
          },

          /**
           * Cancel any outgoing requests for this operation
           */
          cancel: async (filters?: Record<string, any>) => {
            if (filters && Object.keys(filters).length > 0) {
              await queryClient.cancelQueries({
                queryKey: [operationName],
                predicate: (query) => {
                  const variables = query.queryKey[1] as Record<string, any> | undefined;
                  return Object.entries(filters).every(([key, value]) => variables?.[key] === value);
                }
              });
            } else {
              await queryClient.cancelQueries({
                queryKey: [operationName]
              });
            }
          }
        };
      }
    }

    return utils;
  };
}

export function createUtilsHook(utilsFactory: (queryClient: QueryClient) => any) {
  return function useUtils() {
    const queryClient = useQueryClient();
    return utilsFactory(queryClient);
  };
}
