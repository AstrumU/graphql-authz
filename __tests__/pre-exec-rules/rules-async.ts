import { PreExecutionRule } from '../../src';

class FailingPreExecRule extends PreExecutionRule {
  public async execute() {
    await new Promise((resolve, reject) => {
      setTimeout(() => reject(this.error), 200);
    });
  }
}

class PassingPreExecRule extends PreExecutionRule {
  public async execute() {
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 200);
    });
  }
}

export const asyncRules = {
  FailingPreExecRule,
  PassingPreExecRule
} as const;

(Object.keys(asyncRules) as Array<keyof typeof asyncRules>).forEach(key => {
  jest.spyOn(asyncRules[key].prototype, 'execute');
});
