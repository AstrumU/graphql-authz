import { PostExecutionRule } from '../../src';

class FailingPostExecRule extends PostExecutionRule {
  public async execute() {
    await new Promise((resolve, reject) => {
      setTimeout(() => reject(this.error), 200);
    });
  }
}

class PassingPostExecRule extends PostExecutionRule {
  public async execute() {
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 200);
    });
  }
}

class PassingPostExecRuleWithSelectionSet extends PostExecutionRule {
  public async execute() {
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 200);
    });
  }

  public selectionSet = `{ comments { id text } }`;
}

class SecondPassingPostExecRule extends PostExecutionRule {
  public async execute() {
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 200);
    });
  }
}

export const asyncRules = {
  FailingPostExecRule,
  PassingPostExecRule,
  PassingPostExecRuleWithSelectionSet,
  SecondPassingPostExecRule
} as const;

(Object.keys(asyncRules) as Array<keyof typeof asyncRules>).forEach(key => {
  jest.spyOn(asyncRules[key].prototype, 'execute');
});
