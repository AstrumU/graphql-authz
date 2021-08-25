export enum RuleType {
  preExec = 'preExec',
  postExec = 'postExec',
  composite = 'composite'
}

export enum CompositionOperator {
  or = 'or',
  and = 'and',
  not = 'not'
}

export type InstantiableRule = new (config: IRuleConfig) => Rule;
export type RulesObject = Record<string, InstantiableRule>;

export interface IRuleConfig {
  fieldArgs: Record<string, unknown>;
}

export function extractExecutableRules(rules: Rule[]): ExecutableRule[] {
  const executableRules: ExecutableRule[] = [];

  rules.forEach(rule => {
    if (rule instanceof ExecutableRule) {
      executableRules.push(rule);
    } else if (rule instanceof CompositeRule) {
      executableRules.push(...extractExecutableRules(rule.ruleInstances));
    }
  });

  return executableRules;
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized!') {
    super(message);
  }
}

export abstract class Rule {
  abstract type: RuleType;

  public abstract readonly config: IRuleConfig;
}

export abstract class ExecutableRule extends Rule {
  abstract execute(
    context: unknown,
    fieldArgs: Record<string, unknown>,
    ...args: unknown[]
  ): void | Promise<void> | boolean | Promise<boolean>;

  public error: UnauthorizedError = new UnauthorizedError();

  public notError: UnauthorizedError = new UnauthorizedError();

  public wrapExecutor<RuleClass extends ExecutableRule>(
    wrapper: (
      execute: RuleClass['execute'],
      ...args: Parameters<RuleClass['execute']>
    ) => void | Promise<void>
  ): void {
    const originalExecutor = this.execute;
    this.execute = (...args: Parameters<RuleClass['execute']>) =>
      wrapper(originalExecutor, ...args);
  }

  constructor(public readonly config: IRuleConfig) {
    super();
    // TODO: get rid of bind
    // and store originalExecutor in instance and call it from instance (this.originalExecutor())
    this.execute = this.execute.bind(this);

    // wrap executor to treat `return false` as fail
    this.wrapExecutor(async (execute, ...args) => {
      const ruleResult = await execute(...args);
      if (ruleResult === false) {
        throw this.error;
      }
    });
  }
}

export abstract class CompositeRule extends Rule {
  abstract operator: CompositionOperator;

  abstract getRules(): Array<InstantiableRule>;

  abstract wrapRules(ruleInstances: Rule[]): void;

  protected errors: Array<{
    error: UnauthorizedError;
    path: string | null;
  }> = [];

  protected countErrors(pathToCount: string | null): number {
    // counting all pre-exec errors (path === null) and post-exec errors of same path
    return this.errors.filter(
      ({ path }) => path === null || path === pathToCount
    ).length;
  }

  public ruleInstances: Rule[];

  public type = RuleType.composite;

  constructor(public readonly config: IRuleConfig) {
    super();
    this.ruleInstances = this.getRules().map(Rule => new Rule(config));
    this.wrapRules(this.ruleInstances);
  }
}

export abstract class PreExecutionRule extends ExecutableRule {
  abstract execute(
    context: unknown,
    fieldArgs: Record<string, unknown>
  ): void | Promise<void> | boolean | Promise<boolean>;

  public type = RuleType.preExec;
}

export abstract class PostExecutionRule extends ExecutableRule {
  abstract execute(
    context: unknown,
    fieldArgs: Record<string, unknown>,
    value: unknown,
    parentValue: unknown,
    path: string
  ): void | Promise<void> | boolean | Promise<boolean>;

  public type = RuleType.postExec;

  public selectionSet?: string;
}

export abstract class AndRule extends CompositeRule {
  public operator = CompositionOperator.and;

  public wrapRules(ruleInstances: Rule[]): void {
    ruleInstances.forEach(ruleInstance => {
      if (ruleInstance instanceof ExecutableRule) {
        ruleInstance.wrapExecutor(async (execute, ...args) => {
          const path = (args[4] || null) as string | null;
          try {
            if (!this.countErrors(path)) {
              await execute(...args);
            }
          } catch (error) {
            if (!(error instanceof UnauthorizedError)) {
              throw error;
            }
            this.errors.push({
              error,
              path
            });
            if (this.countErrors(path) === 1) {
              throw this.errors[0].error;
            }
          }
        });
      } else if (ruleInstance instanceof CompositeRule) {
        this.wrapRules(ruleInstance.ruleInstances);
      }
    });
  }
}

export abstract class OrRule extends CompositeRule {
  public operator = CompositionOperator.or;

  public wrapRules(ruleInstances: Rule[]): void {
    ruleInstances.forEach(ruleInstance => {
      if (ruleInstance instanceof ExecutableRule) {
        ruleInstance.wrapExecutor(async (execute, ...args) => {
          const path = (args[4] || null) as string | null;
          try {
            // TODO: don't execute rules if one of direct children (executable or composite) reported success
            // TODO: report success and errors via Promises. each rule (executable or composite) should store promise of rule's state
            await execute(...args);
          } catch (error) {
            if (!(error instanceof UnauthorizedError)) {
              throw error;
            }
            this.errors.push({
              error,
              path
            });
            if (this.countErrors(path) >= this.ruleInstances.length) {
              throw new UnauthorizedError(
                this.errors.map(({ error }) => error.message).join('\n')
              );
            }
          }
        });
      } else if (ruleInstance instanceof CompositeRule) {
        this.wrapRules(ruleInstance.ruleInstances);
      }
    });
  }
}

export abstract class NotRule extends CompositeRule {
  public operator = CompositionOperator.not;

  constructor(config: IRuleConfig) {
    super(config);
    this.executableRules = extractExecutableRules(this.ruleInstances);
  }

  private executableRules: ExecutableRule[];

  private successes: Array<{
    path: string | null;
  }> = [];

  private countSuccesses(pathToCount: string | null) {
    // counting all pre-exec successes (path === null) and post-exec successes of same path
    return this.successes.filter(
      ({ path }) => path === null || path === pathToCount
    ).length;
  }

  public wrapRules(ruleInstances: Rule[]): void {
    ruleInstances.forEach(ruleInstance => {
      if (ruleInstance instanceof ExecutableRule) {
        ruleInstance.wrapExecutor(async (execute, ...args) => {
          const path = (args[4] || null) as string | null;
          let isErrorCaught = false;
          try {
            // TODO: don't execute rules if error from some executable rule was caught here
            await execute(...args);
            this.successes.push({ path });
          } catch (error) {
            isErrorCaught = true;
            if (!(error instanceof UnauthorizedError)) {
              throw error;
            }
          }
          if (
            !isErrorCaught &&
            this.countSuccesses(path) >= this.executableRules.length
          ) {
            throw ruleInstance.notError;
          }
        });
      } else if (ruleInstance instanceof CompositeRule) {
        this.wrapRules(ruleInstance.ruleInstances);
      }
    });
  }
}
