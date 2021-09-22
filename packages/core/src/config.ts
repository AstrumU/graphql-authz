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
  return {
    directiveName: 'authz',
    authSchemaKey: '__authz',
    processError: defaultProcessError,
    ...config
  };
}
