import { postExecRule, PostExecutionRule } from '@graphql-authz/core';

class FailingPostExecRule extends PostExecutionRule {
  public async execute() {
    await new Promise((resolve, reject) => {
      setTimeout(() => reject(this.error), 200);
    });
  }
}

const FailingPostExecRuleFunctional = postExecRule()(async () => {
  await new Promise<void>(resolve => {
    setTimeout(() => resolve(), 200);
  });
  return false;
});

class PassingPostExecRule extends PostExecutionRule {
  public async execute() {
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 200);
    });
  }
}

const PassingPostExecRuleFunctional = postExecRule()(async () => {
  await new Promise<void>(resolve => {
    setTimeout(() => resolve(), 200);
  });
});

class PassingPostExecRuleWithSelectionSet extends PostExecutionRule {
  public async execute() {
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 200);
    });
  }

  public selectionSet = `{ comments { id text } }`;
}

const PassingPostExecRuleFunctionalWithSelectionSet = postExecRule({
  selectionSet: `{ comments { id text } }`
})(async () => {
  await new Promise<void>(resolve => {
    setTimeout(() => resolve(), 200);
  });
});

class SecondPassingPostExecRule extends PostExecutionRule {
  public async execute() {
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 200);
    });
  }
}

const SecondPassingPostExecRuleFunctional = postExecRule()(async () => {
  await new Promise<void>(resolve => {
    setTimeout(() => resolve(), 200);
  });
});

export const asyncRules = {
  FailingPostExecRule,
  PassingPostExecRule,
  PassingPostExecRuleWithSelectionSet,
  SecondPassingPostExecRule
} as const;

export const asyncFunctionalRules = {
  FailingPostExecRule: FailingPostExecRuleFunctional,
  PassingPostExecRule: PassingPostExecRuleFunctional,
  PassingPostExecRuleWithSelectionSet:
    PassingPostExecRuleFunctionalWithSelectionSet,
  SecondPassingPostExecRule: SecondPassingPostExecRuleFunctional
} as const;

(Object.keys(asyncRules) as Array<keyof typeof asyncRules>).forEach(key => {
  jest.spyOn(asyncRules[key].prototype, 'execute');
});

(
  Object.keys(asyncFunctionalRules) as Array<keyof typeof asyncFunctionalRules>
).forEach(key => {
  jest.spyOn(asyncFunctionalRules[key].prototype, 'execute');
});
