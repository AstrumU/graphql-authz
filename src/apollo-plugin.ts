import _ from 'lodash';
import {
  ApolloServerPlugin,
  GraphQLRequestContext
} from 'apollo-server-plugin-base';
import { ForbiddenError } from 'apollo-server-errors';
import {
  TypeInfo,
  visitWithTypeInfo,
  visit,
  print,
  FragmentDefinitionNode,
  DocumentNode,
  GraphQLSchema,
  FieldNode
} from 'graphql';

import { ResultInfo } from './result-info';
import { getPostExecRulesExecutor } from './rule-executor';
import { RulesObject, UnauthorizedError } from './rules';
import { compileRules, ICompiledRules } from './rules-compiler';
import { getVisitor } from './visit-selection-set';
import { visitWithResultInfo } from './visit-with-result-info';
import {
  getFilteredAst,
  getFragmentDefinitions,
  isLeafTypeDeep,
  shouldIncludeNode
} from './graphql-utils';

function addSelectionSetsToQuery(
  ast: DocumentNode,
  rules: ICompiledRules,
  schema: GraphQLSchema,
  variables: Record<string, unknown>
) {
  const typeInfo = new TypeInfo(schema);
  const typeInfoVisitor = visitWithTypeInfo(typeInfo, {
    SelectionSet: getVisitor(typeInfo, rules),
    Field(node: FieldNode) {
      if (!shouldIncludeNode({ variableValues: variables }, node)) {
        return false;
      }
      return undefined;
    }
  });

  const visited = visit(ast, typeInfoVisitor);
  return print(visited);
}

function executePostExecRules(
  requestContext: GraphQLRequestContext,
  ast: DocumentNode,
  rules: ICompiledRules,
  fragmentDefinitions: FragmentDefinitionNode[],
  variables: Record<string, unknown>
) {
  if (!requestContext.response?.data) {
    return [];
  }
  const typeInfo = new TypeInfo(requestContext.schema);
  const resultInfo = new ResultInfo(requestContext.response.data);
  const typeInfoVisitor = visitWithTypeInfo(
    typeInfo,
    visitWithResultInfo(
      resultInfo,
      typeInfo,
      fragmentDefinitions,
      variables,
      getPostExecRulesExecutor(requestContext, rules)
    )
  );
  visit(ast, typeInfoVisitor);
  return rules.postExecutionRules.executionPromises;
}

function cleanupResult(
  ast: DocumentNode,
  schema: GraphQLSchema,
  fragmentDefinitions: FragmentDefinitionNode[],
  variables: Record<string, unknown>,
  data: unknown
) {
  const result = {};

  const typeInfo = new TypeInfo(schema);
  const resultInfo = new ResultInfo(data);
  const visitor = visitWithTypeInfo(
    typeInfo,
    visitWithResultInfo(
      resultInfo,
      typeInfo,
      fragmentDefinitions,
      variables,
      (resultInfo: ResultInfo, typeInfo: TypeInfo) => {
        const type = typeInfo.getType();
        const value = resultInfo.getValue();
        if (
          value === null ||
          _.isEmpty(value) ||
          (type && isLeafTypeDeep(type))
        ) {
          _.set(result, resultInfo.getPathFromRoot(), value);
        }
      }
    )
  );

  visit(ast, visitor);

  return result;
}

function processError(error: Error) {
  if (error instanceof UnauthorizedError) {
    throw new ForbiddenError(error.message);
  }
  throw new Error('Internal Server Error');
}

export function authZApolloPlugin(
  rules: RulesObject,
  directiveName = 'authz'
): ApolloServerPlugin {
  return {
    requestDidStart(requestContext) {
      const { operationName, query } = requestContext.request;
      if (!query) {
        throw new Error('Expected requestContext to have request.query');
      }
      const { variables = {} } = requestContext.request;
      const filteredAst = getFilteredAst(query, operationName);
      const compiledRules = compileRules(
        filteredAst,
        requestContext.schema,
        rules,
        variables,
        directiveName
      );

      const fullQuery = addSelectionSetsToQuery(
        filteredAst,
        compiledRules,
        requestContext.schema,
        variables
      );
      requestContext.request.query = fullQuery;

      return {
        async didResolveOperation(requestContext) {
          try {
            await Promise.all(
              compiledRules.preExecutionRules.map(rule =>
                rule.execute(requestContext, rule.config.fieldArgs)
              )
            );
          } catch (error) {
            processError(error);
          }
        },
        async willSendResponse(requestContext) {
          try {
            if (requestContext.response.data) {
              const fragmentDefinitions = getFragmentDefinitions(filteredAst);

              const executionPromises = executePostExecRules(
                requestContext,
                filteredAst,
                compiledRules,
                fragmentDefinitions,
                variables
              );

              const cleanResult = cleanupResult(
                filteredAst,
                requestContext.schema,
                fragmentDefinitions,
                variables,
                requestContext.response.data
              );
              requestContext.response.data = cleanResult;

              await Promise.all(executionPromises);
            }
          } catch (error) {
            // TODO: unify errors thrown from different hooks
            // in apollo-server-core errors thrown form `didResolveOperation` are caught and processed
            // https://github.com/apollographql/apollo-server/blob/019e975e669aa42f28727bf2da99d048cd727c0a/packages/apollo-server-core/src/requestPipeline.ts#L370
            // but errors thrown from `willSendResponse` hook aren't caught and processed
            // https://github.com/apollographql/apollo-server/blob/019e975e669aa42f28727bf2da99d048cd727c0a/packages/apollo-server-core/src/requestPipeline.ts#L570
            processError(error);
          }
        }
      };
    }
  };
}
