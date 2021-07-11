import {
  AndRule,
  NotRule,
  OrRule,
  PostExecutionRule,
  PreExecutionRule
} from '../../src';

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

class FailingAndRule extends AndRule {
  public getRules() {
    return [FailingPreExecRule, PassingPostExecRule];
  }
}

const failingAndRuleInline = `{
  and: [FailingPreExecRule, PassingPostExecRule]
}`;

class PassingAndRule extends AndRule {
  public getRules() {
    return [PassingPreExecRule, PassingPostExecRule];
  }
}

const passingAndRuleInline = `{
  and: [PassingPreExecRule, PassingPostExecRule]
}`;

class FailingOrRule extends OrRule {
  public getRules() {
    return [FailingPreExecRule, FailingPostExecRule];
  }
}

const failingOrRuleInline = `{
  or: [FailingPreExecRule, FailingPostExecRule]
}`;

class PassingOrRule extends OrRule {
  public getRules() {
    return [FailingPreExecRule, PassingPostExecRule];
  }
}

const passingOrRuleInline = `{
  or: [FailingPreExecRule, PassingPostExecRule]
}`;

class FailingNotRule extends NotRule {
  public getRules() {
    return [PassingPreExecRule];
  }
}

const failingNotRuleInline = `{
  not: PassingPreExecRule
}`;

class PassingNotRule extends NotRule {
  public getRules() {
    return [FailingPostExecRule];
  }
}

const passingNotRuleInline = `{
  not: FailingPostExecRule
}`;

class FailingDeepAndRule extends AndRule {
  public getRules() {
    return [FailingAndRule, PassingOrRule];
  }
}

const failingDeepAndRuleInline = `{
  and: [
    {
      and: [{ id: FailingPreExecRule }, { id: PassingPostExecRule }]
    },
    {
      or: [{ id: FailingPreExecRule }, { id: PassingPostExecRule }]
    }
  ]
}`;

class PassingDeepAndRule extends AndRule {
  public getRules() {
    return [PassingOrRule, PassingAndRule];
  }
}

const passingDeepAndRuleInline = `{
  and: [
    {
      or: [{ id: FailingPreExecRule }, { id: PassingPostExecRule }]
    },
    {
      and: [{ id: PassingPreExecRule }, { id: PassingPostExecRule }]
    }
  ]
}`;

class FailingDeepOrRule extends OrRule {
  public getRules() {
    return [FailingAndRule, FailingOrRule];
  }
}

const failingDeepOrRuleInline = `{
  or: [
    {
      and: [{ id: FailingPreExecRule }, { id: PassingPostExecRule }]
    },
    {
      or: [{ id: FailingPreExecRule }, { id: FailingPostExecRule }]
    }
  ]
}`;

class PassingDeepOrRule extends OrRule {
  public getRules() {
    return [PassingAndRule, FailingOrRule];
  }
}

const passingDeepOrRuleInline = `{
  or: [
    {
      and: [{ id: PassingPreExecRule }, { id: PassingPostExecRule }]
    },
    {
      or: [{ id: FailingPreExecRule }, { id: FailingPostExecRule }]
    }
  ]
}`;

class FailingDeepNotRule extends NotRule {
  public getRules() {
    return [PassingDeepOrRule];
  }
}

const failingDeepNotRuleInline = `{
  not: {
    or: [
      { and: [{ id: PassingPreExecRule }, { id: PassingPostExecRule }] },
      { or: [{ id: FailingPreExecRule }, { id: FailingPostExecRule }] }
    ]
  }
}`;

class PassingDeepNotRule extends NotRule {
  public getRules() {
    return [FailingDeepAndRule];
  }
}

const passingDeepNotRuleInline = `{
  not: {
    and: [
      {
        and: [{ id: FailingPreExecRule }, { id: PassingPostExecRule }]
      },
      {
        or: [{ id: FailingPreExecRule }, { id: PassingPostExecRule }]
      }
    ]
  }
}`;

export const rules = {
  FailingPreExecRule,
  PassingPreExecRule,
  FailingPostExecRule,
  PassingPostExecRule,
  FailingAndRule,
  PassingAndRule,
  FailingOrRule,
  PassingOrRule,
  FailingNotRule,
  PassingNotRule,
  FailingDeepAndRule,
  PassingDeepAndRule,
  FailingDeepOrRule,
  PassingDeepOrRule,
  FailingDeepNotRule,
  PassingDeepNotRule
} as const;

export const inlineRules = {
  failingAndRuleInline,
  passingAndRuleInline,
  failingOrRuleInline,
  passingOrRuleInline,
  failingNotRuleInline,
  passingNotRuleInline,
  failingDeepAndRuleInline,
  passingDeepAndRuleInline,
  failingDeepOrRuleInline,
  passingDeepOrRuleInline,
  failingDeepNotRuleInline,
  passingDeepNotRuleInline
};
