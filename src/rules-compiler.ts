import _ from 'lodash';
import {
  FieldNode,
  visitWithTypeInfo,
  TypeInfo,
  visit,
  DocumentNode,
  GraphQLSchema,
  isUnionType,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLField
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
import { IExtensionsDirective } from './authz-directive';

export interface ICompiledRules {
  preExecutionRules: PreExecutionRule[];
  postExecutionRules: {
    byType: Record<string, PostExecutionRule[]>;
    byField: Record<string, Record<string, PostExecutionRule[]>>;
    executionPromises: Array<Promise<void>>;
  };
}

function getExecutableRulesByExtensions(
  extensions: (
    | GraphQLObjectType
    | GraphQLInterfaceType
    | GraphQLField<unknown, unknown>
  )['extensions'],
  rules: RulesObject,
  directiveName: string,
  fieldArgs: Record<string, unknown>
) {
  if (!extensions?.authz?.directives?.length) {
    return [];
  }

  const authZDirectives: IExtensionsDirective[] =
    extensions.authz.directives.filter(
      (directive: IExtensionsDirective) => directive.name === directiveName
    );

  return authZDirectives.flatMap(authZDirective => {
    if (!authZDirective.arguments) {
      throw new Error(`No arguments found in @${directiveName}`);
    }

    const {
      rules: rulesArgument,
      compositeRules: compositeRulesArgument,
      deepCompositeRules: deepCompositeRulesArgument
    } = authZDirective.arguments;

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
        const executableRules = getExecutableRulesByExtensions(
          deepType.extensions,
          rules,
          directiveName,
          {}
        );

        const rulesByType = compiledRules.postExecutionRules.byType;
        const typeName = deepType.name;

        executableRules.forEach(rule => {
          if (rule instanceof PreExecutionRule) {
            compiledRules.preExecutionRules.push(rule);
          } else if (rule instanceof PostExecutionRule) {
            rulesByType[typeName] = rulesByType[typeName] || [];
            rulesByType[typeName].push(rule);
          }
        });
      }

      if (parentType && !isUnionType(parentType)) {
        const graphqlField = parentType.getFields()[node.name.value];

        const fieldArgs = getArgumentValues(graphqlField, node, variables);
        const executableRules = getExecutableRulesByExtensions(
          graphqlField.extensions,
          rules,
          directiveName,
          fieldArgs
        );

        const fieldName = getNodeAliasOrName(node);
        const rulesByField = compiledRules.postExecutionRules.byField;
        const parentTypeName = parentType.name;

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
      return undefined;
    }
  });

  visit(ast, typeInfoVisitor);

  return compiledRules;
}
