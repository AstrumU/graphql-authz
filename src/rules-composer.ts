import {
  ICompositeRulesConfigItem,
  IDeepCompositeRulesConfigItem
} from './auth-config';
import {
  AndRule,
  InstantiableRule,
  IRuleConfig,
  NotRule,
  OrRule,
  RulesObject,
  RuleType
} from './rules';

function createInlineCompositeRule(
  CompositeRuleCls: typeof AndRule | typeof OrRule | typeof NotRule,
  rulesToCompose: Array<InstantiableRule>
): InstantiableRule {
  class InlineCompositeRule extends CompositeRuleCls {
    constructor(public readonly config: IRuleConfig) {
      super(config);
    }

    public type = RuleType.composite;

    public getRules() {
      return rulesToCompose;
    }
  }
  return InlineCompositeRule;
}

export function composeWithAndIfNeeded(
  rules: Array<InstantiableRule>
): InstantiableRule {
  if (rules.length === 1) {
    return rules[0];
  }

  return createInlineCompositeRule(AndRule, rules);
}

export function composeSimpleRule(
  rules: RulesObject,
  rulesArgument: string[]
): InstantiableRule {
  const nestedRules = rulesArgument.map(ruleName => rules[ruleName]);
  return composeWithAndIfNeeded(nestedRules);
}

function composeCompositeSubRule(
  rules: RulesObject,
  subRuleName: string | string[],
  CompositeRuleCls: typeof AndRule | typeof OrRule | typeof NotRule
): InstantiableRule {
  const classes = [subRuleName].flat().map(ruleName => rules[ruleName]);

  return createInlineCompositeRule(CompositeRuleCls, classes);
}

export function composeCompositeRule(
  rules: RulesObject,
  compositeRulesArgument: ICompositeRulesConfigItem[]
): InstantiableRule {
  const nestedRules = compositeRulesArgument.flatMap(
    compositeRulesArgumentItem => {
      const {
        and: andRuleNames,
        or: orRuleNames,
        not: notRuleName
      } = compositeRulesArgumentItem;

      const andRule =
        andRuleNames && composeCompositeSubRule(rules, andRuleNames, AndRule);

      const orRule =
        orRuleNames && composeCompositeSubRule(rules, orRuleNames, OrRule);

      const notRule =
        notRuleName && composeCompositeSubRule(rules, notRuleName, NotRule);

      return [andRule, orRule, notRule].filter(
        (item): item is Exclude<typeof item, undefined | ''> => !!item
      );
    }
  );

  return composeWithAndIfNeeded(nestedRules);
}

function composeDeepCompositeSubRule(
  rules: RulesObject,
  deepCompositeRulesArgumentItem:
    | IDeepCompositeRulesConfigItem
    | IDeepCompositeRulesConfigItem[],
  CompositeRuleCls: typeof AndRule | typeof OrRule | typeof NotRule
): InstantiableRule {
  const classes = [deepCompositeRulesArgumentItem]
    .flat()
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    .flatMap(item => processRulesArgumentItemRecursive(rules, item));

  return createInlineCompositeRule(CompositeRuleCls, classes);
}

function processRulesArgumentItemRecursive(
  rules: RulesObject,
  rulesArgumentItem: IDeepCompositeRulesConfigItem
): InstantiableRule[] {
  const {
    and: andRuleDefinition,
    or: orRuleDefinition,
    not: notRuleDefinition,
    id: idRuleName
  } = rulesArgumentItem;

  const andRule =
    andRuleDefinition &&
    composeDeepCompositeSubRule(rules, andRuleDefinition, AndRule);

  const orRule =
    orRuleDefinition &&
    composeDeepCompositeSubRule(rules, orRuleDefinition, OrRule);

  const notRule =
    notRuleDefinition &&
    composeDeepCompositeSubRule(rules, notRuleDefinition, NotRule);

  const idRule = idRuleName && rules[idRuleName];

  return [andRule, orRule, notRule, idRule].filter(
    (item): item is Exclude<typeof item, undefined | ''> => !!item
  );
}

export function composeDeepCompositeRule(
  rules: RulesObject,
  deepCompositeRulesArgument: IDeepCompositeRulesConfigItem[]
): InstantiableRule {
  const nestedRules = deepCompositeRulesArgument.flatMap(
    deepCompositeRulesArgumentItem =>
      processRulesArgumentItemRecursive(rules, deepCompositeRulesArgumentItem)
  );

  return composeWithAndIfNeeded(nestedRules);
}
