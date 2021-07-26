import { preExecRule, PreExecutionRule } from '../../src';

class FailingPreExecRule extends PreExecutionRule {
  public async execute() {
    await new Promise((resolve, reject) => {
      setTimeout(() => reject(this.error), 200);
    });
  }
}

const FailingPreExecRuleFunctional = preExecRule()(async () => {
  await new Promise<void>(resolve => {
    setTimeout(() => resolve(), 200);
  });
  return false;
});

class PassingPreExecRule extends PreExecutionRule {
  public async execute() {
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 200);
    });
  }
}

const PassingPreExecRuleFunctional = preExecRule()(async () => {
  await new Promise<void>(resolve => {
    setTimeout(() => resolve(), 200);
  });
});

export const asyncRules = {
  FailingPreExecRule,
  PassingPreExecRule
} as const;

export const asyncFunctionalRules = {
  FailingPreExecRule: FailingPreExecRuleFunctional,
  PassingPreExecRule: PassingPreExecRuleFunctional
} as const;

(Object.keys(asyncRules) as Array<keyof typeof asyncRules>).forEach(key => {
  jest.spyOn(asyncRules[key].prototype, 'execute');
});

(
  Object.keys(asyncFunctionalRules) as Array<keyof typeof asyncFunctionalRules>
).forEach(key => {
  jest.spyOn(asyncFunctionalRules[key].prototype, 'execute');
});
