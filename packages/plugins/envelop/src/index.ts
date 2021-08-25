import { Plugin } from '@envelop/types';
import { IAuthZConfig, wrapExecuteFn } from '@graphql-authz/core';

export function authZEnvelopPlugin(config: IAuthZConfig): Plugin {
  return {
    onExecute({ executeFn, setExecuteFn }: any) {
      setExecuteFn(wrapExecuteFn(executeFn, config));
    }
  };
}
