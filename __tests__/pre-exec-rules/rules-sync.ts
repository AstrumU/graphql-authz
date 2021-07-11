import { PreExecutionRule } from '../../src';

class FailingPreExecRule extends PreExecutionRule {
  public execute() {
    throw this.error;
  }
}

class PassingPreExecRule extends PreExecutionRule {
  public execute() {
    return;
  }
}

export const syncRules = {
  FailingPreExecRule,
  PassingPreExecRule
} as const;

(Object.keys(syncRules) as Array<keyof typeof syncRules>).forEach(key => {
  jest.spyOn(syncRules[key].prototype, 'execute');
});
