import { postExecRule, PostExecutionRule } from '../../src';

class FailingPostExecRule extends PostExecutionRule {
  public execute() {
    throw this.error;
  }
}

const FailingPostExecRuleFunctional = postExecRule()(() => false);

class PassingPostExecRule extends PostExecutionRule {
  public execute() {
    return;
  }
}

const PassingPostExecRuleFunctional = postExecRule()(() => true);

class PassingPostExecRuleWithSelectionSet extends PostExecutionRule {
  public execute() {
    return;
  }

  public selectionSet = `{ comments { id text } }`;
}

const PassingPostExecRuleFunctionalWithSelectionSet = postExecRule({
  selectionSet: `{ comments { id text } }`
})(() => true);

class SecondPassingPostExecRule extends PostExecutionRule {
  public execute() {
    return;
  }
}

const SecondPassingPostExecRuleFunctional = postExecRule()(() => true);

export const syncRules = {
  FailingPostExecRule,
  PassingPostExecRule,
  SecondPassingPostExecRule,
  PassingPostExecRuleWithSelectionSet
} as const;

export const syncFunctionalRules = {
  FailingPostExecRule: FailingPostExecRuleFunctional,
  PassingPostExecRule: PassingPostExecRuleFunctional,
  SecondPassingPostExecRule: SecondPassingPostExecRuleFunctional,
  PassingPostExecRuleWithSelectionSet:
    PassingPostExecRuleFunctionalWithSelectionSet
} as const;

(Object.keys(syncRules) as Array<keyof typeof syncRules>).forEach(key => {
  jest.spyOn(syncRules[key].prototype, 'execute');
});

(
  Object.keys(syncFunctionalRules) as Array<keyof typeof syncFunctionalRules>
).forEach(key => {
  jest.spyOn(syncFunctionalRules[key].prototype, 'execute');
});
