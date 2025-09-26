const { printSchema, parse, visit } = require('graphql');
const fs = require('fs');
const path = require('path');

/**
 * GraphQL Code Generator plugin to generate a comprehensive README
 * based on the actual GraphQL operations in the app
 */
module.exports = {
  plugin: (schema, documents, config) => {
    const operations = [];
    const mutations = [];
    const subscriptions = [];
    const groups = {};

    // Extract operations from documents
    documents.forEach((doc) => {
      visit(doc.document, {
        OperationDefinition: {
          enter: (node) => {
            if (node.name) {
              const operationName = node.name.value;
              const operationType = node.operation;

              // Categorize by operation type
              if (operationType === 'query') {
                operations.push(operationName);
              } else if (operationType === 'mutation') {
                mutations.push(operationName);
              } else if (operationType === 'subscription') {
                subscriptions.push(operationName);
              }

              // Group by service/domain
              const serviceName = extractServiceName(operationName);
              if (serviceName) {
                if (!groups[serviceName]) {
                  groups[serviceName] = { queries: [], mutations: [], subscriptions: [] };
                }
                groups[serviceName][
                  operationType === 'query' ? 'queries' : operationType === 'mutation' ? 'mutations' : 'subscriptions'
                ].push(operationName);
              }
            }
          }
        }
      });
    });

    // Load the handlebars template
    const templatePath = path.join(__dirname, 'readme-generator.template.hbs');
    const template = fs.readFileSync(templatePath, 'utf8');

    const Handlebars = require('handlebars');

    // Register helper for extracting operation name from full name
    Handlebars.registerHelper('extractOpName', (fullName) => {
      return extractShortName(fullName);
    });

    // Register helper for camelCase conversion
    Handlebars.registerHelper('camelCase', (str) => {
      return str.charAt(0).toLowerCase() + str.slice(1);
    });

    // Register helper for generating hook import example
    Handlebars.registerHelper('hookName', (operationName, operationType) => {
      const prefix = operationType === 'mutation' ? 'use' : 'use';
      const suffix = operationType === 'mutation' ? 'Mutation' : 'Query';
      return `${prefix}${operationName}${suffix}`;
    });

    // Register helper for checking if array has items
    Handlebars.registerHelper('hasItems', (array) => {
      return array && array.length > 0;
    });

    // Register helper for getting first item of array
    Handlebars.registerHelper('first', (array) => {
      return array && array.length > 0 ? array[0] : '';
    });

    // Register helper for greater than comparison
    Handlebars.registerHelper('gt', (a, b) => {
      return a > b;
    });

    // Register helper for getting array length
    Handlebars.registerHelper('len', (array) => {
      return array ? array.length : 0;
    });

    // Register helper for kebab-case conversion
    Handlebars.registerHelper('kebabCase', (str) => {
      return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    });

    // Register helper for current timestamp
    Handlebars.registerHelper('now', () => {
      return new Date().toISOString().split('T')[0];
    });

    // Register helper for app name from config
    const appName = config.appName || 'your app';
    const endpoints = config.endpoints || [];
    const isMultiEndpoint = config.isMultiEndpoint || false;

    // Register helper for PascalCase conversion
    Handlebars.registerHelper('pascalCase', (str) => {
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    const compiledTemplate = Handlebars.compile(template);

    return compiledTemplate({
      appName,
      operations,
      mutations,
      subscriptions,
      groups,
      hasOperations: operations.length > 0,
      hasMutations: mutations.length > 0,
      hasSubscriptions: subscriptions.length > 0,
      hasGroups: Object.keys(groups).length > 0,
      totalOperations: operations.length + mutations.length + subscriptions.length,
      endpoints,
      isMultiEndpoint
    });
  }
};

/**
 * Extract service name from operation name
 * GetNotificationServiceApps -> notifications
 */
function extractServiceName(operationName) {
  const patterns = [
    { pattern: /^Get(\w+)Service/, transform: (match) => match[1].toLowerCase() + 's' },
    { pattern: /^(\w+)Service/, transform: (match) => match[1].toLowerCase() + 's' },
    { pattern: /^Get(\w+)/, transform: (match) => match[1].toLowerCase() + 's' },
    { pattern: /^Create(\w+)/, transform: (match) => match[1].toLowerCase() + 's' },
    { pattern: /^Update(\w+)/, transform: (match) => match[1].toLowerCase() + 's' },
    { pattern: /^Delete(\w+)/, transform: (match) => match[1].toLowerCase() + 's' }
  ];

  for (const { pattern, transform } of patterns) {
    const match = operationName.match(pattern);
    if (match) {
      let serviceName = transform(match);
      if (serviceName === 'notifications') return 'notifications';
      if (serviceName === 'users') return 'users';
      if (serviceName === 'bookings') return 'bookings';
      return serviceName;
    }
  }

  return 'general';
}

/**
 * Extract short operation name for method names
 */
function extractShortName(operationName) {
  let shortName = operationName;

  if (operationName.includes('NotificationService')) {
    shortName = operationName.replace(/^(Get|Create|Update|Delete)NotificationService/, '').replace(/^Get/, '');
  } else {
    shortName = operationName
      .replace(/^(Get|Create|Update|Delete)/, '')
      .replace(/Service/, '')
      .replace(/^User/, '')
      .replace(/^Booking/, '');
  }

  return 'get' + shortName;
}
