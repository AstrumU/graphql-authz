import {
  and,
  AndRule,
  not,
  NotRule,
  or,
  OrRule,
  postExecRule,
  PostExecutionRule,
  preExecRule,
  PreExecutionRule
} from '../../src';

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

class FailingAndRule extends AndRule {
  public getRules() {
    return [FailingPreExecRule, PassingPostExecRule];
  }
}

const FailingAndRuleFunctional = and(
  FailingPreExecRuleFunctional,
  PassingPostExecRuleFunctional
);

const failingAndRuleInline = `{
  and: [FailingPreExecRule, PassingPostExecRule]
}`;

const failingAndRuleInlineSchema = {
  and: ['FailingPreExecRule', 'PassingPostExecRule']
};

class PassingAndRule extends AndRule {
  public getRules() {
    return [PassingPreExecRule, PassingPostExecRule];
  }
}

const PassingAndRuleFunctional = and(
  PassingPreExecRuleFunctional,
  PassingPostExecRuleFunctional
);

const passingAndRuleInline = `{
  and: [PassingPreExecRule, PassingPostExecRule]
}`;

const passingAndRuleInlineSchema = {
  and: ['PassingPreExecRule', 'PassingPostExecRule']
};

class FailingOrRule extends OrRule {
  public getRules() {
    return [FailingPreExecRule, FailingPostExecRule];
  }
}

const FailingOrRuleFunctional = or(
  FailingPreExecRuleFunctional,
  FailingPostExecRuleFunctional
);

const failingOrRuleInline = `{
  or: [FailingPreExecRule, FailingPostExecRule]
}`;

const failingOrRuleInlineSchema = {
  or: ['FailingPreExecRule', 'FailingPostExecRule']
};

class PassingOrRule extends OrRule {
  public getRules() {
    return [FailingPreExecRule, PassingPostExecRule];
  }
}

const PassingOrRuleFunctional = or(
  FailingPreExecRuleFunctional,
  PassingPostExecRuleFunctional
);

const passingOrRuleInline = `{
  or: [FailingPreExecRule, PassingPostExecRule]
}`;

const passingOrRuleInlineSchema = {
  or: ['FailingPreExecRule', 'PassingPostExecRule']
};

class FailingNotRule extends NotRule {
  public getRules() {
    return [PassingPreExecRule];
  }
}

const FailingNotRuleFunctional = not(PassingPreExecRuleFunctional);

const failingNotRuleInline = `{
  not: PassingPreExecRule
}`;

const failingNotRuleInlineSchema = {
  not: 'PassingPreExecRule'
};

class PassingNotRule extends NotRule {
  public getRules() {
    return [FailingPostExecRule];
  }
}

const PassingNotRuleFunctional = not(FailingPostExecRuleFunctional);

const passingNotRuleInline = `{
  not: FailingPostExecRule
}`;

const passingNotRuleInlineSchema = {
  not: 'FailingPostExecRule'
};

class FailingDeepAndRule extends AndRule {
  public getRules() {
    return [FailingAndRule, PassingOrRule];
  }
}

const FailingDeepAndRuleFunctional = and(
  and(FailingPreExecRuleFunctional, PassingPostExecRule),
  or(FailingPreExecRuleFunctional, PassingPostExecRuleFunctional)
);

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

const failingDeepAndRuleInlineSchema = {
  and: [
    {
      and: [{ id: 'FailingPreExecRule' }, { id: 'PassingPostExecRule' }]
    },
    {
      or: [{ id: 'FailingPreExecRule' }, { id: 'PassingPostExecRule' }]
    }
  ]
};

class PassingDeepAndRule extends AndRule {
  public getRules() {
    return [PassingOrRule, PassingAndRule];
  }
}

const PassingDeepAndRuleFunctional = and(
  or(FailingPreExecRuleFunctional, PassingPostExecRuleFunctional),
  and(PassingPreExecRuleFunctional, PassingPostExecRuleFunctional)
);

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

const passingDeepAndRuleInlineSchema = {
  and: [
    {
      or: [{ id: 'FailingPreExecRule' }, { id: 'PassingPostExecRule' }]
    },
    {
      and: [{ id: 'PassingPreExecRule' }, { id: 'PassingPostExecRule' }]
    }
  ]
};

class FailingDeepOrRule extends OrRule {
  public getRules() {
    return [FailingAndRule, FailingOrRule];
  }
}

