import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from '@graphql-tools/mock';
import { envelop, useSchema } from '@envelop/core';
import { Config, ApolloServer } from 'apollo-server';
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
  apolloServerConfig?: Config;
}

function mockServerWithApolloPlugin(
  {
    declarationMode,
    rules,
    authSchema,
    rawSchemaWithoutDirectives,
    apolloServerConfig
  }: IMockServerParams,
  fullRawSchema: string
) {
  if (declarationMode === 'directive') {
    const plugin = authZApolloPlugin({ rules });
    const schema = makeExecutableSchema({
      typeDefs: fullRawSchema
    });

    const transformedSchema = authZDirectiveTransformer(schema);

    return new ApolloServer({
      schema: transformedSchema,
      mocks: true,
      mockEntireSchema: true,
      plugins: [plugin],
      ...apolloServerConfig
    });
  } else {
    const plugin = authZApolloPlugin({ rules, authSchema });
    const schema = makeExecutableSchema({
      typeDefs: rawSchemaWithoutDirectives
    });

    return new ApolloServer({
      schema,
      mocks: true,
      mockEntireSchema: true,
      plugins: [plugin],
      ...apolloServerConfig
    });
  }
}

function mockServerWithEnvelopPlugin(
  {
    declarationMode,
    rules,
    authSchema,
    rawSchemaWithoutDirectives,
    apolloServerConfig
  }: IMockServerParams,
  fullRawSchema: string
) {
  const { authZDirectiveTransformer } = authZDirective();

  let schema: GraphQLSchema;
  let pluginConfig: IAuthZConfig;

  if (declarationMode === 'directive') {
    schema = authZDirectiveTransformer(
      makeExecutableSchema({
        typeDefs: fullRawSchema
      })
    );
    pluginConfig = { rules };
  } else {
    schema = makeExecutableSchema({
      typeDefs: rawSchemaWithoutDirectives
    });
    pluginConfig = { rules, authSchema };
  }

  const mocks =
    apolloServerConfig?.mocks && typeof apolloServerConfig.mocks !== 'boolean'
      ? apolloServerConfig.mocks
      : {};

  const schemaWithMocks = addMocksToSchema({
    schema,
    mocks
  });

  const getEnveloped = envelop({
    plugins: [useSchema(schemaWithMocks), authZEnvelopPlugin(pluginConfig)]
  });

  const { schema: envelopedSchema } = getEnveloped();

  return new ApolloServer({
    schema: envelopedSchema,
    mocks: true,
    mockEntireSchema: true,
    executor: async requestContext => {
      const { schema, execute, contextFactory } = getEnveloped();

      return execute({
        schema: schema,
        document: requestContext.document,
        contextValue: await contextFactory(),
        variableValues: requestContext.request.variables,
        operationName: requestContext.operationName
      });
    },
    ...apolloServerConfig
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
