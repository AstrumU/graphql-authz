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
  error?: Error;
  notError?: Error;
}

interface IPostExecRuleOptions extends IPreExecRuleOptions {
  selectionSet?: string;
}

export function preExecRule(
  options: IPreExecRuleOptions = {}
): (
  execute: PreExecutionRule['execute']
) => new (config: IRuleConfig) => PreExecutionRule {
  const {
    error = new UnauthorizedError(),
    notError = new UnauthorizedError()
  } = options;

  return function (execute: PreExecutionRule['execute']) {
    class BuiltRule extends PreExecutionRule {
      public error = error;

      public notError = notError;

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
  const {
    error = new UnauthorizedError(),
    notError = new UnauthorizedError(),
    selectionSet
  } = options;

  return function (execute: PostExecutionRule['execute']) {
    class BuiltRule extends PostExecutionRule {
      public error = error;

      public notError = notError;

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