const FailingDeepOrRuleFunctional = or(
  and(FailingPreExecRuleFunctional, PassingPostExecRule),
  or(FailingPreExecRuleFunctional, FailingPostExecRuleFunctional)
);

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

const failingDeepOrRuleInlineSchema = {
  or: [
    {
      and: [{ id: 'FailingPreExecRule' }, { id: 'PassingPostExecRule' }]
    },
    {
      or: [{ id: 'FailingPreExecRule' }, { id: 'FailingPostExecRule' }]
    }
  ]
};

class PassingDeepOrRule extends OrRule {
  public getRules() {
    return [PassingAndRule, FailingOrRule];
  }
}

const PassingDeepOrRuleFunctional = or(
  and(PassingPreExecRuleFunctional, PassingPostExecRuleFunctional),
  or(FailingPreExecRuleFunctional, FailingPostExecRuleFunctional)
);

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

const passingDeepOrRuleInlineSchema = {
  or: [
    {
      and: [{ id: 'PassingPreExecRule' }, { id: 'PassingPostExecRule' }]
    },
    {
      or: [{ id: 'FailingPreExecRule' }, { id: 'FailingPostExecRule' }]
    }
  ]
};

class FailingDeepNotRule extends NotRule {
  public getRules() {
    return [PassingDeepOrRule];
  }
}

const FailingDeepNotRuleFunctional = not(
  or(
    and(PassingPreExecRuleFunctional, PassingPostExecRuleFunctional),
    or(FailingPreExecRuleFunctional, FailingPostExecRuleFunctional)
  )
);

const failingDeepNotRuleInline = `{
  not: {
    or: [
      { and: [{ id: PassingPreExecRule }, { id: PassingPostExecRule }] },
      { or: [{ id: FailingPreExecRule }, { id: FailingPostExecRule }] }
    ]
  }
}`;

const failingDeepNotRuleInlineSchema = {
  not: {
    or: [
      { and: [{ id: 'PassingPreExecRule' }, { id: 'PassingPostExecRule' }] },
      { or: [{ id: 'FailingPreExecRule' }, { id: 'FailingPostExecRule' }] }
    ]
  }
};

class PassingDeepNotRule extends NotRule {
  public getRules() {
    return [FailingDeepAndRule];
  }
}

const PassingDeepNotRuleFunctional = not(
  and(
    and(FailingPreExecRuleFunctional, PassingPostExecRuleFunctional),
    or(FailingPreExecRuleFunctional, PassingPostExecRuleFunctional)
  )
);

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

const passingDeepNotRuleInlineSchema = {
  not: {
    and: [
      {
        and: [{ id: 'FailingPreExecRule' }, { id: 'PassingPostExecRule' }]
      },
      {
        or: [{ id: 'FailingPreExecRule' }, { id: 'PassingPostExecRule' }]
      }
    ]
  }
};

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

export const functionalRules = {
  FailingPreExecRule: FailingPreExecRuleFunctional,
  PassingPreExecRule: PassingPreExecRuleFunctional,
  FailingPostExecRule: FailingPostExecRuleFunctional,
  PassingPostExecRule: PassingPostExecRuleFunctional,
  FailingAndRule: FailingAndRuleFunctional,
  PassingAndRule: PassingAndRuleFunctional,
  FailingOrRule: FailingOrRuleFunctional,
  PassingOrRule: PassingOrRuleFunctional,
  FailingNotRule: FailingNotRuleFunctional,
  PassingNotRule: PassingNotRuleFunctional,
  FailingDeepAndRule: FailingDeepAndRuleFunctional,
  PassingDeepAndRule: PassingDeepAndRuleFunctional,
  FailingDeepOrRule: FailingDeepOrRuleFunctional,
  PassingDeepOrRule: PassingDeepOrRuleFunctional,
  FailingDeepNotRule: FailingDeepNotRuleFunctional,
  PassingDeepNotRule: PassingDeepNotRuleFunctional
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

export const inlineSchemaRules = {
  failingAndRuleInlineSchema,
  passingAndRuleInlineSchema,
  failingOrRuleInlineSchema,
  passingOrRuleInlineSchema,
  failingNotRuleInlineSchema,
  passingNotRuleInlineSchema,
  failingDeepAndRuleInlineSchema,
  passingDeepAndRuleInlineSchema,
  failingDeepOrRuleInlineSchema,
  passingDeepOrRuleInlineSchema,
  failingDeepNotRuleInlineSchema,
  passingDeepNotRuleInlineSchema
};
