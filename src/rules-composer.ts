import _ from 'lodash';
import { ArgumentNode, ObjectFieldNode, ValueNode } from 'graphql';

import {
  assertEnumValueNode,
  assertObjectValueNode,
  getValueNodes
} from './graphql-utils';
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

function composeSimpleSubRule(
  rules: RulesObject,
  valueNode: ValueNode
): InstantiableRule {
  const enumValueNode = assertEnumValueNode(valueNode);
  const ruleName = enumValueNode.value;
  return rules[ruleName];
}

export function composeSimpleRule(
  rules: RulesObject,
  rulesArgument: ArgumentNode
): InstantiableRule {
  const valueNodes = getValueNodes(rulesArgument.value);

  const nestedRules = valueNodes.map(valueNode =>
    composeSimpleSubRule(rules, valueNode)
  );

  return composeWithAndIfNeeded(nestedRules);
}

function composeCompositeSubRule(
  rules: RulesObject,
  fieldNode: ObjectFieldNode,
  CompositeRuleCls: typeof AndRule | typeof OrRule | typeof NotRule
): InstantiableRule {
  const valueNodes = getValueNodes(fieldNode.value);
  const classes = valueNodes.map(n => rules[assertEnumValueNode(n).value]);

  return createInlineCompositeRule(CompositeRuleCls, classes);
}

export function composeCompositeRule(
  rules: RulesObject,
  compositeRulesArgument: ArgumentNode
): InstantiableRule {
  const valueNodes = getValueNodes(compositeRulesArgument.value);

  const nestedRules = valueNodes.flatMap(valueNode => {
    const objectValueNode = assertObjectValueNode(valueNode);
    const fieldsByName = _.groupBy(
      objectValueNode.fields,
      ({ name: { value } }) => value
    ) as Record<'and' | 'or' | 'not', Array<ObjectFieldNode | undefined>>;

    const {
      and: [andFieldNode] = [],
      or: [orFieldNode] = [],
      not: [notFieldNode] = []
    } = fieldsByName;

    const andRule =
      andFieldNode && composeCompositeSubRule(rules, andFieldNode, AndRule);

    const orRule =
      orFieldNode && composeCompositeSubRule(rules, orFieldNode, OrRule);

    const notRule =
      notFieldNode && composeCompositeSubRule(rules, notFieldNode, NotRule);

    return _.compact([andRule, orRule, notRule]);
  });

  return composeWithAndIfNeeded(nestedRules);
}

function composeDeepCompositeSubRule(
  rules: RulesObject,
  fieldNode: ObjectFieldNode,
  CompositeRuleCls: typeof AndRule | typeof OrRule | typeof NotRule
): InstantiableRule {
  const valueNodes = getValueNodes(fieldNode.value);
  const classes = valueNodes.flatMap(n =>
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    processValueNodeRecursive(rules, assertObjectValueNode(n))
  );

  return createInlineCompositeRule(CompositeRuleCls, classes);
}

function processValueNodeRecursive(
  rules: RulesObject,
  node: ValueNode
): InstantiableRule[] {
  const objectValueNode = assertObjectValueNode(node);

  const fieldsByName = _.groupBy(
    objectValueNode.fields,
    ({ name: { value } }) => value
  ) as Record<'and' | 'or' | 'not' | 'id', Array<ObjectFieldNode | undefined>>;

  const {
    and: [andFieldNode] = [],
    or: [orFieldNode] = [],
    not: [notFieldNode] = [],
    id: [idFieldNode] = []
  } = fieldsByName;

  const andRule =
    andFieldNode && composeDeepCompositeSubRule(rules, andFieldNode, AndRule);

  const orRule =
    orFieldNode && composeDeepCompositeSubRule(rules, orFieldNode, OrRule);

  const notRule =
    notFieldNode && composeDeepCompositeSubRule(rules, notFieldNode, NotRule);

  const idRule = idFieldNode && composeSimpleSubRule(rules, idFieldNode.value);

  return _.compact([andRule, orRule, notRule, idRule]);
}

export function composeDeepCompositeRule(
  rules: RulesObject,
  deepCompositeRulesArgument: ArgumentNode
): InstantiableRule {
  const valueNodes = getValueNodes(deepCompositeRulesArgument.value);

  const nestedRules = valueNodes.flatMap(valueNode =>
    processValueNodeRecursive(rules, valueNode)
  );

  return composeWithAndIfNeeded(nestedRules);
}
