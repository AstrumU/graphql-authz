import { ApolloServerPlugin } from '@apollo/server';
import { GraphQLError, parse, print } from 'graphql';
import {
  executePostExecRules,
  compileRules,
  addSelectionSetsToDocument,
  cleanupResult,
  getFilteredDocument,
  getFragmentDefinitions,
  completeConfig,
  IAuthZConfig,
  hasPostExecutionRules
} from '@graphql-authz/core';

export function authZApolloPlugin(config: IAuthZConfig): ApolloServerPlugin {
  const { rules, authSchema, directiveName, authSchemaKey, processError } =
    completeConfig(config);
  return {
    requestDidStart(requestContext) {
      const { operationName, query } = requestContext.request;
      if (!query) {
        throw new Error('Expected requestContext to have request.query');
      }
      const { variables = {} } = requestContext.request;
      const filteredDocument = getFilteredDocument(parse(query), operationName);
      const compiledRules = compileRules({
        document: filteredDocument,
        schema: requestContext.schema,
        rules,
        variables,
        directiveName,
        authSchemaKey,
        authSchema
      });

      const fullDocument = addSelectionSetsToDocument(
        filteredDocument,
        compiledRules,
        requestContext.schema,
        variables
      );
      requestContext.request.query = print(fullDocument);

      return Promise.resolve({
        async didResolveOperation(requestContext) {
          try {
            await Promise.all(
              compiledRules.preExecutionRules.map(rule =>
                rule.execute(requestContext.contextValue, rule.config.fieldArgs)
              )
            );
          } catch (error) {
            processError(error);
          }
        },
        async willSendResponse(requestContext) {
          try {
            const { body: responseBody } = requestContext.response;
            if (
              'singleResult' in responseBody &&
              responseBody.singleResult.data &&
              hasPostExecutionRules(compiledRules)
            ) {
              const fragmentDefinitions =
                getFragmentDefinitions(filteredDocument);

              const executionPromises = executePostExecRules({
                context: requestContext.contextValue,
                schema: requestContext.schema,
                resultData: responseBody.singleResult.data,
                document: filteredDocument,
                rules: compiledRules,
                fragmentDefinitions,
                variables
              });

              const cleanResult = cleanupResult(
                filteredDocument,
                requestContext.schema,
                fragmentDefinitions,
                variables,
                responseBody.singleResult.data
              );
              responseBody.singleResult.data = cleanResult;

              await Promise.all(executionPromises);
            }
          } catch (error) {
            try {
              processError(error);
            } catch (e) {
              const formattedError =
                e instanceof GraphQLError ? e : new GraphQLError(String(e));

              requestContext.response.body = {
                kind: 'single',
                singleResult: {
                  errors: [formattedError]
                }
              };
            }
          }
        }
      });
    }
  };
}
