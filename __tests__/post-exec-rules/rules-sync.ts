import { PostExecutionRule } from '../../src';

class FailingPostExecRule extends PostExecutionRule {
  public execute() {
    throw this.error;
  }
}

class PassingPostExecRule extends PostExecutionRule {
  public execute() {
    return;
  }
}

class PassingPostExecRuleWithSelectionSet extends PostExecutionRule {
  public execute() {
    return;
  }

  public selectionSet = `{ comments { id text } }`;
}

class SecondPassingPostExecRule extends PostExecutionRule {
  public execute() {
    return;
  }
}

export const syncRules = {
  FailingPostExecRule,
  PassingPostExecRule,
  SecondPassingPostExecRule,
  PassingPostExecRuleWithSelectionSet
} as const;

(Object.keys(syncRules) as Array<keyof typeof syncRules>).forEach(key => {
  jest.spyOn(syncRules[key].prototype, 'execute');
});
