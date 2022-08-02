import { AuthSchema } from './auth-schema';
import { RulesObject } from './rules';
import { processError as defaultProcessError } from './process-error';
import { IAuthConfig } from './auth-config';

export interface IAuthZConfig {
  rules: RulesObject;
  directiveName?: string;
  authSchemaKey?: string;
  authSchema?: AuthSchema;
  processError?: (error: unknown) => never;
}

export function completeConfig(
  config: IAuthZConfig
): Omit<Required<IAuthZConfig>, 'authSchema'> & { authSchema?: AuthSchema } {

  const resultConfig = {
    directiveName: 'authz',
    authSchemaKey: '__authz',
    processError: defaultProcessError,
    ...config
  };

  if (config.authSchema) {
    // Check if rules in authSchema actually exist in rules definition
    const authSchemaRules = [] as (IAuthConfig<RulesObject> | string[] | undefined)[];

    // get all rules from authSchema into list
    for (const typeName in config.authSchema) {
      const typeRuleDefinitions = config.authSchema[typeName];
      if (resultConfig.authSchemaKey in typeRuleDefinitions) {
        // type level rules
        authSchemaRules.push(typeRuleDefinitions[resultConfig.authSchemaKey]?.rules);
      } else {
        // field level rules
        for (const fieldName in typeRuleDefinitions ) {
          const fieldRuleDefinitions = typeRuleDefinitions[fieldName] as Record<string, IAuthConfig<RulesObject>>;
          if (resultConfig.authSchemaKey in fieldRuleDefinitions) {
             authSchemaRules.push(fieldRuleDefinitions[resultConfig.authSchemaKey]?.rules);
          }
        }
      }
    }

    // check if all rules in authSchema actually exist in config.rules definition
    for (const authSchemaRule of authSchemaRules) {
      if (!authSchemaRule || !Array.isArray(authSchemaRule)) {
        continue;
      }
      let ruleName: string;
      for (ruleName of authSchemaRule) {
        if (!(ruleName in config.rules)) {
          throw new Error(`Rule ${ruleName} not found in rules`);
        }
      }
    }

  }

  return resultConfig;
}
