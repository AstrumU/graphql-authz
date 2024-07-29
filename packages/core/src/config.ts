import {
  AuthSchema,
  InternalAuthSchema,
} from './auth-schema';
import { RulesObject } from './rules';
import { processError as defaultProcessError } from './process-error';
import { isDefined, RequireAllExcept } from './helpers';
import isEmpty from 'lodash.isempty';

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
  const allUsedRules = authSchema.getAllRuleConfigs().flatMap(ruleConfig => ruleConfig.rules ?? [])
  const notRegisteredRules = allUsedRules.filter((ruleName: string) => !(ruleName in rules));
  if (!isEmpty(notRegisteredRules)) {
    const registeredRules = Object.keys(rules);
    throw new Error(`Rules ${String(notRegisteredRules)} are not found! Registered rules are: ${String(registeredRules)}`);
  }
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
