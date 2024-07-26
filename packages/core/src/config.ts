import {
  AuthSchema,
  InternalAuthSchema,
} from './auth-schema';
import { RulesObject } from './rules';
import { processError as defaultProcessError } from './process-error';
import { isDefined, RequireAllExcept } from './helpers';

export interface IAuthZConfig {
  rules: RulesObject;
  directiveName?: string;
  /** Default: `__authz`. Always should matches with a rules key wrapper in `authSchema`. @see `__authz` param in {@link AuthSchema}.  */
  authSchemaKey?: string;
  /** @see {@link AuthSchema} */
  authSchema?: AuthSchema;
  processError?: (error: unknown) => never;
}

type CompleteIAuthzConfig = RequireAllExcept<IAuthZConfig, 'authSchema'>;
function fillConfigWithDefaultValues({
  rules,
  authSchema,
  directiveName = 'authz',
  authSchemaKey = '__authz',
  processError = defaultProcessError,
}: IAuthZConfig): CompleteIAuthzConfig {
  return { rules, authSchema, authSchemaKey, processError, directiveName };
}

function verifyThatAllAuthSchemaRulesAreRegistered(
  rules: RulesObject,
  authSchema: InternalAuthSchema,
): void {
  authSchema.getAllRuleConfigs()
    .flatMap(ruleConfig => ruleConfig.rules ?? [])
    .forEach((ruleName: string) => {
      if (!(ruleName in rules)) {
        const availableRules = Object.keys(rules).join(', ');
        throw new Error(
          `Rule ${ruleName} is not found! Your registered rules are: ${availableRules}`
        );
      }
    });
}

/**
 * Fills out all missed configuration properties with a default values and perform a validation of `authSchema`.
 */
export function completeConfig(config: IAuthZConfig): CompleteIAuthzConfig {
  const completedConfig = fillConfigWithDefaultValues(config);
  const authSchema = InternalAuthSchema.createIfCan(completedConfig.authSchemaKey, completedConfig.authSchema);
  if (isDefined(authSchema)) {
    verifyThatAllAuthSchemaRulesAreRegistered(completedConfig.rules, authSchema);
  }

  return completedConfig;
}
