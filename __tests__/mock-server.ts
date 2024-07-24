import * as GraphQLJS from 'graphql';
import {
  IExecutableSchemaDefinition,
  makeExecutableSchema
} from '@graphql-tools/schema';
import { addMocksToSchema, IMocks } from '@graphql-tools/mock';
import { ExecutionRequest } from '@graphql-tools/utils';
import { wrapSchema } from '@graphql-tools/wrap';
import { envelop, useSchema, useEngine } from '@envelop/core';
import { ApolloServer } from '@apollo/server';
import { GraphQLSchema } from 'graphql';

import { authZEnvelopPlugin } from '@graphql-authz/envelop-plugin';
import {
  authZDirective,
  authZGraphQLDirective
} from '@graphql-authz/directive';
import {
  RulesObject,
  AuthSchema,
  directiveTypeDefs,
  IAuthZConfig
} from '@graphql-authz/core';

import { authZApolloPlugin } from './apollo-server-plugin';

const { authZDirectiveTransformer } = authZDirective();

export interface IMockServerParams {
  rules: RulesObject;
  rawSchema: string;
  rawSchemaWithoutDirectives: string;
  declarationMode: 'directive' | 'authSchema';
  integrationMode: 'apollo-plugin' | 'envelop-plugin';
  authSchema: AuthSchema;
  resolvers?: IExecutableSchemaDefinition<unknown>['resolvers'];
  mocks?: IMocks;
}

function mockServerWithApolloPlugin(
  {
    declarationMode,
    rules,
    authSchema,
    rawSchemaWithoutDirectives,
    resolvers,
    mocks
  }: IMockServerParams,
  fullRawSchema: string
) {
  if (declarationMode === 'directive') {
    const plugin = authZApolloPlugin({ rules });
    const schema = makeExecutableSchema({
      typeDefs: fullRawSchema,
      resolvers
    });

    const transformedSchema = authZDirectiveTransformer(schema);

    return new ApolloServer({
      schema: addMocksToSchema({ schema: transformedSchema, mocks }),
      includeStacktraceInErrorResponses: true,
      plugins: [plugin]
    });
  } else {
    const plugin = authZApolloPlugin({ rules, authSchema });
    const schema = makeExecutableSchema({
      typeDefs: rawSchemaWithoutDirectives,
      resolvers
    });

    return new ApolloServer({
      schema: addMocksToSchema({ schema, mocks }),
      includeStacktraceInErrorResponses: true,
      plugins: [plugin]
    });
  }
}

function mockServerWithEnvelopPlugin(
  {
    declarationMode,
    rules,
    authSchema,
    rawSchemaWithoutDirectives,
    resolvers,
    mocks
  }: IMockServerParams,
  fullRawSchema: string
) {
  const { authZDirectiveTransformer } = authZDirective();

  let schema: GraphQLSchema;
  let pluginConfig: IAuthZConfig;

  if (declarationMode === 'directive') {
    schema = authZDirectiveTransformer(
      makeExecutableSchema({
        typeDefs: fullRawSchema,
        resolvers
      })
    );
    pluginConfig = { rules };
  } else {
    schema = makeExecutableSchema({
      typeDefs: rawSchemaWithoutDirectives,
      resolvers
    });
    pluginConfig = { rules, authSchema };
  }

  const schemaWithMocks = addMocksToSchema({
    schema,
    mocks
  });

  const getEnveloped = envelop({
    plugins: [
      useEngine(GraphQLJS),
      useSchema(schemaWithMocks),
      authZEnvelopPlugin(pluginConfig)
    ]
  });

  const { schema: envelopedSchema, execute, contextFactory } = getEnveloped();

  const wrappedSchema = wrapSchema({
    schema: envelopedSchema,
    executor: async (requestContext: ExecutionRequest) =>
      execute({
        schema: envelopedSchema,
        document: requestContext.document,
        contextValue: await contextFactory(),
        variableValues: requestContext.variables,
        operationName: requestContext.operationName
      })
  });

  return new ApolloServer({
    schema: wrappedSchema,
    includeStacktraceInErrorResponses: true
  });
}

export function mockServer(params: IMockServerParams): ApolloServer {
  const directive = authZGraphQLDirective(params.rules);

  const fullRawSchema = `${directiveTypeDefs(directive)}
        ${params.rawSchema}`;

  switch (params.integrationMode) {
    case 'apollo-plugin':
      return mockServerWithApolloPlugin(params, fullRawSchema);
    case 'envelop-plugin':
      return mockServerWithEnvelopPlugin(params, fullRawSchema);
  }
}
