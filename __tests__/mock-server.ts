import { makeExecutableSchema } from '@graphql-tools/schema';
import { envelop, useSchema } from '@envelop/core';
import { Config } from 'apollo-server';
import { ApolloServerBase } from 'apollo-server-core';
import { GraphQLSchema } from 'graphql';

import {
  authZApolloPlugin,
  AuthZDirectiveVisitor
} from '@graphql-authz/apollo-server-plugin';
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

export class ApolloServerMock extends ApolloServerBase {
  public async willStart(): Promise<void> {
    return super.willStart();
  }
}

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

    return new ApolloServerMock({
      typeDefs: fullRawSchema,
      mocks: true,
      mockEntireSchema: true,
      schemaDirectives: { authz: AuthZDirectiveVisitor },
      plugins: [plugin],
      ...apolloServerConfig
    });
  } else {
    const plugin = authZApolloPlugin({ rules, authSchema });
    return new ApolloServerMock({
      typeDefs: rawSchemaWithoutDirectives,
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

  const getEnveloped = envelop({
    plugins: [useSchema(schema), authZEnvelopPlugin(pluginConfig)]
  });

  const { schema: envelopedSchema } = getEnveloped();

  return new ApolloServerMock({
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

export function mockServer(params: IMockServerParams): ApolloServerMock {
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
