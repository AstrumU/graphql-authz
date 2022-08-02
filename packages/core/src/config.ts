import { AuthSchema } from './auth-schema';
import { RulesObject } from './rules';
import { processError as defaultProcessError } from './process-error';

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

  if (config.authSchema) {
    // Check if rules in authSchema actually exist in rules definition
    for (const typeName in config.authSchema) {
      const typeRuleDefinitions = config.authSchema[typeName];
      if ('__authz' in typeRuleDefinitions) {
        // check type level rules
        //@ts-ignore
        const ruleNames = typeRuleDefinitions.__authz?.rules;
        if(!ruleNames) {
          console.warn('unexpected shape of authSchema for type ' + typeName);
          continue
        }
        let ruleName: string
        for (ruleName of ruleNames as string[]) {
          if (!(ruleName in config.rules)) {
            throw new Error(`Rule ${ruleName} not found in rules`);
          }
        }
      } else {
        // check field level rules
        for (const fieldName in typeRuleDefinitions) {
          //@ts-ignore
          const ruleNames = typeRuleDefinitions[fieldName].__authz.rules;
          let ruleName: string
          for (ruleName of ruleNames) {
            if (!(ruleName in config.rules)) {
              throw new Error(`Rule ${ruleName} not found in rules`);
            }
          }
        }
      }
    }
  }

  return {
    directiveName: 'authz',
    authSchemaKey: '__authz',
    processError: defaultProcessError,
    ...config
  };
}
