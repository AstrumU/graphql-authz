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
import { AuthSchema } from './auth-schema';
import { IAuthConfig } from './auth-config';

export interface IExtensionsDirective<
  TRules extends RulesObject = RulesObject
> {
  name: string;
  arguments: IAuthConfig<TRules>;
}

export interface ICompiledRules {
  preExecutionRules: PreExecutionRule[];
  postExecutionRules: {
    byType: Record<string, PostExecutionRule[]>;
    byField: Record<string, Record<string, PostExecutionRule[]>>;
    executionPromises: Array<Promise<void | boolean>>;
  };
}

interface ICompilerParams {
  document: DocumentNode;
  schema: GraphQLSchema;
  rules: RulesObject;
  variables: Record<string, unknown>;
  directiveName: string;
  authSchemaKey: string;
  authSchema?: AuthSchema;
}

function getConfigsByTypeAndAuthSchema(
  typeName: string,
  authSchema: AuthSchema,
  authSchemaKey: string
) {
  const config = authSchema[typeName]?.[authSchemaKey];
  return config ? [config] : [];
}

function getConfigsByFieldAndAuthSchema(
  parentTypeName: string,
  fieldName: string,
  authSchema: AuthSchema,
  authSchemaKey: string
): IAuthConfig[] {
  const fieldSchema = authSchema[parentTypeName]?.[fieldName];

  const config =
    fieldSchema &&
    authSchemaKey in fieldSchema &&
    (fieldSchema[authSchemaKey as keyof typeof fieldSchema] as IAuthConfig);

  return config ? [config] : [];
}

function getConfigsByExtensions(
  extensions: (
    | GraphQLObjectType
    | GraphQLInterfaceType
    | GraphQLField<unknown, unknown>
  )['extensions'],
  directiveName: string
): IAuthConfig[] {
  if (!extensions?.authz?.directives?.length) {
    return [];
  }

  const authZDirectives: IExtensionsDirective[] =
    extensions.authz.directives.filter(
      (directive: IExtensionsDirective) => directive.name === directiveName
    );

  return authZDirectives.map(authZDirective => {
    if (!authZDirective.arguments) {
      throw new Error(`No arguments found in @${directiveName}`);
    }

    const { rules, compositeRules, deepCompositeRules } =
      authZDirective.arguments;

    if (!(rules || compositeRules || deepCompositeRules)) {
      throw new Error(
        `@${directiveName} directive requires at least one of the following arguments to be provided: rules, compositeRules, deepCompositeRules`
      );
    }

    return {
      rules,
      compositeRules,
      deepCompositeRules
    };
  });
}

function getExecutableRulesByConfigs(
  configs: IAuthConfig[],
  rules: RulesObject,
  fieldArgs: Record<string, unknown>
) {
  return configs.flatMap(config => {
    const {
      rules: rulesConfig,
      compositeRules: compositeRulesConfig,
      deepCompositeRules: deepCompositeRulesConfig
    } = config;

    const simpleRule = rulesConfig && composeSimpleRule(rules, rulesConfig);

    const compositeRule =
      compositeRulesConfig && composeCompositeRule(rules, compositeRulesConfig);

    const deepCompositeRule =
      deepCompositeRulesConfig &&
      composeDeepCompositeRule(rules, deepCompositeRulesConfig);

    const ruleClasses = [simpleRule, compositeRule, deepCompositeRule].filter(
      (item): item is Exclude<typeof item, undefined> => !!item
    );

    const RuleCls = composeWithAndIfNeeded(ruleClasses);
    const rule = new RuleCls({ fieldArgs });
    return extractExecutableRules([rule]);
  });
}

export function compileRules({
  document,
  schema,
  rules,
  variables,
  directiveName,
  authSchemaKey,
  authSchema
}: ICompilerParams): ICompiledRules {
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
        const extensionsConfigs = getConfigsByExtensions(
          deepType.extensions,
          directiveName
        );
        const authSchemaConfigs = authSchema
          ? getConfigsByTypeAndAuthSchema(
              deepType.name,
              authSchema,
              authSchemaKey
            )
          : [];

        const configs = [...extensionsConfigs, ...authSchemaConfigs];

        const executableRules = getExecutableRulesByConfigs(configs, rules, {});

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
        const parentTypeName = parentType.name;
        const graphqlField = parentType.getFields()[node.name.value];

        const fieldArgs = getArgumentValues(graphqlField, node, variables);

        const extensionsConfigs = getConfigsByExtensions(
          graphqlField.extensions,
          directiveName
        );

        const authSchemaConfigs = authSchema
          ? getConfigsByFieldAndAuthSchema(
              parentTypeName,
              graphqlField.name,
              authSchema,
              authSchemaKey
            )
          : [];

        const configs = [...extensionsConfigs, ...authSchemaConfigs];

        const executableRules = getExecutableRulesByConfigs(
          configs,
          rules,
          fieldArgs
        );

        const fieldName = getNodeAliasOrName(node);
        const rulesByField = compiledRules.postExecutionRules.byField;

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

  visit(document, typeInfoVisitor);

  return compiledRules;
}
