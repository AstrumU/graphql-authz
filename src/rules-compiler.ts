import _ from 'lodash';
import {
  FieldNode,
  DirectiveNode,
  visitWithTypeInfo,
  TypeInfo,
  visit,
  DocumentNode,
  GraphQLSchema,
  ArgumentNode,
  isUnionType
} from 'graphql';
import { getArgumentValues } from 'graphql/execution/values';

import {
  getDeepType,
  getNodeAliasOrName,
  shouldIncludeNode
} from './graphql-utils';

import {
  extractExecutableRules,
  PostExecutionRule,
  PreExecutionRule,
  RulesObject
} from './rules';
import {
  composeCompositeRule,
  composeDeepCompositeRule,
  composeSimpleRule,
  composeWithAndIfNeeded
} from './rules-composer';

export interface ICompiledRules {
  preExecutionRules: PreExecutionRule[];
  postExecutionRules: {
    byType: Record<string, PostExecutionRule[]>;
    byField: Record<string, Record<string, PostExecutionRule[]>>;
    executionPromises: Array<Promise<void>>;
  };
}

function getExecutableRulesByASTNode(
  astNode: { directives?: readonly DirectiveNode[] | undefined },
  rules: RulesObject,
  directiveName: string,
  fieldArgs: Record<string, unknown>
) {
  if (!(astNode && astNode.directives)) {
    return [];
  }
  const authZDirectives = astNode.directives.filter(
    directive => directive.name.value === directiveName
  );

  return authZDirectives.flatMap(authZDirective => {
    if (!authZDirective.arguments) {
      throw new Error(`No arguments found in @${directiveName}`);
    }

    const argumentsByName = _.groupBy(
      authZDirective.arguments,
      ({ name: { value } }) => value
    ) as Record<
      'rules' | 'compositeRules' | 'deepCompositeRules',
      Array<ArgumentNode | undefined>
    >;

    const {
      rules: [rulesArgument] = [],
      compositeRules: [compositeRulesArgument] = [],
      deepCompositeRules: [deepCompositeRulesArgument] = []
    } = argumentsByName;

    if (
      !(rulesArgument || compositeRulesArgument || deepCompositeRulesArgument)
    ) {
      throw new Error(
        `@${directiveName} directive requires at least one of the following arguments to be provided: rules, compositeRules, deepCompositeRules`
      );
    }

    const simpleRule = rulesArgument && composeSimpleRule(rules, rulesArgument);

    const compositeRule =
      compositeRulesArgument &&
      composeCompositeRule(rules, compositeRulesArgument);

    const deepCompositeRule =
      deepCompositeRulesArgument &&
      composeDeepCompositeRule(rules, deepCompositeRulesArgument);

    const ruleClasses = _.compact([
      simpleRule,
      compositeRule,
      deepCompositeRule
    ]);

    const RuleCls = composeWithAndIfNeeded(ruleClasses);
    const rule = new RuleCls({ fieldArgs });
    return extractExecutableRules([rule]);
  });
}

export function compileRules(
  ast: DocumentNode,
  schema: GraphQLSchema,
  rules: RulesObject,
  variables: Record<string, unknown>,
  directiveName: string
): ICompiledRules {
  const compiledRules: ICompiledRules = {
    preExecutionRules: [],
    postExecutionRules: {
      byType: {},
      byField: {},
      executionPromises: []
    }
  };

  const typeInfo = new TypeInfo(schema);
  const typeInfoVisitor = visitWithTypeInfo(typeInfo, {
    Field(node: FieldNode) {
      if (!shouldIncludeNode({ variableValues: variables }, node)) {
        return false;
      }

      const type = typeInfo.getType();
      const parentType = typeInfo.getParentType();

      if (type) {
        const deepType = getDeepType(type);
        const astNode = deepType.astNode;

        if (astNode) {
          const executableRules = getExecutableRulesByASTNode(
            astNode,
            rules,
            directiveName,
            {}
          );

          const rulesByType = compiledRules.postExecutionRules.byType;
          const typeName = astNode.name.value;

          executableRules.forEach(rule => {
            if (rule instanceof PreExecutionRule) {
              compiledRules.preExecutionRules.push(rule);
            } else if (rule instanceof PostExecutionRule) {
              rulesByType[typeName] = rulesByType[typeName] || [];
              rulesByType[typeName].push(rule);
            }
          });
        }
      }

      if (parentType && parentType.astNode && !isUnionType(parentType)) {
        const parentAstNode = parentType.astNode;
        const fieldDefinition = parentAstNode.fields?.find(
          ({ name: { value } }) => value === node.name.value
        );
        if (fieldDefinition) {
          const graphqlField =
            parentType.getFields()[fieldDefinition.name.value];

          const fieldArgs = getArgumentValues(graphqlField, node, variables);
          const executableRules = getExecutableRulesByASTNode(
            fieldDefinition,
            rules,
            directiveName,
            fieldArgs
          );

          const fieldName = getNodeAliasOrName(node);
          const rulesByField = compiledRules.postExecutionRules.byField;
          const parentTypeName = parentAstNode.name.value;

          executableRules.forEach(rule => {
            if (rule instanceof PreExecutionRule) {
              compiledRules.preExecutionRules.push(rule);
            } else if (rule instanceof PostExecutionRule) {
              rulesByField[parentTypeName] = rulesByField[parentTypeName] || {};
              rulesByField[parentTypeName][fieldName] =
                rulesByField[parentTypeName][fieldName] || [];

              rulesByField[parentTypeName][fieldName].push(rule);
            }
          });
        }
      }
      return undefined;
    }
  });

  visit(ast, typeInfoVisitor);

  return compiledRules;
}
