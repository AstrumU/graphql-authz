import { SchemaDirectiveVisitor } from 'apollo-server';
import { ApolloServerPlugin } from 'apollo-server-plugin-base';
import {
  GraphQLField,
  GraphQLInterfaceType,
  GraphQLObjectType,
  parse,
  print
} from 'graphql';
import {
  executePostExecRules,
  compileRules,
  addSelectionSetsToDocument,
  cleanupResult,
  getFilteredDocument,
  getFragmentDefinitions,
  completeConfig,
  IAuthZConfig,
  IExtensionsDirective
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

      return {
        async didResolveOperation(requestContext) {
          try {
            await Promise.all(
              compiledRules.preExecutionRules.map(rule =>
                rule.execute(requestContext.context, rule.config.fieldArgs)
              )
            );
          } catch (error) {
            processError(error);
          }
        },
        async willSendResponse(requestContext) {
          try {
            if (requestContext.response.data) {
              const fragmentDefinitions =
                getFragmentDefinitions(filteredDocument);

              const executionPromises = executePostExecRules({
                context: requestContext.context,
                schema: requestContext.schema,
                resultData: requestContext.response?.data,
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

export class AuthZDirectiveVisitor extends SchemaDirectiveVisitor {
  private addAuthZExtensionsDirective(
    schemaItem:
      | GraphQLField<unknown, unknown>
      | GraphQLObjectType
      | GraphQLInterfaceType,
    authZExtensionsDirective: IExtensionsDirective
  ): void {
    schemaItem.extensions = {
      ...schemaItem.extensions,
      authz: {
        ...schemaItem.extensions?.authz,
        directives: [
          ...(schemaItem.extensions?.authz?.directives || []),
          authZExtensionsDirective
        ]
      }
    };
  }

  public visitFieldDefinition(field: GraphQLField<unknown, unknown>): void {
    this.addAuthZExtensionsDirective(field, {
      name: this.name,
      arguments: this.args
    });
  }

  public visitObject(object: GraphQLObjectType): void {
    this.addAuthZExtensionsDirective(object, {
      name: this.name,
      arguments: this.args
    });
  }

  public visitInterface(iface: GraphQLInterfaceType): void {
    this.addAuthZExtensionsDirective(iface, {
      name: this.name,
      arguments: this.args
    });
  }
}
