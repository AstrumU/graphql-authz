import { Config } from 'apollo-server';
import { ApolloServerBase } from 'apollo-server-core';
import { GraphQLSchema, printSchema } from 'graphql';

import {
  authZApolloPlugin,
  AuthZDirectiveVisitor,
  authZGraphQLDirective,
  RulesObject,
  AuthSchema
} from '../src';

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
  authSchema: AuthSchema;
  apolloServerConfig?: Config;
}

export function mockServer({
  rules,
  rawSchema,
  rawSchemaWithoutDirectives,
  declarationMode,
  authSchema,
  apolloServerConfig = {}
}: IMockServerParams): ApolloServerMock {
  const directive = authZGraphQLDirective(rules);
  const directiveSchema = new GraphQLSchema({
    directives: [directive]
  });

  if (declarationMode === 'directive') {
    const plugin = authZApolloPlugin({ rules });
    const typeDefs = `${printSchema(directiveSchema)}
        ${rawSchema}`;

    return new ApolloServerMock({
      typeDefs,
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
