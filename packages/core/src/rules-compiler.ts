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
  GraphQLField,
  isIntrospectionType
} from 'graphql';
import { getArgumentValues } from 'graphql/execution/values';

import {
  getDeepType,
  getNodeAliasOrName,
  isLeafTypeDeep,
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

export interface IExtensionsData<TRules extends RulesObject = RulesObject> {
  authz?: {
    directives: IExtensionsDirective<TRules>[];
  };
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

function getFieldConfigByAuthSchemaItem(authSchemaKey: string) {
  return function (authSchemaItem?: AuthSchema[string][string]) {
    if (!authSchemaItem) {
      return null;
    }

    const config = authSchemaItem[
      authSchemaKey as keyof typeof authSchemaItem
    ] as IAuthConfig | undefined;

    return config;
  };
}

function getConfigsByTypeAndAuthSchema(
  typeName: string,
  authSchema: AuthSchema,
  authSchemaKey: string
) {
  const config = authSchema[typeName]?.[authSchemaKey];
  return config ? [config] : [];
}

function getWildcardTypeConfigs(authSchema: AuthSchema, authSchemaKey: string) {
  const wildcardConfig = authSchema['*']?.[authSchemaKey];
  return wildcardConfig ? [wildcardConfig] : [];
}

function getConfigsByFieldAndAuthSchema(
  parentTypeName: string,
  fieldName: string,
  authSchema: AuthSchema,
  authSchemaKey: string
): IAuthConfig[] {
  const getConfig = getFieldConfigByAuthSchemaItem(authSchemaKey);

  const config = getConfig(authSchema[parentTypeName]?.[fieldName]);

  return config ? [config] : [];
}

function getWildcardFieldConfigs(
  parentTypeName: string,
  fieldName: string,
  authSchema: AuthSchema,
  authSchemaKey: string
): IAuthConfig[] {
  const getConfig = getFieldConfigByAuthSchemaItem(authSchemaKey);

  const config =
    getConfig(authSchema[parentTypeName]?.['*']) ||
    getConfig(authSchema['*']?.[fieldName]) ||
    getConfig(authSchema['*']?.['*']);

  return config ? [config] : [];
}

function getConfigsByExtensions(
  extensions:
    | ((
        | GraphQLObjectType
        | GraphQLInterfaceType
        | GraphQLField<unknown, unknown>
      )['extensions'] &
        IExtensionsData)
    | null
    | undefined,
  directiveName: string
): IAuthConfig[] {
  if (!extensions?.authz?.directives?.length) {
    return [];
  }

  const authZDirectives = extensions.authz.directives.filter(
    directive => directive.name === directiveName
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

export function hasPostExecutionRules({
  postExecutionRules: { byType, byField }
}: ICompiledRules): boolean {
  return !!Object.keys({
    ...byType,
    ...byField
  }).length;
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
      if (
        node.name.value === '__typename' ||
        !shouldIncludeNode({ variableValues: variables }, node)
      ) {
        return false;
      }

      const type = typeInfo.getType();
      const parentType = typeInfo.getParentType();

      if (parentType && isIntrospectionType(parentType)) {
        return false;
      }

      if (type && !isLeafTypeDeep(type)) {
        const deepType = getDeepType(type);

        if (isIntrospectionType(deepType)) {
          return false;
        }
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

        if (configs.length === 0) {
          const wildcardConfigs = authSchema
            ? getWildcardTypeConfigs(authSchema, authSchemaKey)
            : [];

          configs.push(...wildcardConfigs);
        }

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

        // this will occur if we are passed a field not in our schema
        if (graphqlField === undefined) {
          return undefined;
        }

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

        if (configs.length === 0) {
          const wildcardConfigs = authSchema
            ? getWildcardFieldConfigs(
                parentTypeName,
                graphqlField.name,
                authSchema,
                authSchemaKey
              )
            : [];

          configs.push(...wildcardConfigs);
        }

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
