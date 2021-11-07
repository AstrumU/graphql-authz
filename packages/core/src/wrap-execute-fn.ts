import { execute, ExecutionArgs, ExecutionResult } from 'graphql';

import { completeConfig, IAuthZConfig } from './config';
import { getFilteredDocument, getFragmentDefinitions } from './graphql-utils';
import { cleanupResult } from './result-cleaner';
import { executePostExecRules } from './rule-executor';
import { compileRules, hasPostExecutionRules } from './rules-compiler';
import { addSelectionSetsToDocument } from './visit-selection-set';

type ExecuteFn = typeof execute;
// Parameters<...> infers only one overload
type ExecuteParameters = Parameters<ExecuteFn> | [ExecutionArgs];

function normalizeExecuteParameters(
  ...executeParameters: ExecuteParameters
): ExecutionArgs {
  if (executeParameters.length === 1) {
    return executeParameters[0];
  }

  // for graphql < 16

  const [
    schema,
    document,
    rootValue,
    contextValue,
    variableValues,
    operationName,
    fieldResolver,
    typeResolver
  ] = executeParameters as unknown as [
    ExecutionArgs['schema'],
    ExecutionArgs['document'],
    ExecutionArgs['rootValue'],
    ExecutionArgs['contextValue'],
    ExecutionArgs['variableValues'],
    ExecutionArgs['operationName'],
    ExecutionArgs['fieldResolver'],
    ExecutionArgs['typeResolver']
  ];

  return {
    schema,
    document,
    rootValue,
    contextValue,
    variableValues,
    operationName,
    fieldResolver,
    typeResolver
  };
}

export function wrapExecuteFn(
  executeFn: ExecuteFn,
  config: IAuthZConfig
): (...executeParameters: ExecuteParameters) => ReturnType<ExecuteFn> {
  const { rules, authSchema, directiveName, authSchemaKey, processError } =
    completeConfig(config);

  return async function executeWrapper(
    ...executeParameters: ExecuteParameters
  ): Promise<ExecutionResult> {
    const args = normalizeExecuteParameters(...executeParameters);
    const variables = args.variableValues || {};
    const filteredDocument = getFilteredDocument(
      args.document,
      args.operationName
    );
    const compiledRules = compileRules({
      document: filteredDocument,
      schema: args.schema,
      rules,
      variables,
      directiveName,
      authSchemaKey,
      authSchema
    });

    try {
      await Promise.all(
        compiledRules.preExecutionRules.map(rule =>
          rule.execute(args.contextValue, rule.config.fieldArgs)
        )
      );
    } catch (error) {
      processError(error);
    }

    const fullDocument = addSelectionSetsToDocument(
      filteredDocument,
      compiledRules,
      args.schema,
      variables
    );

    const executionResult = await executeFn({
      ...args,
      document: fullDocument
    });

    if (!(executionResult.data && hasPostExecutionRules(compiledRules))) {
      return executionResult;
    }

    try {
      const fragmentDefinitions = getFragmentDefinitions(filteredDocument);

      const executionPromises = executePostExecRules({
        context: args.contextValue,
        schema: args.schema,
        resultData: executionResult.data,
        document: filteredDocument,
        rules: compiledRules,
        fragmentDefinitions,
        variables
      });

      const cleanResult = cleanupResult(
        filteredDocument,
        args.schema,
        fragmentDefinitions,
        variables,
        executionResult.data
      );

      await Promise.all(executionPromises);
      return {
        ...executionResult,
        data: cleanResult
      };
    } catch (error) {
      processError(error);
    }

    throw new Error(
      'Something went wrong. processError function must throw an error'
    );
  };
}
