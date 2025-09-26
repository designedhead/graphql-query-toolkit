const { visit } = require('graphql');
const fs = require('node:fs');
const path = require('node:path');

/**
 * GraphQL Code Generator plugin to generate tRPC-like cache utilities
 * Automatically extracts operations and creates utils structure with proper TypeScript types
 */
module.exports = {
  plugin: (schema, documents, config) => {
    const operations = [];
    const groups = {};

    // Extract operations from documents
    documents.forEach((doc) => {
      visit(doc.document, {
        OperationDefinition: {
          enter: (node) => {
            if (node.name) {
              const operationName = node.name.value;
              operations.push(operationName);

              // Group by service/domain based on operation name patterns
              const serviceName = extractServiceName(operationName);
              if (serviceName) {
                if (!groups[serviceName]) {
                  groups[serviceName] = [];
                }
                groups[serviceName].push(operationName);
              }
            }
          }
        }
      });
    });

    // Load the handlebars template
    const templatePath = path.join(__dirname, 'cache-utils.template.hbs');
    const template = fs.readFileSync(templatePath, 'utf8');

    const Handlebars = require('handlebars');

    // Register helper for camelCase conversion
    Handlebars.registerHelper('camelCase', (str) => {
      return str.charAt(0).toLowerCase() + str.slice(1);
    });

    // Register helper for PascalCase conversion
    Handlebars.registerHelper('pascalCase', (str) => {
      if (!str) return '';
      return String(str)
        .replace(/(^|[^a-zA-Z0-9]+)([a-zA-Z0-9])/g, (_, __, c) => c.toUpperCase())
        .replace(/[^a-zA-Z0-9]/g, '');
    });

    // Register helper for extracting operation name from full name
    Handlebars.registerHelper('extractOpName', (fullName) => {
      return extractShortName(fullName);
    });

    // Register helper for generating variable type
    Handlebars.registerHelper('variableType', (operationName) => {
      return `ReactQueryTypes.${operationName}QueryVariables`;
    });

    // Register helper for query result type
    Handlebars.registerHelper('queryType', (operationName) => {
      return `ReactQueryTypes.${operationName}Query`;
    });

    const compiledTemplate = Handlebars.compile(template);

    return compiledTemplate({
      operations,
      groups,
      hasOperations: operations.length > 0,
      hasGroups: Object.keys(groups).length > 0,
      serviceName: config && config.serviceName ? config.serviceName : undefined
    });
  }
};

/**
 * Extract service name from operation name
 * GetNotificationServiceApps -> notifications
 * GetUserProfile -> users
 */
function extractServiceName(operationName) {
  // Common patterns
  const patterns = [
    { pattern: /^Get(\w+)Service/, transform: (match) => match[1].toLowerCase() + 's' }, // GetNotificationService... -> notifications
    { pattern: /^(\w+)Service/, transform: (match) => match[1].toLowerCase() + 's' }, // NotificationService... -> notifications
    { pattern: /^Get(\w+)/, transform: (match) => match[1].toLowerCase() + 's' }, // GetUser... -> users
    { pattern: /^Create(\w+)/, transform: (match) => match[1].toLowerCase() + 's' }, // CreateUser... -> users
    { pattern: /^Update(\w+)/, transform: (match) => match[1].toLowerCase() + 's' }, // UpdateUser... -> users
    { pattern: /^Delete(\w+)/, transform: (match) => match[1].toLowerCase() + 's' } // DeleteUser... -> users
  ];

  for (const { pattern, transform } of patterns) {
    const match = operationName.match(pattern);
    if (match) {
      const serviceName = transform(match);
      return serviceName;
    }
  }

  // Default grouping
  return 'general';
}

/**
 * Extract short operation name for method names
 * GetNotificationServiceApps -> getApps
 * GetNotificationServiceGetCategories -> getCategories
 */
function extractShortName(operationName) {
  // Remove common prefixes and convert to camelCase
  let shortName = operationName;

  // Handle specific notification service patterns
  if (operationName.includes('NotificationService')) {
    shortName = operationName.replace(/^(Get|Create|Update|Delete)NotificationService/, '').replace(/^Get/, ''); // Remove additional Get prefix if present
  } else {
    // Handle general patterns
    shortName = operationName
      .replace(/^(Get|Create|Update|Delete)/, '')
      .replace(/Service/, '')
      .replace(/^User/, '')
      .replace(/^Booking/, '');
  }

  // Convert to camelCase
  return 'get' + shortName;
}
