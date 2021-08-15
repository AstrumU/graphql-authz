import { ApolloServer, Config } from 'apollo-server';
import { GraphQLSchema, printSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';

import {
  authZApolloPlugin,
  authZGraphQLDirective,
  RulesObject,
  AuthSchema,
  authZDirective
} from '../src';

export interface IMockServerParams {
  rules: RulesObject;
  rawSchema: string;
  rawSchemaWithoutDirectives: string;
  declarationMode: 'directive' | 'authSchema';
  authSchema: AuthSchema;
  apolloServerConfig?: Config;
}

const { authZDirectiveTransformer } = authZDirective();

export function mockServer({
  rules,
  rawSchema,
  rawSchemaWithoutDirectives,
  declarationMode,
  authSchema,
  apolloServerConfig = {}
}: IMockServerParams): ApolloServer {
  const directive = authZGraphQLDirective(rules);
  const directiveSchema = new GraphQLSchema({
    directives: [directive]
  });

  if (declarationMode === 'directive') {
    const plugin = authZApolloPlugin({ rules });
    const typeDefs = `${printSchema(directiveSchema)}
        ${rawSchema}`;

    const schema = makeExecutableSchema({
      typeDefs
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
