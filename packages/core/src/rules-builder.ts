import {
  AndRule,
  InstantiableRule,
  IRuleConfig,
  NotRule,
  OrRule,
  PostExecutionRule,
  PreExecutionRule,
  UnauthorizedError
} from './rules';

interface IPreExecRuleOptions {
  error?: string | UnauthorizedError;
  notError?: string | UnauthorizedError;
}

interface IPostExecRuleOptions extends IPreExecRuleOptions {
  selectionSet?: string;
}

function prepareError(error?: string | UnauthorizedError): UnauthorizedError {
  return error instanceof UnauthorizedError
    ? error
    : new UnauthorizedError(error);
}

export function preExecRule(
  options: IPreExecRuleOptions = {}
): (
  execute: PreExecutionRule['execute']
) => new (config: IRuleConfig) => PreExecutionRule {
  const { error, notError } = options;

  return function (execute: PreExecutionRule['execute']) {
    class BuiltRule extends PreExecutionRule {
      public error = prepareError(error);

      public notError = prepareError(notError);

      public execute(...args: Parameters<PreExecutionRule['execute']>) {
        return execute(...args);
      }
    }

    return BuiltRule;
  };
}

export function postExecRule(
  options: IPostExecRuleOptions = {}
): (
  execute: PostExecutionRule['execute']
) => new (config: IRuleConfig) => PostExecutionRule {
  const { error, notError, selectionSet } = options;

  return function (execute: PostExecutionRule['execute']) {
    class BuiltRule extends PostExecutionRule {
      public error = prepareError(error);

      public notError = prepareError(notError);

      public selectionSet = selectionSet;

      public execute(...args: Parameters<PostExecutionRule['execute']>) {
        return execute(...args);
      }
    }

    return BuiltRule;
  };
}

export function and(
  ...rules: InstantiableRule[]
): new (config: IRuleConfig) => AndRule {
  class BuiltRule extends AndRule {
    public getRules() {
      return [...rules];
    }
  }

  return BuiltRule;
}

export function or(
  ...rules: InstantiableRule[]
): new (config: IRuleConfig) => OrRule {
  class BuiltRule extends OrRule {
    public getRules() {
      return [...rules];
    }
  }

  return BuiltRule;
}

export function not(
  ...rules: InstantiableRule[]
): new (config: IRuleConfig) => NotRule {
  class BuiltRule extends NotRule {
    public getRules() {
      return [...rules];
    }
  }

  return BuiltRule;
}
