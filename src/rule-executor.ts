import { GraphQLRequestContext } from 'apollo-server-plugin-base';
import { getNullableType, TypeInfo } from 'graphql';

import { getDeepType } from './graphql-utils';
import { ResultInfo } from './result-info';
import { PostExecutionRule } from './rules';
import { ICompiledRules } from './rules-compiler';

type PostExecRuleExecutor = (
  resultInfo: ResultInfo,
  typeInfo: TypeInfo
) => void;

function executePostExecRule(
  rule: PostExecutionRule,
  rules: ICompiledRules,
  requestContext: GraphQLRequestContext,
  resultInfo: ResultInfo
) {
  const result = rule.execute(
    requestContext,
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

function executePostExecRules(
  resultInfo: ResultInfo,
  typeInfo: TypeInfo,
  requestContext: GraphQLRequestContext,
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
      executePostExecRule(rule, rules, requestContext, resultInfo)
    );
  }

  if (parentTypeName && parentTypeName in rulesByField) {
    if (key && key in rulesByField[parentTypeName]) {
      rulesByField[parentTypeName][key].forEach(rule =>
        executePostExecRule(rule, rules, requestContext, resultInfo)
      );
    }
  }
}

export function getPostExecRulesExecutor(
  requestContext: GraphQLRequestContext,
  rules: ICompiledRules
): PostExecRuleExecutor {
  return function (resultInfo: ResultInfo, typeInfo: TypeInfo) {
    return executePostExecRules(resultInfo, typeInfo, requestContext, rules);
  };
}
