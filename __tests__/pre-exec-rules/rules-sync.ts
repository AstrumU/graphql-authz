import { preExecRule, PreExecutionRule } from '@graphql-authz/core';

class FailingPreExecRule extends PreExecutionRule {
  public execute() {
    throw this.error;
  }
}

const FailingPreExecRuleFunctional = preExecRule()(() => false);

class PassingPreExecRule extends PreExecutionRule {
  public execute() {
    return;
  }
}

const PassingPreExecRuleFunctional = preExecRule()(() => true);

export const syncRules = {
  FailingPreExecRule,
  PassingPreExecRule
} as const;

export const syncFunctionalRules = {
  FailingPreExecRule: FailingPreExecRuleFunctional,
  PassingPreExecRule: PassingPreExecRuleFunctional
} as const;

(Object.keys(syncRules) as Array<keyof typeof syncRules>).forEach(key => {
  jest.spyOn(syncRules[key].prototype, 'execute');
});

(
  Object.keys(syncFunctionalRules) as Array<keyof typeof syncFunctionalRules>
).forEach(key => {
  jest.spyOn(syncFunctionalRules[key].prototype, 'execute');
});
