import {
  DocumentNode,
  FragmentDefinitionNode,
  getNullableType,
  TypeInfo,
  visitWithTypeInfo,
  visit,
  GraphQLSchema
} from 'graphql';

import { getDeepType } from './graphql-utils';
import { ResultInfo } from './result-info';
import { PostExecutionRule } from './rules';
import { ICompiledRules } from './rules-compiler';
import { visitWithResultInfo } from './visit-with-result-info';

type PostExecRuleExecutor = (
  resultInfo: ResultInfo,
  typeInfo: TypeInfo
) => void;

function executePostExecRule(
  rule: PostExecutionRule,
  rules: ICompiledRules,
  context: unknown,
  resultInfo: ResultInfo
) {
  const result = rule.execute(
    context,
    rule.config.fieldArgs,
    resultInfo.getValue(),
    resultInfo.getParentValue(),
    resultInfo.getPathFromRoot()
  );
  if (result instanceof Promise) {
    // TODO: find better way to collect promises
    rules.postExecutionRules.executionPromises.push(result);
  }
}

function executePostExecRulesForType(
  resultInfo: ResultInfo,
  typeInfo: TypeInfo,
  context: unknown,
  rules: ICompiledRules
) {
  const type = typeInfo.getType();
  const key = resultInfo.getKey();
  // if in array - get type of item else get type of list
  const unwrappedType =
    type &&
    (typeof key === 'number' ? getDeepType(type) : getNullableType(type));
  const parentType = typeInfo.getParentType();
  const typeName =
    unwrappedType && 'name' in unwrappedType && unwrappedType.name;
  const parentTypeName = parentType && parentType.name;

  const {
    postExecutionRules: { byType: rulesByType, byField: rulesByField }
  } = rules;

  if (typeName && typeName in rulesByType) {
    rulesByType[typeName].forEach(rule =>
      executePostExecRule(rule, rules, context, resultInfo)
    );
  }

  if (parentTypeName && parentTypeName in rulesByField) {
    if (key && key in rulesByField[parentTypeName]) {
      rulesByField[parentTypeName][key].forEach(rule =>
        executePostExecRule(rule, rules, context, resultInfo)
      );
    }
  }
}

function getPostExecRulesExecutor(
  context: unknown,
  rules: ICompiledRules
): PostExecRuleExecutor {
  return function (resultInfo: ResultInfo, typeInfo: TypeInfo) {
    return executePostExecRulesForType(resultInfo, typeInfo, context, rules);
  };
}

interface IExecutePostExecRulesParams {
  context: unknown;
  schema: GraphQLSchema;
  resultData: unknown;
  document: DocumentNode;
  rules: ICompiledRules;
  fragmentDefinitions: FragmentDefinitionNode[];
  variables: Record<string, unknown>;
}

export function executePostExecRules({
  context,
  schema,
  resultData,
  document,
  rules,
  fragmentDefinitions,
  variables
}: IExecutePostExecRulesParams): Promise<boolean | void>[] {
  if (!resultData) {
    return [];
  }
  const typeInfo = new TypeInfo(schema);
  const resultInfo = new ResultInfo(resultData);
  const typeInfoVisitor = visitWithTypeInfo(
    typeInfo,
    visitWithResultInfo(
      resultInfo,
      typeInfo,
      fragmentDefinitions,
      variables,
      getPostExecRulesExecutor(context, rules)
    )
  );
  visit(document, typeInfoVisitor);
  return rules.postExecutionRules.executionPromises;
}
